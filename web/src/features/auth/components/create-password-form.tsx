"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

import { newPasswordError, passwordRules } from "@/core/auth/password";
import { RuleList, StackedPassword } from "@/features/auth/components/paper-fields";

/* Last step of OTP-first sign-up (email and SMS): password + re-enter, rules inside the card. */
export function CreatePasswordForm({ busy, message, onSubmit, footer, eyebrow = "Bước cuối", title = "Tạo mật khẩu", copy = "Đặt mật khẩu để lần sau đăng nhập nhanh hơn.", submitLabel = "Hoàn tất" }: {
  busy: boolean;
  message: string | null;
  onSubmit(password: string): void;
  footer?: ReactNode;
  /** Header and button copy; defaults are the sign-up wording (password recovery overrides them). */
  eyebrow?: string;
  title?: string;
  copy?: string;
  submitLabel?: string;
}) {
  const rulesId = useId();
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const value = String(form.get("password") ?? "");
    const issue = newPasswordError(value, String(form.get("confirmation") ?? ""));
    setLocalError(issue);
    if (!issue) onSubmit(value);
  }

  const error = localError ?? message;
  return (
    <div className="pa-panel">
      <header className="pa-head">
        <p className="pa-eyebrow">{eyebrow}</p>
        <h1 className="pa-title">{title}</h1>
        <p className="pa-copy">{copy}</p>
      </header>
      <form className="pa-form-wrap" onSubmit={submit} aria-busy={busy} aria-describedby={error ? "create-password-message" : undefined}>
        <div className="pa-card">
          <StackedPassword label="Mật khẩu" name="password" placeholder="Tạo mật khẩu" onValue={setPassword} describedBy={rulesId} />
          <StackedPassword label="Nhập lại mật khẩu" name="confirmation" placeholder="Nhập lại mật khẩu" />
          <RuleList id={rulesId} items={passwordRules.map((r) => ({ id: r.id, text: r.text, ok: r.ok(password) }))} />
        </div>
        {error && <p className="pa-message" id="create-password-message" role="alert">{error}</p>}
        <button className="pa-btn" disabled={busy} type="submit">{busy ? "Đang lưu..." : submitLabel}</button>
        {footer}
      </form>
    </div>
  );
}
