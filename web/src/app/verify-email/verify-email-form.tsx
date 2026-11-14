"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PASSWORD_SETUP_PATH } from "@/core/auth/password-setup";
import { createClient } from "@/core/supabase/client";
import { useTurnstileGate } from "@/core/security/turnstile-widget";
import { VerifyCodeForm } from "@/features/auth/components/verify-code-form";

const RESEND_SECONDS = 45;

/* Figma › Web › 29 Xác minh email. OTP-first: the email code signs the user in, then
   /create-password asks for the password (the proxy keeps them there until it is set). */
export function VerifyEmailForm({ email, siteKey }: { email: string; siteKey?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const gate = useTurnstileGate(siteKey);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; info?: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function verify(token: string) {
    if (busy) return;
    if (!/^\d{6}$/.test(token)) return setMessage({ text: "Nhập đủ 6 chữ số trong email." });
    setBusy(true);
    setMessage(null);
    const blocked = await gate.check();
    if (blocked) {
      setMessage({ text: blocked });
      setBusy(false);
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) {
        setMessage({ text: "Mã xác minh không đúng hoặc đã hết hạn." });
        setBusy(false);
        return;
      }
      // Accounts that already have a password are sent on to the dashboard by /create-password.
      router.replace(PASSWORD_SETUP_PATH);
      router.refresh();
    } catch {
      setMessage({ text: "Không thể kết nối. Kiểm tra mạng rồi thử lại." });
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || cooldown) return;
    setBusy(true);
    setMessage(null);
    const blocked = await gate.check();
    if (blocked) {
      setMessage({ text: blocked });
      setBusy(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${PASSWORD_SETUP_PATH}`,
          data: { password_setup_required: true },
        },
      });
      setMessage(error
        ? { text: "Chưa gửi lại được mã. Hãy chờ rồi thử lại." }
        : { text: "Đã gửi mã mới. Kiểm tra hộp thư (cả thư mục spam).", info: true });
      if (!error) setCooldown(RESEND_SECONDS);
    } catch {
      setMessage({ text: "Không thể kết nối. Kiểm tra mạng rồi thử lại." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <VerifyCodeForm channel="email" destination={email} busy={busy} message={message} cooldown={cooldown}
      onVerify={verify} onResend={resend} change="/register" extra={<>{gate.widget}</>} />
  );
}
