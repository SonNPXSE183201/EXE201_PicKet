"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";
import { passwordValidationMessage } from "@/core/auth/password";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    const passwordIssue = passwordValidationMessage(password);
    if (passwordIssue) return setMessage(passwordIssue);
    if (password !== confirmation) return setMessage("Hai mật khẩu chưa khớp.");

    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage("Không cập nhật được mật khẩu. Liên kết có thể đã hết hạn.");
      setBusy(false);
      return;
    }
    router.replace("/session");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="brand auth-brand"><span className="brand-mark">P</span><span>Picket</span></div>
      <p className="eyebrow">Bảo mật tài khoản</p>
      <h1 className="auth-title">Đặt mật khẩu mới</h1>
      <form className="auth-form" onSubmit={submit}>
        <label>Mật khẩu mới<input autoComplete="new-password" name="password" required type="password" /></label>
        <label>Nhập lại mật khẩu<input autoComplete="new-password" name="confirmation" required type="password" /></label>
        {message && <p className="form-message" role="alert">{message}</p>}
        <button className="button primary" disabled={busy} type="submit">{busy ? "Đang lưu..." : "Cập nhật mật khẩu"}</button>
      </form>
    </div>
  );
}
