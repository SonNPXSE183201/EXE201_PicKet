/** Same symbol set the API and web use for new passwords. */
export const passwordSymbols = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";
export const passwordMinLength = 12;

export type PasswordRuleId = "length" | "mixedCase" | "digit" | "symbol";

/** Rule rows shown on the create-password screen, in display order. */
export const passwordRuleLabels: readonly { id: PasswordRuleId; label: string }[] = [
  { id: "length", label: "Ít nhất 12 ký tự" },
  { id: "mixedCase", label: "Có chữ hoa và chữ thường" },
  { id: "digit", label: "Có ít nhất một số" },
  { id: "symbol", label: "Có ký tự đặc biệt (!@#...)" },
];

export function passwordRuleChecks(password: string): Record<PasswordRuleId, boolean> {
  return {
    length: password.length >= passwordMinLength,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: Array.from(password).some((character) => passwordSymbols.includes(character)),
  };
}

export function passwordMeetsRules(password: string): boolean {
  return Object.values(passwordRuleChecks(password)).every(Boolean);
}

/** First problem with a new password and its confirmation, or null when both are fine. */
export function newPasswordIssue(password: string, confirmation: string): string | null {
  // Pasted or keyboard-added spaces at the ends are invisible and make the fields "not match".
  if (password !== password.trim() || confirmation !== confirmation.trim()) {
    return "Mật khẩu không được có dấu cách ở đầu hoặc cuối.";
  }
  const checks = passwordRuleChecks(password);
  if (!checks.length) return "Mật khẩu cần ít nhất 12 ký tự.";
  if (!checks.mixedCase || !checks.digit || !checks.symbol) {
    return "Mật khẩu cần chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";
  }
  if (password !== confirmation) return "Mật khẩu xác nhận không khớp.";
  return null;
}
