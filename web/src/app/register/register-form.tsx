"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ConfirmationResult, User } from "firebase/auth";
import { PicketApiClient } from "@picket/api-client";
import { normalizePhoneNumber } from "@picket/domain";

import type { FirebaseWebConfig } from "@/core/firebase/config";
import { createClient } from "@/core/supabase/client";
import { useTurnstileGate } from "@/core/security/turnstile-widget";
import { GoogleIdButton } from "@/features/auth/components/google-id-button";
import { GoogleMark, StackedField } from "@/features/auth/components/paper-fields";
import { VerifyCodeForm } from "@/features/auth/components/verify-code-form";
import { CreatePasswordForm } from "@/features/auth/components/create-password-form";
import { confirmPhoneCode, discardFirebaseUser, sendPhoneCode } from "@/features/auth/firebase-phone";
import { emailSignupStartBlockMessage } from "@/features/auth/email-signup-errors";
import { firebasePhoneErrorMessage, isPhoneCodeRestartError, phoneSignupCompleteErrorMessage, phoneSignupStartErrorMessage } from "@/features/auth/phone-signup-errors";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const RESEND_SECONDS = 45;
type Mode = "email" | "phone";
type PhoneStep = "details" | "code" | "password";

/* Figma › Web › 27 (email) and 45 (phone), adapted to OTP-first sign-up:
   1) email or phone → 6-digit code, 2) verify, 3) create password.
   Email codes come from Supabase (/verify-email); SMS codes from Firebase Phone Auth. */
