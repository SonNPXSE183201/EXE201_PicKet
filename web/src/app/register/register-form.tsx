"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { normalizePhoneNumber } from "@picket/domain";

import { createClient } from "@/core/supabase/client";
import { GoogleIdButton } from "@/features/auth/components/google-id-button";
import { useTurnstileGate } from "@/core/security/turnstile-widget";
import { passwordValidationMessage } from "@/core/auth/password";
import { FieldGroup, FieldRow, PasswordRow } from "@/features/auth/components/paper-fields";

const symbols = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";
const rules = [
  { text: "Ít nhất 12 ký tự", ok: (p: string) => p.length >= 12 },
  { text: "Có chữ hoa và chữ thường", ok: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { text: "Có ít nhất một số", ok: (p: string) => /\d/.test(p) },
  { text: "Có ký tự đặc biệt (!@#…)", ok: (p: string) => Array.from(p).some((c) => symbols.includes(c)) },
];

/* Figma › User Web › W1 Đăng ký bằng email, plus the phone option the backend
   supports (same flow as mobile: the code goes to email, the phone is attached
   after verification). */
export function RegisterForm({ phoneEnabled = true, siteKey, googleClientId }: { phoneEnabled?: boolean; siteKey?: string; googleClientId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const gate = useTurnstileGate(siteKey);
  const [busy, setBusy] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const value = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    let phone: string | undefined;
    if (mode === "phone") {
      try {
        phone = normalizePhoneNumber(String(form.get("phone") ?? ""));
      } catch {
        return setMessage("Số điện thoại không hợp lệ.");
      }
    }
    const passwordIssue = passwordValidationMessage(value);
    if (passwordIssue) return setMessage(passwordIssue);
    if (value !== confirmation) return setMessage("Hai mật khẩu chưa khớp.");

    setBusy(true);
    setMessage(null);
    const blocked = await gate.check();
    if (blocked) {
      setMessage(blocked);
      setBusy(false);
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: value,
        options: { emailRedirectTo: redirectTo, ...(phone ? { data: { pending_phone: phone } } : {}) },
      });
      if (error) {
        setMessage("Không thể tạo tài khoản. Email có thể đã được sử dụng hoặc bạn thao tác quá nhanh.");
        setBusy(false);
        return;
      }
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
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
        setMessage("Không mở được đăng ký Google. Vui lòng thử lại.");
        setBusy(false);
      }
    } catch {
      setMessage("Không mở được đăng ký Google. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card auth-card-register">
      <header className="pa-head">
        <p className="pa-eyebrow">Tạo tài khoản Picket</p>
        <h1 className="pa-title">Tạo tài khoản</h1>
        <p className="pa-copy">
          {mode === "phone" ? "Đăng ký bằng số điện thoại. Mã xác minh sẽ được gửi tới email của bạn." : "Bắt đầu ghi chép và chăm chút kế hoạch tài chính cùng Picket."}
        </p>
      </header>

      {phoneEnabled && (
        <div className="pa-tabs" role="group" aria-label="Cách đăng ký">
          <button type="button" aria-pressed={mode === "email"} onClick={() => setMode("email")}>Email</button>
          <button type="button" aria-pressed={mode === "phone"} onClick={() => setMode("phone")}>Số điện thoại</button>
        </div>
      )}

      <form className="pa-form-wrap" onSubmit={submit} aria-busy={busy} aria-describedby={message ? "register-message" : undefined}>
        <FieldGroup>
          {mode === "phone" && <FieldRow icon="message" label="Số điện thoại" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="09xx xxx xxx" />}
          <FieldRow icon="mail" label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="ban@example.com" />
          <PasswordRow autoComplete="new-password" onValue={setPassword} />
          <PasswordRow label="Nhập lại mật khẩu" name="confirmation" autoComplete="new-password" />
        </FieldGroup>
        <ul className="pa-rules" aria-label="Yêu cầu mật khẩu">
          {rules.map((r) => <li key={r.text} className={r.ok(password) ? "is-ok" : undefined}>{r.text}</li>)}
        </ul>
        {message && <p className="pa-message" id="register-message" role="alert">{message}</p>}
        {gate.widget}
        <button className="pa-btn" disabled={busy} type="submit">{busy ? "Đang tạo..." : "Tạo tài khoản"}</button>
      </form>

      <div className="pa-divider">hoặc</div>
      {googleClientId && !googleUnavailable ? (
        <GoogleIdButton googleClientId={googleClientId} disabled={busy}
          onSuccess={() => { router.replace("/dashboard"); router.refresh(); }}
          onError={() => {
            setMessage("Không mở được đăng ký Google. Vui lòng thử lại.");
            setGoogleUnavailable(true);
          }}
          onUnavailable={() => setGoogleUnavailable(true)} />
      ) : <button className="pa-btn is-secondary" disabled={busy} onClick={signUpWithGoogle} type="button">Đăng ký nhanh bằng Google</button>}
      <p className="pa-meta">Tìm hiểu cách Picket xử lý dữ liệu trong <a href="https://picketfinance.com/privacy.html">Chính sách quyền riêng tư</a>.</p>
      <p className="pa-meta">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>
    </div>
  );
}
