"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";

import { AdminIcon } from "@/features/admin/ui/admin-icon";
import { OtpInput } from "@/features/auth/components/paper-fields";

/** "00:28" as in Figma › Web › 29. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* Figma › Web › 29 Xác minh email — shared by email (/verify-email) and SMS sign-up. */
export function VerifyCodeForm({ channel, destination, busy, message, cooldown, onVerify, onResend, change, extra }: {
  channel: "email" | "phone";
  destination: string;
  busy: boolean;
  message: { text: string; info?: boolean } | null;
  cooldown: number;
  onVerify(code: string): void;
  onResend(): void;
  /** Link (href) or callback for "Đổi địa chỉ email" / "Đổi số điện thoại". */
  change: string | (() => void);
  /** Turnstile widget or other hidden helpers. */
  extra?: ReactNode;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    onVerify(String(new FormData(event.currentTarget).get("token") ?? "").trim());
  }
  const changeLabel = channel === "email" ? "Đổi địa chỉ email" : "Đổi số điện thoại";
  const changeContent = <><span aria-hidden="true">←</span>{changeLabel}</>;
  return (
    <div className="pa-panel">
      <header className="pa-head">
        <p className="pa-eyebrow">Xác minh tài khoản</p>
        <h1 className="pa-title">Nhập mã xác minh</h1>
        <p className="pa-copy">Mã gồm 6 chữ số đã được gửi đến <strong>{destination}</strong>.</p>
      </header>
      <form className="pa-form-wrap" onSubmit={submit} aria-busy={busy} aria-describedby={message ? "verify-message" : undefined}>
        <div className="pa-code-card">
          <span className="pa-code-label" aria-hidden="true">Mã xác minh</span>
          <OtpInput name="token" label="Mã xác minh" disabled={busy} />
        </div>
        <p className="pa-resend" aria-live="polite">
          Chưa nhận được mã?{" "}
          {cooldown > 0
            ? <span>Gửi lại sau {formatCountdown(cooldown)}</span>
            : <button type="button" onClick={onResend} disabled={busy}>Gửi lại mã</button>}
        </p>
        {message && <p className={`pa-message${message.info ? " is-info" : ""}`} id="verify-message" role={message.info ? "status" : "alert"}>{message.text}</p>}
        {extra}
        <button className="pa-btn" disabled={busy} type="submit"><AdminIcon name="check" size={20} />{busy ? "Đang xác minh..." : "Xác minh"}</button>
        {typeof change === "string"
          ? <Link className="pa-link" href={change}>{changeContent}</Link>
          : <button className="pa-link" type="button" onClick={change} disabled={busy}>{changeContent}</button>}
      </form>
    </div>
  );
}
