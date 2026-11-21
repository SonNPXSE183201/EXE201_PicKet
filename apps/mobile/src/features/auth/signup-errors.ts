import { invalidLocalPhoneMessage } from "./phone-input";

export const phoneAlreadyRegisteredMessage = "Số điện thoại đã được đăng ký. Hãy đăng nhập.";
export const emailAlreadyRegisteredMessage = "Email đã được đăng ký. Hãy đăng nhập hoặc dùng Quên mật khẩu.";
const networkMessage = "Không kết nối được dịch vụ. Hãy kiểm tra mạng và thử lại.";

/** Firebase codes arrive as "auth/<code>" (or bare) on the native error. */
export function firebaseErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === "string" ? code.replace(/^auth\//, "") : "";
}

export function isWrongCodeError(error: unknown): boolean {
  const code = firebaseErrorCode(error);
  return code === "invalid-verification-code" || code === "otp_expired";
}

export function isExpiredCodeError(error: unknown): boolean {
  const code = firebaseErrorCode(error);
  return code === "session-expired" || code === "code-expired";
}

export function firebasePhoneErrorMessage(error: unknown): string {
  switch (firebaseErrorCode(error)) {
    case "invalid-phone-number":
    case "missing-phone-number":
      return invalidLocalPhoneMessage;
    case "too-many-requests":
      return "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.";
    case "quota-exceeded":
      return "Hệ thống SMS đang quá tải. Hãy thử lại sau hoặc đăng ký bằng email.";
    case "invalid-verification-code":
      return "Mã chưa đúng.";
    case "session-expired":
    case "code-expired":
      return "Mã đã hết hạn. Hãy gửi lại mã.";
    case "operation-not-allowed":
      return "Đăng ký bằng số điện thoại chưa được bật. Hãy đăng ký bằng email.";
    case "missing-client-identifier":
    case "app-not-authorized":
    case "invalid-app-credential":
    case "missing-app-credential":
      return "Không xác minh được ứng dụng để gửi SMS. Hãy cập nhật PicKet hoặc đăng ký bằng email.";
    case "network-request-failed":
      return networkMessage;
    case "instant-unavailable":
      return "Chưa xác minh tự động được số này. Hãy gửi lại mã.";
    default:
      return "Không gửi được mã SMS. Vui lòng thử lại.";
  }
}

function errorStatus(error: unknown): number {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return typeof status === "number" ? status : 0;
}

export const codeRestartMessage = "Mã đã hết hạn, hãy gửi lại mã.";

/**
 * 403 "Request a new code first.": the server-side start (or reset-start) is older than
 * 15 minutes or was already used. The flow restarts from the phone step.
 */
export function isPhoneCodeRestartError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown } | null | undefined)?.message ?? "");
  return errorStatus(error) === 403 && /request a new code/i.test(message);
}

/** POST /v1/auth/phone-signup {action:"start"} failures. */
export function phoneSignupStartErrorMessage(error: unknown): string {
  const status = errorStatus(error);
  if (status === 400) return invalidLocalPhoneMessage;
  if (status === 403) return "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.";
  if (status === 409) return phoneAlreadyRegisteredMessage;
  if (status === 429) {
    const message = error instanceof Error ? error.message : "";
    return /limit reached/i.test(message)
      ? "Hôm nay PicKet đã gửi đủ SMS. Hãy thử lại vào ngày mai hoặc đăng ký bằng email."
      : "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
  }
  return networkMessage;
}

/** POST /v1/auth/phone-signup {action:"complete"} failures. */
export function phoneSignupCompleteErrorMessage(error: unknown): string {
  if (isPhoneCodeRestartError(error)) return codeRestartMessage;
  const status = errorStatus(error);
  if (status === 400) return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
  if (status === 401) return "Phiên xác thực số điện thoại đã hết hạn. Hãy đăng ký lại.";
  if (status === 403) return "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.";
  if (status === 409) return phoneAlreadyRegisteredMessage;
  if (status === 429) return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
  return networkMessage;
}

/** Register screen: API start errors carry a status, Firebase errors carry a code. */
export function phoneSendErrorMessage(error: unknown): string {
  return firebaseErrorCode(error) ? firebasePhoneErrorMessage(error) : phoneSignupStartErrorMessage(error);
}

/** POST /v1/auth/phone-signup {action:"reset-start"} failures (never reveals whether the phone has an account). */
export function phoneResetStartErrorMessage(error: unknown): string {
  const status = errorStatus(error);
  if (status === 400) return invalidLocalPhoneMessage;
  if (status === 403) return "Khôi phục bằng SMS đang tạm tắt. Hãy dùng email.";
  if (status === 429) {
    const message = error instanceof Error ? error.message : "";
    return /limit reached/i.test(message)
      ? "Hôm nay PicKet đã gửi đủ SMS. Hãy thử lại vào ngày mai hoặc dùng email."
      : "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
  }
  return networkMessage;
}

/** Forgot-password screen: API reset-start errors carry a status, Firebase errors carry a code. */
export function phoneResetSendErrorMessage(error: unknown): string {
  return firebaseErrorCode(error) ? firebasePhoneErrorMessage(error) : phoneResetStartErrorMessage(error);
}

export const phoneNotRegisteredMessage = "Không tìm thấy tài khoản dùng số này.";

/** POST /v1/auth/phone-signup {action:"reset"} failures. */
export function phoneResetErrorMessage(error: unknown): string {
  if (isPhoneCodeRestartError(error)) return codeRestartMessage;
  const status = errorStatus(error);
  if (status === 400) return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
  if (status === 401) return "Phiên xác thực số điện thoại đã hết hạn. Hãy gửi lại mã.";
  if (status === 403) return "Khôi phục bằng SMS đang tạm tắt. Hãy dùng email.";
  if (status === 404) return phoneNotRegisteredMessage;
  if (status === 429) return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
  return networkMessage;
}

/** Phone-flow failures after the code that must start again from the phone step. */
export function phoneFlowRestartsFromPhone(error: unknown): boolean {
  const status = errorStatus(error);
  return isPhoneCodeRestartError(error) || status === 401 || status === 404;
}

/**
 * POST /v1/auth/email-signup {action:"start"} failure: the message that stops the
 * sign-up, or null to send the code anyway. Only answers the server meant
 * (taken address, limits, switched off, invalid) stop it; an unreachable or older
 * API must not block email sign-up.
 */
export function emailSignupStartBlockMessage(error: unknown): string | null {
  switch (errorStatus(error)) {
    case 400:
      return "Email không hợp lệ.";
    case 403:
      return "Đăng ký bằng email đang tạm tắt. Hãy thử cách khác.";
    case 409:
      return emailAlreadyRegisteredMessage;
    case 429:
      return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
    default:
      return null;
  }
}
