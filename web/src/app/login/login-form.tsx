"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/core/supabase/client";
import { PasswordField } from "@/features/auth/components/password-field";

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(initialError ?? null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("Email hoặc mật khẩu không đúng.");
        setBusy(false);
        return;
      }

      router.replace("/session");
      router.refresh();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
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
        setMessage("Không mở được đăng nhập Google. Vui lòng thử lại.");
        setBusy(false);
      }
    } catch {
      setMessage("Không mở được đăng nhập Google. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-card auth-card-compact">
      <h1 className="auth-title">Chào mừng bạn trở lại</h1>
      <p className="auth-copy">
        Đăng nhập để đồng bộ dữ liệu tài chính của bạn.
      </p>

      <button
        className="button google-button"
        disabled={busy}
        onClick={signInWithGoogle}
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
        Tiếp tục với Google
      </button>
      <div className="auth-divider">
        <span>hoặc đăng nhập bằng email</span>
      </div>

      <form
        className="auth-form"
        onSubmit={signIn}
        aria-busy={busy}
        aria-describedby={message ? "login-message" : undefined}
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
        <PasswordField />
        {message && (
          <p className="form-message" id="login-message" role="alert">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/forgot-password">Quên mật khẩu?</Link>
        <Link href="/register">Chưa có tài khoản? Đăng ký</Link>
      </div>
    </div>
  );
}
