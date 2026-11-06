"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const token = String(
      new FormData(event.currentTarget).get("token") ?? "",
    ).trim();
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      if (error) {
        setMessage("Mã xác nhận không đúng hoặc đã hết hạn.");
        setBusy(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || cooldown) return;
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });
      setMessage(
        error
          ? "Chưa gửi lại được mã. Hãy chờ rồi thử lại."
          : "Nếu tài khoản cần xác minh, bạn sẽ nhận được mã mới. Nếu đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật khẩu.",
      );
      if (!error) setCooldown(60);
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <Link className="brand auth-brand" href="/">
        <Image src="/picket-logo.png" alt="" width={48} height={48} />
        <span>Picket</span>
      </Link>
      <p className="eyebrow">Xác nhận email</p>
      <h1 className="auth-title">Kiểm tra hộp thư</h1>
      <p className="auth-copy">
        Nếu email <strong>{email}</strong> đủ điều kiện đăng ký, bạn sẽ nhận
        được mã xác minh. Nếu đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật
        khẩu.
      </p>
      <form className="auth-form" onSubmit={verify}>
        <label>
          Mã xác nhận
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            name="token"
            required
          />
        </label>
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy} type="submit">
          Xác nhận
        </button>
        <button
          className="button google-button"
          disabled={busy || cooldown > 0}
          onClick={resend}
          type="button"
        >
          {cooldown ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
        </button>
      </form>
      <Link className="back-link" href="/login">
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
