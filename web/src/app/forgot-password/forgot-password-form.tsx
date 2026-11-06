"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";

export function ForgotPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    setSent(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      setMessage(
        error
          ? "Chưa gửi được email. Hãy chờ rồi thử lại."
          : "Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn khôi phục. Hãy kiểm tra cả thư mục spam.",
      );
      setSent(!error);
      if (!error) setCooldown(60);
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Quên mật khẩu?</h1>
      <p className="auth-copy">
        Nhập email bạn dùng với Picket để nhận hướng dẫn đặt lại mật khẩu.
      </p>
      <form
        className="auth-form"
        onSubmit={submit}
        aria-busy={busy}
        aria-describedby={message ? "recovery-message" : undefined}
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
        {message && (
          <p
            className="form-message"
            id="recovery-message"
            data-kind={sent ? "success" : "error"}
            role={sent ? "status" : "alert"}
          >
            {message}
          </p>
        )}
        <button
          className="button primary"
          disabled={busy || cooldown > 0}
          type="submit"
        >
          {busy
            ? "Đang gửi..."
            : cooldown > 0
              ? `Gửi lại sau ${cooldown}s`
              : sent
                ? "Gửi lại hướng dẫn"
                : "Gửi hướng dẫn"}
        </button>
      </form>
      <Link className="back-link" href="/login">
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
