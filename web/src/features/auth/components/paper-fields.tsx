"use client";
import { useId, useRef, useState, type InputHTMLAttributes } from "react";
import { AdminIcon } from "@/features/admin/ui/admin-icon";

/* Field rows inside one white card, as in Figma "Paper · FieldRows". */
export function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="pa-fields">{children}</div>;
}

export function FieldRow({ icon, label, ...input }: { icon: string; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label className="pa-row" htmlFor={id}>
      <span className="pa-tile"><AdminIcon name={icon} size={20} /></span>
      <span className="pa-row-text"><span>{label}</span><input id={id} {...input} /></span>
    </label>
  );
}

export function PasswordRow({ label = "Mật khẩu", name = "password", autoComplete = "current-password", onValue }: {
  label?: string; name?: string; autoComplete?: "current-password" | "new-password"; onValue?: (value: string) => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="pa-row">
      <label className="pa-tile" htmlFor={id}><AdminIcon name="lock" size={20} /></label>
      <span className="pa-row-text">
        <label htmlFor={id}>{label}</label>
        <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required onChange={(e) => onValue?.(e.target.value)} />
      </span>
      <button type="button" className="pa-eye" aria-controls={id} aria-pressed={visible} aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi")}`} onClick={() => setVisible((v) => !v)}>
        <AdminIcon name={visible ? "eye" : "eye-off"} size={20} />
      </button>
    </div>
  );
}

/** Six single-digit boxes that submit as one field (`name`), with paste and arrow-key support. */
export function OtpInput({ name, length = 6, label = "Mã xác thực", autoFocus = true, disabled = false, mask = false }: {
  name: string; length?: number; label?: string; autoFocus?: boolean; disabled?: boolean;
  /** Hide the digits (PIN entry). */
  mask?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const fill = (start: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, length - start).split("");
    if (!chars.length) return;
    setDigits((prev) => { const next = [...prev]; chars.forEach((c, i) => { next[start + i] = c; }); return next; });
    refs.current[Math.min(length - 1, start + chars.length)]?.focus();
  };
  return (
    <div className="pa-otp" role="group" aria-label={label}>
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} placeholder=" " inputMode="numeric" type={mask ? "password" : "text"} autoComplete={mask ? "off" : i === 0 ? "one-time-code" : "off"}
          maxLength={length} aria-label={`${label} — chữ số ${i + 1}`} autoFocus={autoFocus && i === 0} disabled={disabled}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) return fill(i, v);
            setDigits((prev) => { const next = [...prev]; next[i] = v; return next; });
            if (v) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft") refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => { e.preventDefault(); fill(i, e.clipboardData.getData("text")); }} />
      ))}
    </div>
  );
}

/* Figma › Web › 27 Đăng ký: label above a cream input with an 18px icon (no border). */
export function StackedField({ icon, label, hint, ...input }: { icon: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="pa-stack">
      <label htmlFor={id}>{label}</label>
      <span className="pa-stack-input">
        <AdminIcon name={icon} size={18} />
        <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      </span>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

export function StackedPassword({ label, name, placeholder, autoComplete = "new-password", onValue, describedBy }: {
  label: string; name: string; placeholder?: string; autoComplete?: "current-password" | "new-password"; onValue?: (value: string) => void; describedBy?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="pa-stack">
      <label htmlFor={id}>{label}</label>
      <span className="pa-stack-input">
        <AdminIcon name="lock" size={18} />
        <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required placeholder={placeholder}
          aria-describedby={describedBy} onChange={(e) => onValue?.(e.target.value)} />
        <button type="button" className="pa-stack-eye" aria-controls={id} aria-pressed={visible} aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi")}`} onClick={() => setVisible((v) => !v)}>
          <AdminIcon name={visible ? "eye" : "eye-off"} size={18} />
        </button>
      </span>
    </div>
  );
}

/** Live checklist; `rules` come from core/auth/password (same rules as the API). */
export function RuleList({ id, items }: { id?: string; items: readonly { id: string; text: string; ok: boolean }[] }) {
  return (
    <ul className="pa-rules" id={id} aria-label="Yêu cầu mật khẩu">
      {items.map((r) => <li key={r.id} className={r.ok ? "is-ok" : undefined}>{r.text}<span className="pa-sr">{r.ok ? " — đã đạt" : " — chưa đạt"}</span></li>)}
    </ul>
  );
}

/** Google "G" mark (brand colours kept as required by Google's guidelines). */
export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10c.8-2.3 3-4 5.6-4Z" />
    </svg>
  );
}
