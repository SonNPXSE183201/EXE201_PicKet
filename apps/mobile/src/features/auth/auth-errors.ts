import { AuthError } from "@supabase/supabase-js";

import { AuthCallbackError } from "@/features/auth/auth-callback";

const passwordSymbols = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthCallbackError) return error.message;
  if (!(error instanceof AuthError)) {
    return "Không kết nối được dịch vụ. Hãy kiểm tra mạng và thử lại.";
  }
  if (error.status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
  }
  switch (error.code) {
    case "email_not_confirmed":
      return "Email chưa được xác nhận. Hãy kiểm tra hộp thư.";
    case "otp_expired":
      return "Mã xác nhận không đúng hoặc đã hết hạn.";
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng.";
    case "weak_password":
      return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
    default:
      return "Không thể xác thực. Hãy kiểm tra thông tin và thử lại.";
  }
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Email chưa hợp lệ.";
}

export function validatePassword(password: string): string | null {
  if (password.length < 12) return "Mật khẩu cần ít nhất 12 ký tự.";
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !Array.from(password).some((character) => passwordSymbols.includes(character))
  ) {
    return "Mật khẩu cần chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";
  }
  return null;
}
