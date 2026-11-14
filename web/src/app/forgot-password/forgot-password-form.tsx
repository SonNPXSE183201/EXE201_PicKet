"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ConfirmationResult, User } from "firebase/auth";
import { PicketApiClient } from "@picket/api-client";
import { normalizePhoneNumber } from "@picket/domain";

import type { FirebaseWebConfig } from "@/core/firebase/config";
import { createClient } from "@/core/supabase/client";
import { useTurnstileGate } from "@/core/security/turnstile-widget";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import { CreatePasswordForm } from "@/features/auth/components/create-password-form";
import { StackedField } from "@/features/auth/components/paper-fields";
import { VerifyCodeForm } from "@/features/auth/components/verify-code-form";
import { confirmPhoneCode, discardFirebaseUser, sendPhoneCode } from "@/features/auth/firebase-phone";
import { firebasePhoneErrorMessage, phoneResetErrorMessage, phoneResetRestartsFromPhone, phoneResetStartErrorMessage } from "@/features/auth/phone-signup-errors";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const RESEND_SECONDS = 45;
type Mode = "email" | "phone";
type PhoneStep = "details" | "code" | "password" | "done";
type Notice = { text: string; info?: boolean } | null;

/* Figma › Web › 28 Quên mật khẩu. Email sends a reset link (Supabase). When SMS is enabled and
   Firebase is configured, the phone path verifies a Firebase SMS code and sets the new password
   through the Picket API (POST /v1/auth/phone-signup reset-start → reset). */
