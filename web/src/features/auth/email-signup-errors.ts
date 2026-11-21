/**
 * POST /v1/auth/email-signup {action:"start"} failure: the message that stops the
 * sign-up, or null to send the code anyway. Only answers the server meant (taken
 * address, limits, switched off, invalid) stop it; an unreachable or older API
 * must not block email sign-up.
 */
export function emailSignupStartBlockMessage(error: unknown): string | null {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  switch (typeof status === "number" ? status : 0) {
    case 400:
      return "Email không hợp lệ.";
    case 403:
      return "Đăng ký bằng email đang tạm tắt. Hãy thử cách khác.";
    case 409:
      return "Email đã được đăng ký. Hãy đăng nhập hoặc dùng Quên mật khẩu.";
    case 429:
      return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
    default:
      return null;
  }
}
