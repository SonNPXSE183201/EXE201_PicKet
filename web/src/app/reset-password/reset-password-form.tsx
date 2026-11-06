"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";
import { passwordValidationMessage } from "@/core/auth/password";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    const passwordIssue = passwordChanged
      ? null
      : passwordValidationMessage(password);
    if (passwordIssue) return setMessage(passwordIssue);
    if (password !== confirmation) return setMessage("Hai mật khẩu chưa khớp.");

    setBusy(true);
    setMessage(null);
    try {
      if (!passwordChanged) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setMessage(
            "Không cập nhật được mật khẩu. Liên kết có thể đã hết hạn.",
          );
          setBusy(false);
          return;
        }
        setPasswordChanged(true);
      }
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "global",
      });
      if (logoutError) {
        setMessage(
          "Mật khẩu đã cập nhật. Chưa thu hồi được phiên; nhấn lại để thử đăng xuất các phiên.",
        );
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="brand auth-brand">
        <Image src="/picket-logo.png" alt="" width={48} height={48} />
        <span>Picket</span>
      </div>
      <p className="eyebrow">Bảo mật tài khoản</p>
      <h1 className="auth-title">Đặt mật khẩu mới</h1>
      <form className="auth-form" onSubmit={submit}>
        <label>
          Mật khẩu mới
          <input
            autoComplete="new-password"
            name="password"
            required={!passwordChanged}
            disabled={passwordChanged}
            type="password"
          />
        </label>
        <label>
          Nhập lại mật khẩu
          <input
            autoComplete="new-password"
            name="confirmation"
            required={!passwordChanged}
            disabled={passwordChanged}
            type="password"
          />
        </label>
        {message && (
          <p className="form-message" role="alert">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy} type="submit">
          {busy
            ? "Đang lưu..."
            : passwordChanged
              ? "Thử đăng xuất các phiên"
              : "Cập nhật mật khẩu"}
        </button>
      </form>
    </div>
  );
}
