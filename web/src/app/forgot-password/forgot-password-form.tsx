"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";

export function ForgotPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error
      ? "Chưa gửi được email. Hãy chờ rồi thử lại."
      : "Nếu email tồn tại, Picket đã gửi hướng dẫn đặt lại mật khẩu.");
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span>Picket</span></Link>
      <p className="eyebrow">Khôi phục tài khoản</p>
      <h1 className="auth-title">Quên mật khẩu?</h1>
      <p className="auth-copy">Nhập email để nhận liên kết hoặc mã khôi phục.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input autoComplete="email" name="email" required type="email" /></label>
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button primary" disabled={busy} type="submit">{busy ? "Đang gửi..." : "Gửi hướng dẫn"}</button>
      </form>
      <Link className="back-link" href="/login">Quay lại đăng nhập</Link>
    </div>
  );
}