export function RegisterForm({ emailEnabled = true, smsEnabled = false, firebase, initialMode = "email", siteKey, googleClientId }: {
  emailEnabled?: boolean;
  /** SMS chosen by admins AND Firebase web config present. */
  smsEnabled?: boolean;
  firebase?: FirebaseWebConfig;
  initialMode?: Mode;
  siteKey?: string;
  googleClientId?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const api = useMemo(() => new PicketApiClient(apiBaseUrl), []);
  const gate = useTurnstileGate(siteKey);
  const smsReady = smsEnabled && !!firebase;
  const [mode, setMode] = useState<Mode>(() => (initialMode === "phone" && smsReady) || !emailEnabled ? "phone" : "email");
  const [busy, setBusy] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [message, setMessage] = useState<{ text: string; info?: boolean } | null>(null);
  const [step, setStep] = useState<PhoneStep>("details");
  const [phone, setPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const proof = useRef<{ idToken: string; user: User } | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function choose(next: Mode) {
    if (next === mode || busy) return;
    setMode(next);
    setMessage(null);
    router.replace(next === "phone" ? "/register?channel=phone" : "/register", { scroll: false });
  }

  async function passGate(): Promise<boolean> {
    const blocked = await gate.check();
    if (blocked) setMessage({ text: blocked });
    return !blocked;
  }

  async function submitEmail(email: string) {
    if (!(await passGate())) return setBusy(false);
    try {
      // An address that already has an account must sign in instead of getting a code here.
      await api.emailSignupStart(email);
    } catch (error) {
      const blocked = emailSignupStartBlockMessage(error);
      if (blocked) {
        setMessage({ text: blocked });
        return setBusy(false);
      }
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/create-password`,
          data: { password_setup_required: true },
        },
      });
      if (error) {
        setMessage({ text: error.status === 429 ? "Bạn gửi mã quá nhanh. Vui lòng chờ một lát rồi thử lại." : "Chưa gửi được mã xác minh. Vui lòng thử lại." });
        return setBusy(false);
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setMessage({ text: "Không thể kết nối. Kiểm tra mạng rồi thử lại." });
      setBusy(false);
    }
  }

  /** PicKet checks the number and daily limits first, then Firebase sends the SMS. */
  async function sendSms(target: string): Promise<boolean> {
    try {
      await api.phoneSignupStart(target);
    } catch (error) {
      setMessage({ text: phoneSignupStartErrorMessage(error) });
      return false;
    }
    try {
      confirmation.current = await sendPhoneCode(firebase!, target, recaptchaRef.current!);
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (error) {
      setMessage({ text: firebasePhoneErrorMessage(error) });
      return false;
    }
  }

  async function submitPhone(rawPhone: string) {
    let target: string;
    try {
      target = normalizePhoneNumber(rawPhone);
    } catch {
      setMessage({ text: "Số điện thoại không hợp lệ." });
      return setBusy(false);
    }
    if (!(await passGate())) return setBusy(false);
    if (await sendSms(target)) {
      setPhone(target);
      setStep("code");
    }
    setBusy(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    if (mode === "email") await submitEmail(String(form.get("email") ?? "").trim().toLowerCase());
    else await submitPhone(String(form.get("phone") ?? ""));
  }

  async function verifyCode(code: string) {
    if (!/^\d{6}$/.test(code)) return setMessage({ text: "Nhập đủ 6 chữ số trong tin nhắn." });
    if (!confirmation.current) return setMessage({ text: "Phiên xác minh đã hết hạn. Hãy gửi lại mã." });
    setBusy(true);
    setMessage(null);
    try {
      proof.current = await confirmPhoneCode(confirmation.current, code);
      setStep("password");
    } catch (error) {
      setMessage({ text: firebasePhoneErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function resendSms() {
    if (busy || cooldown) return;
    setBusy(true);
    setMessage(null);
    if (await passGate()) {
      if (await sendSms(phone)) setMessage({ text: "Đã gửi mã mới qua SMS.", info: true });
    }
    setBusy(false);
  }

  async function finishPhone(password: string) {
    if (!proof.current) {
      setStep("code");
      return setMessage({ text: "Phiên xác minh đã hết hạn. Hãy gửi lại mã." });
    }
    setBusy(true);
    setMessage(null);
    try {
      const tokens = await api.phoneSignupComplete(phone, proof.current.idToken, password);
      const { error } = await supabase.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
      if (error) throw error;
      await discardFirebaseUser(firebase!, proof.current.user);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const status = (error as { status?: unknown })?.status;
      setMessage({ text: phoneSignupCompleteErrorMessage(error) });
      setBusy(false);
      if (isPhoneCodeRestartError(error)) {
        // The server-side `start` expired or was used: begin again from the phone step.
        if (proof.current) void discardFirebaseUser(firebase!, proof.current.user);
        confirmation.current = null;
        proof.current = null;
        setCooldown(0);
        setStep("details");
      } else if (status === 401) setStep("code");
    }
  }

  function changePhone() {
    confirmation.current = null;
    proof.current = null;
    setStep("details");
    setMessage(null);
    setCooldown(0);
  }

  async function signUpWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`, queryParams: { prompt: "select_account" } },
      });
      if (error) {
        setMessage({ text: "Không mở được đăng ký Google. Vui lòng thử lại." });
        setBusy(false);
      }
    } catch {
      setMessage({ text: "Không mở được đăng ký Google. Kiểm tra mạng rồi thử lại." });
      setBusy(false);
    }
  }

  // One stable container for Firebase's invisible reCAPTCHA across all steps.
  return <>{content()}<div ref={recaptchaRef} className="pa-recaptcha" /></>;

  function content() {
  if (mode === "phone" && step === "code") {
    return <VerifyCodeForm channel="phone" destination={phone} busy={busy} message={message} cooldown={cooldown}
      onVerify={verifyCode} onResend={resendSms} change={changePhone} extra={gate.widget} />;
  }
  if (mode === "phone" && step === "password") {
    return <CreatePasswordForm busy={busy} message={message?.text ?? null} onSubmit={finishPhone} />;
  }

  if (!emailEnabled && !smsReady) {
    return (
      <div className="pa-panel">
        <header className="pa-head">
          <p className="pa-eyebrow">Tạo tài khoản PicKet</p>
          <h1 className="pa-title">Đăng ký đang tạm dừng</h1>
          <p className="pa-copy">PicKet đang bảo trì kênh xác minh. Vui lòng thử lại sau ít phút.</p>
        </header>
        <p className="pa-meta">Đã có tài khoản?<Link href="/login">Đăng nhập</Link></p>
      </div>
    );
  }

  const phoneMode = mode === "phone";
  return (
    <div className="pa-panel">
      <header className="pa-head">
        <p className="pa-eyebrow">Tạo tài khoản PicKet</p>
        <h1 className="pa-title">{phoneMode ? "Đăng ký bằng số điện thoại" : "Tạo tài khoản"}</h1>
        <p className="pa-copy">{phoneMode ? "Mã 6 số sẽ được gửi qua SMS." : "Mã 6 số sẽ được gửi đến email của bạn."}</p>
      </header>

      {emailEnabled && smsReady && (
        <div className="pa-chips" role="group" aria-label="Cách đăng ký">
          <button type="button" aria-pressed={!phoneMode} onClick={() => choose("email")}>Email</button>
          <button type="button" aria-pressed={phoneMode} onClick={() => choose("phone")}>Số điện thoại</button>
        </div>
      )}

      <form className="pa-form-wrap" onSubmit={submit} aria-busy={busy} aria-describedby={message ? "register-message" : undefined}>
        <div className="pa-card">
          {phoneMode
            ? <StackedField key="phone" icon="message" label="Số điện thoại" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="09xx xxx xxx" />
            : <StackedField key="email" icon="mail" label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="Địa chỉ email của bạn" />}
        </div>
        {message && <p className={`pa-message${message.info ? " is-info" : ""}`} id="register-message" role={message.info ? "status" : "alert"}>{message.text}</p>}
        {gate.widget}
        <button className="pa-btn" disabled={busy} type="submit">{busy ? "Đang gửi mã..." : phoneMode ? "Gửi mã xác minh" : "Tiếp tục"}</button>
      </form>

      {!phoneMode && <>
        <div className="pa-divider is-plain">hoặc</div>
        {googleClientId && !googleUnavailable ? (
          <GoogleIdButton googleClientId={googleClientId} disabled={busy}
            onSuccess={() => { router.replace("/dashboard"); router.refresh(); }}
            onError={() => {
              setMessage({ text: "Không mở được đăng ký Google. Vui lòng thử lại." });
              setGoogleUnavailable(true);
            }}
            onUnavailable={() => setGoogleUnavailable(true)} />
        ) : <button className="pa-btn pa-google" disabled={busy} onClick={signUpWithGoogle} type="button"><GoogleMark />Đăng ký nhanh bằng Google</button>}
      </>}
      <p className="pa-meta is-small">Tiếp tục nghĩa là bạn đồng ý với <a href="https://picketfinance.com/terms.html">Điều khoản</a> và <a href="https://picketfinance.com/privacy.html">Chính sách quyền riêng tư</a>.</p>
      <p className="pa-meta">Đã có tài khoản?<Link href="/login">Đăng nhập</Link></p>
    </div>
  );
}
}
