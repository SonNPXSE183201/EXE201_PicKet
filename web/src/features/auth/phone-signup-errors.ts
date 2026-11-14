/** Vietnamese messages for SMS sign-up (Firebase Phone Auth + POST /v1/auth/phone-signup). */
const firebaseMessages: Record<string, string> = {
  "auth/invalid-phone-number": "Số điện thoại không hợp lệ.",
  "auth/missing-phone-number": "Nhập số điện thoại của bạn.",
  "auth/too-many-requests": "Bạn thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.",
  "auth/quota-exceeded": "Hệ thống tạm hết lượt gửi SMS. Vui lòng thử lại sau hoặc đăng ký bằng email.",
  "auth/invalid-verification-code": "Mã xác minh không đúng. Kiểm tra lại tin nhắn.",
  "auth/missing-verification-code": "Nhập đủ 6 chữ số trong tin nhắn.",
  "auth/code-expired": "Mã xác minh đã hết hạn. Hãy gửi lại mã mới.",
  "auth/session-expired": "Mã xác minh đã hết hạn. Hãy gửi lại mã mới.",
  "auth/operation-not-allowed": "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.",
  "auth/captcha-check-failed": "Xác minh chống bot không thành công. Tải lại trang rồi thử lại.",
  "auth/network-request-failed": "Không thể kết nối. Kiểm tra mạng rồi thử lại.",
};

export function firebasePhoneErrorMessage(error: unknown): string {
  const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "";
  return firebaseMessages[code] ?? "Chưa gửi được mã qua SMS. Vui lòng thử lại.";
}

function status(error: unknown): number {
  const value = (error as { status?: unknown })?.status;
  return typeof value === "number" ? value : 0;
}

function apiMessage(error: unknown): string {
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" ? message : "";
}

export const CODE_RESTART_MESSAGE = "Mã đã hết hạn, hãy gửi lại mã.";

/** 403 "Request a new code first.": no `start`/`reset-start` within 15 minutes (or already used). Restart from the phone step. */
export function isPhoneCodeRestartError(error: unknown): boolean {
  return status(error) === 403 && /request a new code/i.test(apiMessage(error));
}

/** Errors from `phoneSignupStart`. */
export function phoneSignupStartErrorMessage(error: unknown): string {
  switch (status(error)) {
    case 403: return "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.";
    case 409: return "Số điện thoại đã được đăng ký. Hãy đăng nhập.";
    case 429: return "Đã đạt giới hạn gửi SMS. Vui lòng thử lại sau.";
    case 400: return "Số điện thoại không hợp lệ.";
    default: return "Không thể kết nối. Kiểm tra mạng rồi thử lại.";
  }
}

/** Errors from `phoneSignupComplete`. */
export function phoneSignupCompleteErrorMessage(error: unknown): string {
  if (isPhoneCodeRestartError(error)) return CODE_RESTART_MESSAGE;
  switch (status(error)) {
    case 400: return "Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";
    case 401: return "Phiên xác minh số điện thoại đã hết hạn. Hãy gửi lại mã.";
    case 403: return "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.";
    case 409: return "Số điện thoại đã được đăng ký. Hãy đăng nhập.";
    case 429: return "Bạn thử quá nhiều lần. Vui lòng chờ một lát.";
    default: return "Không thể tạo tài khoản. Kiểm tra mạng rồi thử lại.";
  }
}

/** Errors from `phoneResetStart` (the API never reveals whether the phone has an account here). */
export function phoneResetStartErrorMessage(error: unknown): string {
  switch (status(error)) {
    case 403: return "Khôi phục bằng SMS đang tạm tắt. Hãy dùng email.";
    case 429: return "Đã đạt giới hạn gửi SMS. Vui lòng thử lại sau.";
    case 400: return "Số điện thoại không hợp lệ.";
    default: return "Không thể kết nối. Kiểm tra mạng rồi thử lại.";
  }
}

/** Errors from `phoneReset`. */
export function phoneResetErrorMessage(error: unknown): string {
  if (isPhoneCodeRestartError(error)) return CODE_RESTART_MESSAGE;
  switch (status(error)) {
    case 400: return "Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.";
    case 401: return "Phiên xác minh số điện thoại đã hết hạn. Hãy gửi lại mã.";
    case 403: return "Khôi phục bằng SMS đang tạm tắt. Hãy dùng email.";
    case 404: return "Không tìm thấy tài khoản dùng số này.";
    case 429: return "Bạn thử quá nhiều lần. Vui lòng chờ một lát.";
    default: return "Không thể đặt lại mật khẩu. Kiểm tra mạng rồi thử lại.";
  }
}

/** SMS recovery failures that send the user back to the phone step (new code needed, or no account). */
export function phoneResetRestartsFromPhone(error: unknown): boolean {
  return isPhoneCodeRestartError(error) || status(error) === 404;
}
