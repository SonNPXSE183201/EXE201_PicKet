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
        <label htmlFor={id} style={{ fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "var(--pa-muted)" }}>{label}</label>
        <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required onChange={(e) => onValue?.(e.target.value)} />
      </span>
      <button type="button" className="pa-eye" aria-controls={id} aria-pressed={visible} aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi")}`} onClick={() => setVisible((v) => !v)}>
        <AdminIcon name={visible ? "eye" : "eye-off"} size={20} />
      </button>
    </div>
  );
}

/** Six single-digit boxes that submit as one field (`name`), with paste and arrow-key support. */
export function OtpInput({ name, length = 6, label = "Mã xác thực", autoFocus = true, disabled = false }: {
  name: string; length?: number; label?: string; autoFocus?: boolean; disabled?: boolean;
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
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} placeholder=" " inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"}
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
