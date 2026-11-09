"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PicketApiClient } from "@picket/api-client";

import { createClient } from "@/core/supabase/client";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import { OtpInput } from "@/features/auth/components/paper-fields";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/* Figma › User Web › W2 Nhập mã xác thực. */
export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; info?: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(45);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  /** A phone chosen at sign-up is attached once the session exists (same as mobile). */
  async function attachPendingPhone() {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const phone = session?.user.user_metadata?.pending_phone;
      if (!session || typeof phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(phone)) return;
      await new PicketApiClient(apiBaseUrl).accountPhone(session.access_token, { phone }).catch((error: { status?: number }) => {
        // 400/409: invalid or owned by another account — drop it instead of retrying forever.
        if (error?.status !== 400 && error?.status !== 409) throw error;
      });
      await supabase.auth.updateUser({ data: { pending_phone: null } });
    } catch {
      /* Mobile retries on the next session; the account itself is ready. */
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const token = String(new FormData(event.currentTarget).get("token") ?? "").trim();
    if (!/^\d{6}$/.test(token)) return setMessage({ text: "Nhập đủ 6 chữ số trong email." });
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
      if (error) {
        setMessage({ text: "Mã xác nhận không đúng hoặc đã hết hạn." });
        setBusy(false);
        return;
      }
      await attachPendingPhone();
      router.replace("/dashboard");
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
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      setMessage(error
        ? { text: "Chưa gửi lại được mã. Hãy chờ rồi thử lại." }
        : { text: "Nếu tài khoản cần xác minh, bạn sẽ nhận được mã mới. Nếu đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật khẩu.", info: true });
      if (!error) setCooldown(45);
    } catch {
      setMessage({ text: "Không thể kết nối. Kiểm tra mạng rồi thử lại." });
    } finally {
      setBusy(false);
    }
  }

  const countdown = `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`;
  return (
    <div className="auth-card">
      <header className="pa-head">
        <p className="pa-eyebrow">Xác nhận email</p>
        <h1 className="pa-title">Kiểm tra hộp thư</h1>
        <p className="pa-copy">Mã 6 số đã gửi tới <strong>{email}</strong>. Nếu đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật khẩu.</p>
      </header>
      <form className="pa-form-wrap" onSubmit={verify} aria-busy={busy}>
        <div className="pa-otp-card">
          <OtpInput name="token" label="Mã xác nhận email" disabled={busy} />
          <p className="pa-otp-hint">
            <AdminIcon name="mail" size={14} />Chưa nhận được?{" "}
            <button type="button" onClick={resend} disabled={busy || cooldown > 0}>{cooldown ? `Gửi lại mã sau ${countdown}` : "Gửi lại mã"}</button>
          </p>
        </div>
        {message && <p className={`pa-message${message.info ? " is-info" : ""}`} role={message.info ? "status" : "alert"}>{message.text}</p>}
        <button className="pa-btn" disabled={busy} type="submit">{busy ? "Đang xác nhận..." : "Xác nhận"}</button>
        <Link className="pa-link" href="/register">Đổi email</Link>
      </form>
      <Link className="pa-back" href="/login"><AdminIcon name="chevron-left" size={14} />Quay lại đăng nhập</Link>
    </div>
  );
}
