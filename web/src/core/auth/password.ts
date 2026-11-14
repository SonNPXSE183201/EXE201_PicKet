const passwordSymbols = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

/** Same rules as the API (`apps/api`): shown as a live checklist while typing. */
export const passwordRules: readonly { id: string; text: string; ok: (password: string) => boolean }[] = [
  { id: "length", text: "Ít nhất 12 ký tự", ok: (p) => p.length >= 12 },
  { id: "case", text: "Có chữ hoa và chữ thường", ok: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "digit", text: "Có ít nhất một số", ok: (p) => /\d/.test(p) },
  { id: "symbol", text: "Có ký tự đặc biệt", ok: (p) => Array.from(p).some((c) => passwordSymbols.includes(c)) },
];

export function passwordValidationMessage(password: string): string | null {
  if (!passwordRules.every((rule) => rule.ok(password))) {
    return "Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";
  }
  return null;
}

/** Validation for "create password + re-enter it"; returns the first Vietnamese error. */
export function newPasswordError(password: string, confirmation: string): string | null {
  return passwordValidationMessage(password) ?? (password !== confirmation ? "Hai mật khẩu chưa khớp." : null);
}
