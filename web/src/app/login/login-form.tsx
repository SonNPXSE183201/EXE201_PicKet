"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PicketApiClient } from "@picket/api-client";
import { passwordLoginCredentials } from "@picket/domain";

import { createClient } from "@/core/supabase/client";
import { GoogleIdButton } from "@/features/auth/components/google-id-button";
import { useTurnstileGate } from "@/core/security/turnstile-widget";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import { FieldGroup, FieldRow, OtpInput, PasswordRow } from "@/features/auth/components/paper-fields";

interface LoginFormProps {
  googleClientId?: string;
  siteKey?: string;
  initialError?: string;
  /** Staff portal variant (Figma › Admin Web › Đăng nhập). */
  admin?: boolean;
  /** Where to go after sign-in; must be a same-site path. */
  next?: string;
  /** This browser has a saved PIN (quick unlock). */
  pinAvailable?: boolean;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function LoginForm({ googleClientId, siteKey, initialError, admin = false, next = "/session", pinAvailable = false }: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const gate = useTurnstileGate(siteKey);
  const [busy, setBusy] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/session";

  function finish() {
    router.replace(destination);
    router.refresh();
  }

  /** Ask for the TOTP code when the account has MFA but the session is still aal1. */
  async function needsMfa() {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.nextLevel !== "aal2" || data.currentLevel === "aal2") return false;
      const factors = await supabase.auth.mfa.listFactors();
      const totp = factors.data?.totp?.find((f) => f.status === "verified");
      if (!totp) return false;
      setFactorId(totp.id);
      return true;
    } catch {
      return false;
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    let credentials;
    try {
      credentials = passwordLoginCredentials(String(form.get("identifier") ?? ""), password);
    } catch {
      setMessage("Email hoặc số điện thoại không hợp lệ.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const blocked = await gate.check();
    if (blocked) {
      setMessage(blocked);
      setBusy(false);
      return;
    }

    try {
      if (credentials.phone) {
        // Phone numbers live in Picket contact methods, so the API resolves them (same as mobile).
        try {
          const tokens = await new PicketApiClient(apiBaseUrl).phoneLogin(credentials.phone, password);
          const { error } = await supabase.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
          if (error) throw error;
        } catch (error) {
          const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 0;
          setMessage(status === 429 ? "Bạn thử quá nhiều lần. Vui lòng chờ một lát." : "Email, số điện thoại hoặc mật khẩu không đúng.");
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) {
          setMessage("Email, số điện thoại hoặc mật khẩu không đúng.");
          setBusy(false);
          return;
        }
      }
      if (await needsMfa()) {
        setBusy(false);
        return;
      }
      finish();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !factorId) return;
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    if (!/^\d{6}$/.test(code)) return setMessage("Nhập đủ 6 chữ số từ ứng dụng xác thực.");
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        setMessage("Mã không đúng hoặc đã hết hạn. Thử mã mới trong ứng dụng xác thực.");
        setBusy(false);
        return;
      }
      finish();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${admin ? "/session" : "/dashboard"}`;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams: { prompt: "select_account" } },
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

  const notice = message && <p className="pa-message" id="login-message" role="alert">{message}</p>;

  if (factorId) {
    return (
      <div className="auth-card auth-card-compact">
        <header className="pa-head">
          <p className="pa-eyebrow">Bước 2 / 2</p>
          <h1 className="pa-title">Nhập mã xác thực</h1>
          <p className="pa-copy">Mở ứng dụng xác thực đã liên kết với tài khoản và nhập mã 6 số.</p>
        </header>
        <form onSubmit={verifyMfa} aria-busy={busy} className="pa-form-wrap" aria-describedby={message ? "login-message" : undefined}>
          <div className="pa-otp-card">
            <OtpInput name="code" label="Mã xác thực MFA" disabled={busy} />
            <p className="pa-otp-hint"><AdminIcon name="calendar" size={14} />Mã trong ứng dụng đổi sau mỗi 30 giây.</p>
          </div>
          {notice}
          <button className="pa-btn" disabled={busy} type="submit">{busy ? "Đang xác minh..." : "Xác minh"}</button>
          <button className="pa-link" type="button" disabled={busy} onClick={finish}>Để sau, vào chế độ đọc</button>
        </form>
        {admin && <p className="pa-note"><AdminIcon name="shield" size={14} />Mọi thao tác quản trị đều được ghi nhật ký kèm lý do.</p>}
      </div>
    );
  }

  return (
    <div className="auth-card auth-card-compact">
      <header className="pa-head">
        <p className="pa-eyebrow">{admin ? "Chỉ dành cho nhân sự Picket" : "Chào mừng trở lại"}</p>
        <h1 className="pa-title">{admin ? "Đăng nhập quản trị" : "Đăng nhập Picket"}</h1>
        <p className="pa-copy">{admin ? "Dùng email công ty. Phiên quản trị cần MFA để thay đổi dữ liệu." : "Đăng nhập để đồng bộ dữ liệu tài chính giữa điện thoại và máy tính."}</p>
      </header>

      {pinAvailable && (
        <Link className="pa-pin-cta" href="/login/pin">
          <span className="pa-tile"><AdminIcon name="lock" size={20} /></span>
          <span><b>Mở khoá nhanh bằng PIN</b><small>Trình duyệt này đã bật PIN · không cần mật khẩu</small></span>
          <AdminIcon name="chevron-right" size={16} />
        </Link>
      )}
      {pinAvailable && <div className="pa-divider">hoặc đăng nhập bằng mật khẩu</div>}
      <form className="pa-form-wrap" onSubmit={signIn} aria-busy={busy} aria-describedby={message ? "login-message" : undefined}>
        <FieldGroup>
          <FieldRow icon="mail" label={admin ? "Email công ty" : "Email hoặc số điện thoại"} name="identifier" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={admin ? "ten@picket.vn" : "ban@example.com hoặc 09xx xxx xxx"} />
          <PasswordRow />
        </FieldGroup>
        {notice}
        {gate.widget}
        <button className="pa-btn" disabled={busy} type="submit">{busy ? "Đang xử lý..." : admin ? "Tiếp tục" : "Đăng nhập"}</button>
        <Link className="pa-link" href="/forgot-password">Quên mật khẩu?</Link>
      </form>

      {admin ? (
        <p className="pa-note"><AdminIcon name="shield" size={14} />Mọi thao tác quản trị đều được ghi nhật ký kèm lý do.</p>
      ) : (
        <>
          <div className="pa-divider">hoặc</div>
          {googleClientId && !googleUnavailable ? (
            <GoogleIdButton googleClientId={googleClientId} disabled={busy}
              onSuccess={async () => {
                setMessage(null);
                if (!(await needsMfa())) finish();
              }}
              onError={() => {
                setMessage("Không mở được đăng nhập Google. Vui lòng thử lại.");
                setGoogleUnavailable(true);
              }}
              onUnavailable={() => setGoogleUnavailable(true)} />
          ) : <button className="pa-btn is-secondary" disabled={busy} onClick={signInWithGoogle} type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.4Z" />
              <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4H3.1v2.6A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z" />
              <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10c.8-2.3 3-4 5.6-4Z" />
            </svg>
            Tiếp tục với Google
          </button>}
          <p className="pa-meta">Chưa có tài khoản? <Link href="/register">Đăng ký</Link></p>
        </>
      )}
    </div>
  );
}