export function ForgotPasswordForm({ siteKey, firebase }: { siteKey?: string; firebase?: FirebaseWebConfig }) {
  const supabase = useMemo(() => createClient(), []);
  const api = useMemo(() => new PicketApiClient(apiBaseUrl), []);
  const gate = useTurnstileGate(siteKey);
  const smsReady = !!firebase;
  const [mode, setMode] = useState<Mode>("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [step, setStep] = useState<PhoneStep>("details");
  const [phone, setPhone] = useState("");
  const [phoneMessage, setPhoneMessage] = useState<Notice>(null);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const proof = useRef<{ idToken: string; user: User } | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!smsCooldown) return;
    const timer = window.setTimeout(() => setSmsCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [smsCooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    setBusy(true);
    setMessage(null);
    const blocked = await gate.check();
    if (blocked) {
      setMessage(blocked);
      setBusy(false);
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    setSent(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      setMessage(error
        ? "Chưa gửi được email. Hãy chờ rồi thử lại."
        : "Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn khôi phục. Hãy kiểm tra cả thư mục spam.");
      setSent(!error);
      if (!error) setCooldown(60);
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  function choose(next: Mode) {
    if (next === mode || busy) return;
    setMode(next);
    setMessage(null);
    setPhoneMessage(null);
  }

  /** Picket checks the number and daily limits first, then Firebase sends the SMS. */
  async function sendSms(target: string): Promise<boolean> {
    try {
      await api.phoneResetStart(target);
    } catch (error) {
      setPhoneMessage({ text: phoneResetStartErrorMessage(error) });
      return false;
    }
    try {
      confirmation.current = await sendPhoneCode(firebase!, target, recaptchaRef.current!);
      setSmsCooldown(RESEND_SECONDS);
      return true;
    } catch (error) {
      setPhoneMessage({ text: firebasePhoneErrorMessage(error) });
      return false;
    }
  }

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let target: string;
    try {
      target = normalizePhoneNumber(String(new FormData(event.currentTarget).get("phone") ?? ""));
    } catch {
      setPhoneMessage({ text: "Số điện thoại không hợp lệ." });
      return;
    }
    setBusy(true);
    setPhoneMessage(null);
    const blocked = await gate.check();
    if (blocked) setPhoneMessage({ text: blocked });
    else if (await sendSms(target)) {
      setPhone(target);
      setStep("code");
    }
    setBusy(false);
  }

  async function verifyCode(code: string) {
    if (!/^\d{6}$/.test(code)) return setPhoneMessage({ text: "Nhập đủ 6 chữ số trong tin nhắn." });
    if (!confirmation.current) return setPhoneMessage({ text: "Phiên xác minh đã hết hạn. Hãy gửi lại mã." });
    setBusy(true);
    setPhoneMessage(null);
    try {
      proof.current = await confirmPhoneCode(confirmation.current, code);
      setStep("password");
    } catch (error) {
      setPhoneMessage({ text: firebasePhoneErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function resendSms() {
    if (busy || smsCooldown) return;
    setBusy(true);
    setPhoneMessage(null);
    const blocked = await gate.check();
    if (blocked) setPhoneMessage({ text: blocked });
    else if (await sendSms(phone)) setPhoneMessage({ text: "Đã gửi mã mới qua SMS.", info: true });
    setBusy(false);
  }

  /** Back to the phone step; the temporary Firebase user (if any) is discarded. */
  function restartPhone(text: string | null = null) {
    if (proof.current) void discardFirebaseUser(firebase!, proof.current.user);
    confirmation.current = null;
    proof.current = null;
    setSmsCooldown(0);
    setStep("details");
    setPhoneMessage(text ? { text } : null);
  }

  async function resetPassword(password: string) {
    if (!proof.current) {
      setStep("code");
      return setPhoneMessage({ text: "Phiên xác minh đã hết hạn. Hãy gửi lại mã." });
    }
    setBusy(true);
    setPhoneMessage(null);
    try {
      await api.phoneReset(phone, proof.current.idToken, password);
      // The Firebase user only proved the phone: sign it out and delete it, like sign-up does.
      await discardFirebaseUser(firebase!, proof.current.user);
      proof.current = null;
      confirmation.current = null;
      setStep("done");
    } catch (error) {
      const text = phoneResetErrorMessage(error);
      if (phoneResetRestartsFromPhone(error)) restartPhone(text);
      else {
        if ((error as { status?: unknown })?.status === 401) setStep("code");
        setPhoneMessage({ text });
      }
    } finally {
      setBusy(false);
    }
  }

  // One stable container for Firebase's invisible reCAPTCHA across all steps.
  return <>{content()}{smsReady && <div ref={recaptchaRef} className="pa-recaptcha" />}</>;

  function content() {
    if (mode === "phone" && step === "code") {
      return <VerifyCodeForm channel="phone" destination={phone} busy={busy} message={phoneMessage} cooldown={smsCooldown}
        onVerify={verifyCode} onResend={resendSms} change={() => restartPhone()} extra={gate.widget} />;
    }
    if (mode === "phone" && step === "password") {
      return <CreatePasswordForm busy={busy} message={phoneMessage?.text ?? null} onSubmit={resetPassword}
        eyebrow="Khôi phục tài khoản" title="Đặt mật khẩu mới" copy="Mật khẩu mới sẽ thay cho mật khẩu cũ." submitLabel="Đặt lại mật khẩu"
        footer={<button className="pa-link" type="button" onClick={() => restartPhone()} disabled={busy}><span aria-hidden="true">←</span>Đổi số điện thoại</button>} />;
    }
    if (mode === "phone" && step === "done") {
      return (
        <div className="pa-panel">
          <header className="pa-head">
            <p className="pa-eyebrow">Khôi phục tài khoản</p>
            <h1 className="pa-title">Đã đặt lại mật khẩu</h1>
          </header>
          <div className="pa-form-wrap">
            <p className="pa-message is-info" role="status">Đã đặt lại mật khẩu. Hãy đăng nhập bằng số điện thoại và mật khẩu mới.</p>
            <Link className="pa-btn" href="/login">Đăng nhập</Link>
          </div>
        </div>
      );
    }

    const phoneMode = mode === "phone";
    const shown: Notice = phoneMode ? phoneMessage : message ? { text: message, info: sent } : null;
    return (
      <div className="pa-panel">
        <header className="pa-head">
          <p className="pa-eyebrow">Hỗ trợ đăng nhập</p>
          <h1 className="pa-title">Quên mật khẩu?</h1>
          <p className="pa-copy">{phoneMode ? "Nhập số điện thoại để nhận mã 6 số qua SMS." : "Nhập email để nhận hướng dẫn đặt lại."}</p>
        </header>
        {smsReady && (
          <div className="pa-chips" role="group" aria-label="Cách khôi phục">
            <button type="button" aria-pressed={!phoneMode} onClick={() => choose("email")}>Email</button>
            <button type="button" aria-pressed={phoneMode} onClick={() => choose("phone")}>Số điện thoại</button>
          </div>
        )}
        <form className="pa-form-wrap" onSubmit={phoneMode ? submitPhone : submit} aria-busy={busy} aria-describedby={shown ? "recovery-message" : undefined}>
          <div className="pa-card">
            {phoneMode
              ? <StackedField key="phone" icon="message" label="Số điện thoại" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="Số điện thoại đã đăng ký" />
              : <StackedField key="email" icon="mail" label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="Email đã đăng ký" />}
          </div>
          {shown && (
            <p className={`pa-message${shown.info ? " is-info" : ""}`} id="recovery-message" role={shown.info ? "status" : "alert"}>{shown.text}</p>
          )}
          {gate.widget}
          {phoneMode ? (
            <button className="pa-btn" disabled={busy} type="submit">
              <AdminIcon name="message" size={20} />
              {busy ? "Đang gửi mã..." : "Gửi mã xác minh"}
            </button>
          ) : (
            <button className="pa-btn" disabled={busy || cooldown > 0} type="submit">
              <AdminIcon name="mail" size={20} />
              {busy ? "Đang gửi..." : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : sent ? "Gửi lại hướng dẫn" : "Gửi hướng dẫn"}
            </button>
          )}
          <Link className="pa-link" href="/login"><span aria-hidden="true">←</span>Quay lại đăng nhập</Link>
        </form>
        <p className="pa-note">Dữ liệu xác minh chỉ dùng để bảo vệ tài khoản.</p>
      </div>
    );
  }
}
