const passwordSymbols = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

export function passwordValidationMessage(password: string): string | null {
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !Array.from(password).some((character) =>
      passwordSymbols.includes(character),
    )
  ) {
    return "Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";
  }
  return null;
}
