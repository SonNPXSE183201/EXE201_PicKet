"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";
import { passwordValidationMessage } from "@/core/auth/password";
import { PasswordField } from "@/features/auth/components/password-field";

export function RegisterForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function signUpWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    const passwordIssue = passwordValidationMessage(password);
    if (passwordIssue) return setMessage(passwordIssue);
    if (password !== confirmation) return setMessage("Hai mật khẩu chưa khớp.");

    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setMessage(
          "Không thể tạo tài khoản. Email có thể đã được sử dụng hoặc bạn thao tác quá nhanh.",
        );
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

  return (
    <div className="auth-card">
      <h1 className="auth-title">Tạo tài khoản</h1>
      <p className="auth-copy">
        Bắt đầu ghi chép và chăm chút kế hoạch tài chính cùng Picket.
      </p>
      <button
        className="button google-button"
        disabled={busy}
        onClick={signUpWithGoogle}
        type="button"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.4Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4H3.1v2.6A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z"
          />
          <path
            fill="#EA4335"
            d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10c.8-2.3 3-4 5.6-4Z"
          />
        </svg>
        Đăng ký nhanh bằng Google
      </button>
      <div className="auth-divider">
        <span>hoặc đăng ký bằng email</span>
      </div>
      <form
        className="auth-form"
        onSubmit={submit}
        aria-busy={busy}
        aria-describedby={message ? "register-message" : undefined}
      >
        <label>
          Email
          <input
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            name="email"
            required
            type="email"
          />
        </label>
        <PasswordField
          autoComplete="new-password"
          hint="Ít nhất 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
        />
        <PasswordField
          label="Nhập lại mật khẩu"
          name="confirmation"
          autoComplete="new-password"
        />
        {message && (
          <p className="form-message" id="register-message" role="alert">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>
      <p className="paper-auth-policy">
        Tìm hiểu cách Picket xử lý dữ liệu trong{" "}
        <a href="https://picketfinance.com/privacy.html">
          Chính sách quyền riêng tư
        </a>
        .
      </p>
      <Link className="back-link" href="/login">
        Đã có tài khoản? Đăng nhập
      </Link>
    </div>
  );
}
