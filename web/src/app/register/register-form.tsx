"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";
import { passwordValidationMessage } from "@/core/auth/password";

export function RegisterForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    const passwordIssue = passwordValidationMessage(password);
    if (passwordIssue) return setMessage(passwordIssue);
    if (password !== confirmation) return setMessage("Hai mật khẩu chưa khớp.");

    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
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
  }

  return (
    <div className="auth-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span>Picket</span></Link>
      <p className="eyebrow">Tạo tài khoản</p>
      <h1 className="auth-title">Bắt đầu với Picket</h1>
      <p className="auth-copy">Tài khoản này dùng chung cho web và ứng dụng mobile.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input autoComplete="email" name="email" required type="email" /></label>
        <label>Mật khẩu<input autoComplete="new-password" name="password" required type="password" /></label>
        <label>Nhập lại mật khẩu<input autoComplete="new-password" name="confirmation" required type="password" /></label>
        {message && <p className="form-message" role="alert">{message}</p>}
        <button className="button primary" disabled={busy} type="submit">{busy ? "Đang tạo..." : "Đăng ký"}</button>
      </form>
      <Link className="back-link" href="/login">Đã có tài khoản? Đăng nhập</Link>
    </div>
  );
}
