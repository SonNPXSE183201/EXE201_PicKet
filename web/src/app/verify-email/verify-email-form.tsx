"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("token") ?? "").trim();
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) {
      setMessage("Mã xác nhận không đúng hoặc đã hết hạn.");
      setBusy(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setMessage(error ? "Chưa gửi lại được mã. Hãy chờ rồi thử lại." : "Đã gửi lại mã xác nhận.");
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span>Picket</span></Link>
      <p className="eyebrow">Xác nhận email</p>
      <h1 className="auth-title">Kiểm tra hộp thư</h1>
      <p className="auth-copy">Nhập mã OTP đã gửi tới <strong>{email}</strong>.</p>
      <form className="auth-form" onSubmit={verify}>
        <label>Mã xác nhận<input autoComplete="one-time-code" inputMode="numeric" name="token" required /></label>
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button primary" disabled={busy} type="submit">Xác nhận</button>
        <button className="button google-button" disabled={busy} onClick={resend} type="button">Gửi lại mã</button>
      </form>
      <Link className="back-link" href="/login">Quay lại đăng nhập</Link>
    </div>
  );
}
