"use client";

import { useId, useState } from "react";

export function PasswordField({
  label = "Mật khẩu",
  name = "password",
  autoComplete = "current-password",
  hint,
}: {
  label?: string;
  name?: string;
  autoComplete?: "current-password" | "new-password";
  hint?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="paper-auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="paper-auth-password">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi")}`}
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
      {hint && (
        <p className="paper-auth-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
