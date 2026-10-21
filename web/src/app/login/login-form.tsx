"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { createClient } from "@/core/supabase/client";

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
  }

  async function signInWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
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
  }

  return (
    <div className="auth-card">
      <Link className="brand auth-brand" href="/" aria-label="Picket trang chủ">
        <Image src="/picket-logo.png" alt="" width={48} height={48} />
        <span>Picket</span>
      </Link>
      <h1 className="auth-title">Chào mừng trở lại</h1>
      <p className="auth-copy">
        Đăng nhập để tiếp tục quản lý thu chi trên web và điện thoại. Tài khoản
        quản trị sẽ vào không gian quản trị riêng.
      </p>

      <form className="auth-form" onSubmit={signIn}>
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Mật khẩu
          <input
            autoComplete="current-password"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>
        {message && (
          <p className="form-message" role="alert">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy} type="submit">
          {busy ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      <div className="auth-divider">
        <span>hoặc</span>
      </div>
      <button
        className="button google-button"
        disabled={busy}
        onClick={signInWithGoogle}
        type="button"
      >
        Tiếp tục với Google
      </button>
      <div className="auth-links">
        <Link href="/forgot-password">Quên mật khẩu?</Link>
        <Link href="/register">Chưa có tài khoản? Đăng ký</Link>
      </div>
      <Link className="back-link" href="/">
        Quay lại trang giới thiệu
      </Link>
    </div>
  );
}
