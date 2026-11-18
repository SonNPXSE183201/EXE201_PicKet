import assert from "node:assert/strict";
import test from "node:test";

import { newPasswordIssue, passwordMeetsRules, passwordRuleChecks } from "./password-rules";
import { createPasswordMode, isPasswordSetupRequiredError, requiresPasswordSetup } from "./password-setup-gate";
import { formatVietnamPhone, sanitizeLocalPhoneInput, vietnamPhoneToE164 } from "./phone-input";
import {
  availableSignupMethods,
  createSignupVerificationLoader,
  emailOnlyVerification,
  parseSignupVerification,
} from "./signup-channels";
import {
  firebasePhoneErrorMessage,
  isExpiredCodeError,
  isWrongCodeError,
  codeRestartMessage,
  isPhoneCodeRestartError,
  phoneFlowRestartsFromPhone,
  phoneResetErrorMessage,
  phoneResetSendErrorMessage,
  phoneResetStartErrorMessage,
  phoneSendErrorMessage,
  phoneSignupCompleteErrorMessage,
  phoneSignupStartErrorMessage,
} from "./signup-errors";
import {
  canSubmitOtp,
  formatCountdown,
  initialOtpState,
  otpMaxAttempts,
  otpReducer,
  otpResendCooldownMs,
  resendSecondsLeft,
} from "./otp-state";

test("password rules follow the API policy, including every listed symbol", () => {
  assert.deepEqual(passwordRuleChecks(""), { length: false, mixedCase: false, digit: false, symbol: false });
  assert.deepEqual(passwordRuleChecks("Picketpassword1"), { length: true, mixedCase: true, digit: true, symbol: false });
  for (const symbol of "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~") {
    assert.equal(passwordMeetsRules(`Picketpass12${symbol}`), true, symbol);
  }
  assert.equal(passwordMeetsRules("Picketpass12 "), false);
  assert.equal(newPasswordIssue("Short1!", "Short1!"), "Mật khẩu cần ít nhất 12 ký tự.");
  assert.equal(newPasswordIssue("picketpassword1!", "picketpassword1!"), "Mật khẩu cần chữ hoa, chữ thường, chữ số và ký tự đặc biệt.");
  assert.equal(newPasswordIssue("PicketPassword1!", "PicketPassword1?"), "Mật khẩu xác nhận không khớp.");
  assert.equal(newPasswordIssue("PicketPassword1!", "PicketPassword1!"), null);
});

test("password setup gate only holds flagged sessions", () => {
  assert.equal(requiresPasswordSetup(null), false);
  assert.equal(requiresPasswordSetup({ user: { user_metadata: {} } }), false);
  assert.equal(requiresPasswordSetup({ user: { user_metadata: { password_setup_required: "true" } } }), false);
  assert.equal(requiresPasswordSetup({ user: { user_metadata: { password_setup_required: false } } }), false);
  assert.equal(requiresPasswordSetup({ user: { user_metadata: { password_setup_required: true } } }), true);
  assert.equal(createPasswordMode({ sessionRequiresSetup: true, hasSession: true, phoneVerified: true }), "session");
  assert.equal(createPasswordMode({ sessionRequiresSetup: false, hasSession: false, phoneVerified: true }), "phone");
  assert.equal(createPasswordMode({ sessionRequiresSetup: false, hasSession: true, phoneVerified: true }), "none");
  assert.equal(createPasswordMode({ sessionRequiresSetup: false, hasSession: false, phoneVerified: false }), "none");
});

test("sign-up channels fall back to email and hide SMS without Firebase", () => {
  assert.deepEqual(parseSignupVerification(null), emailOnlyVerification);
  assert.deepEqual(parseSignupVerification({ email: true, sms: true }), emailOnlyVerification);
  assert.deepEqual(parseSignupVerification({ verification: { email: false, sms: false } }), emailOnlyVerification);
  assert.deepEqual(parseSignupVerification({ verification: { email: true, sms: true, smsProvider: "firebase" } }), { email: true, sms: true });
  assert.deepEqual(parseSignupVerification({ verification: { email: false, sms: true } }), { email: false, sms: true });
  assert.deepEqual(availableSignupMethods({ email: true, sms: true }, true), ["email", "phone"]);
  assert.deepEqual(availableSignupMethods({ email: true, sms: true }, false), ["email"]);
  assert.deepEqual(availableSignupMethods({ email: false, sms: true }, true), ["phone"]);
  assert.deepEqual(availableSignupMethods({ email: false, sms: true }, false), ["email"]);
  assert.deepEqual(availableSignupMethods({ email: true, sms: false }, true), ["email"]);
});

test("sign-up channel settings are cached briefly and errors mean email only", async () => {
  let now = 0;
  let calls = 0;
  const load = createSignupVerificationLoader(() => now, 1000);
  const api = { authChannels: async () => { calls++; return { verification: { email: true, sms: true } }; } };
  assert.deepEqual(await load(api), { email: true, sms: true });
  assert.deepEqual(await load(api), { email: true, sms: true });
  assert.equal(calls, 1);
  now = 1001;
  await load(api);
  assert.equal(calls, 2);
  const failing = createSignupVerificationLoader(() => 0);
  assert.deepEqual(await failing({ authChannels: () => Promise.reject(new Error("offline")) }), emailOnlyVerification);
  assert.deepEqual(await failing(null), emailOnlyVerification);
});

test("Vietnamese phone input becomes E.164 for Firebase and the API", () => {
  assert.equal(vietnamPhoneToE164("912345678"), "+84912345678");
  assert.equal(vietnamPhoneToE164("0912 345 678"), "+84912345678");
  assert.equal(vietnamPhoneToE164("84912345678"), "+84912345678");
  assert.equal(vietnamPhoneToE164("91234567"), null);
  assert.equal(vietnamPhoneToE164("212345678"), null);
  assert.equal(vietnamPhoneToE164(""), null);
  assert.equal(sanitizeLocalPhoneInput("0912-345-678abc"), "0912345678");
  assert.equal(formatVietnamPhone("+84912345678"), "+84 912 345 678");
  assert.equal(formatVietnamPhone("+14155550100"), "+14155550100");
});

test("Firebase and API sign-up errors map to Vietnamese copy", () => {
  assert.equal(firebasePhoneErrorMessage({ code: "auth/invalid-phone-number" }), "Số điện thoại chưa đúng. Kiểm tra lại 10 số.");
  assert.equal(firebasePhoneErrorMessage({ code: "auth/too-many-requests" }), "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.");
  assert.equal(firebasePhoneErrorMessage({ code: "auth/quota-exceeded" }), "Hệ thống SMS đang quá tải. Hãy thử lại sau hoặc đăng ký bằng email.");
  assert.equal(firebasePhoneErrorMessage({ code: "auth/session-expired" }), "Mã đã hết hạn. Hãy gửi lại mã.");
  assert.equal(firebasePhoneErrorMessage({ code: "auth/operation-not-allowed" }), "Đăng ký bằng số điện thoại chưa được bật. Hãy đăng ký bằng email.");
  assert.match(firebasePhoneErrorMessage({ code: "auth/missing-client-identifier" }), /xác minh được ứng dụng/);
  assert.equal(firebasePhoneErrorMessage(new Error("x")), "Không gửi được mã SMS. Vui lòng thử lại.");
  assert.equal(isWrongCodeError({ code: "auth/invalid-verification-code" }), true);
  assert.equal(isWrongCodeError({ code: "otp_expired" }), true);
  assert.equal(isExpiredCodeError({ code: "auth/session-expired" }), true);
  assert.equal(phoneSignupStartErrorMessage({ status: 409 }), "Số điện thoại đã được đăng ký. Hãy đăng nhập.");
  assert.equal(phoneSignupStartErrorMessage({ status: 403 }), "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.");
  assert.match(phoneSignupStartErrorMessage(Object.assign(new Error("SMS limit reached for today."), { status: 429 })), /đã gửi đủ SMS/);
  assert.equal(phoneSignupStartErrorMessage(Object.assign(new Error("Too many requests."), { status: 429 })), "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.");
  assert.equal(phoneSendErrorMessage({ code: "auth/quota-exceeded", status: 0 }), "Hệ thống SMS đang quá tải. Hãy thử lại sau hoặc đăng ký bằng email.");
  assert.equal(phoneSendErrorMessage({ status: 409 }), "Số điện thoại đã được đăng ký. Hãy đăng nhập.");
  assert.equal(phoneSignupCompleteErrorMessage({ status: 400 }), "Mật khẩu chưa đáp ứng yêu cầu bảo mật.");
  assert.equal(phoneSignupCompleteErrorMessage({ status: 409 }), "Số điện thoại đã được đăng ký. Hãy đăng nhập.");
  assert.match(phoneSignupCompleteErrorMessage({ status: 401 }), /hết hạn/);
});

test("OTP step counts wrong codes, locks, and resets on resend", () => {
  let state = initialOtpState(1000);
  assert.equal(resendSecondsLeft(state, 1000), otpResendCooldownMs / 1000);
  assert.equal(formatCountdown(45), "0:45");
  state = otpReducer(state, { type: "input", value: "12a34" });
  assert.equal(state.code, "1234");
  assert.equal(canSubmitOtp(state), false);
  state = otpReducer(state, { type: "input", value: "1234567" });
  assert.equal(state.code, "123456");
  state = otpReducer(state, { type: "submit" });
  assert.equal(state.status, "verifying");
  assert.equal(otpReducer(state, { type: "submit" }), state, "double submit is ignored");
  for (let left = otpMaxAttempts - 1; left >= 0; left--) {
    state = otpReducer(state, { type: "wrongCode" });
    assert.equal(state.attemptsLeft, left);
    assert.equal(state.error, "wrong");
    if (left > 0) state = otpReducer(state, { type: "submit" });
  }
  assert.equal(state.status, "locked");
  assert.equal(otpReducer(state, { type: "submit" }), state);
  state = otpReducer(state, { type: "resent", now: 5000 });
  assert.equal(state.attemptsLeft, otpMaxAttempts);
  assert.equal(state.status, "editing");
  assert.equal(state.code, "");
  assert.equal(resendSecondsLeft(state, 5000 + otpResendCooldownMs), 0);
  state = otpReducer(otpReducer(otpReducer(state, { type: "input", value: "654321" }), { type: "submit" }), { type: "verified" });
  assert.equal(otpReducer(state, { type: "wrongCode" }), state);
  assert.equal(otpReducer(state, { type: "input", value: "1" }), state);
});

test("server 'Password setup required' opens create-password for that owner only", () => {
  const session = { user: { id: "owner-a", user_metadata: {} } };
  assert.equal(requiresPasswordSetup(session), false);
  assert.equal(requiresPasswordSetup(session, "owner-a"), true);
  assert.equal(requiresPasswordSetup(session, "owner-b"), false);
  assert.equal(requiresPasswordSetup(null, "owner-a"), false);
  assert.equal(requiresPasswordSetup({ user: { id: "owner-a", user_metadata: { password_setup_required: true } } }, null), true);
  const apiError = Object.assign(new Error("Password setup required"), { status: 403, details: { error: "Password setup required" } });
  assert.equal(isPasswordSetupRequiredError(apiError), true);
  assert.equal(isPasswordSetupRequiredError({ status: 403, message: "Forbidden", details: { error: "Password setup required" } }), true);
  assert.equal(isPasswordSetupRequiredError(Object.assign(new Error("Password setup required"), { status: 401 })), false);
  assert.equal(isPasswordSetupRequiredError(Object.assign(new Error("Account locked"), { status: 403 })), false);
  assert.equal(isPasswordSetupRequiredError(null), false);
});

test("phone flow errors: 403 'Request a new code first.' restarts, recovery maps 404", () => {
  const restart = Object.assign(new Error("Request a new code first."), { status: 403 });
  const disabled = Object.assign(new Error("SMS verification is disabled."), { status: 403 });
  assert.equal(isPhoneCodeRestartError(restart), true);
  assert.equal(isPhoneCodeRestartError(disabled), false);
  assert.equal(codeRestartMessage, "Mã đã hết hạn, hãy gửi lại mã.");
  assert.equal(phoneSignupCompleteErrorMessage(restart), codeRestartMessage);
  assert.equal(phoneSignupCompleteErrorMessage(disabled), "Đăng ký bằng SMS đang tạm tắt. Hãy đăng ký bằng email.");
  assert.equal(phoneResetErrorMessage(restart), codeRestartMessage);
  assert.equal(phoneResetErrorMessage(Object.assign(new Error("No account uses this phone."), { status: 404 })), "Không tìm thấy tài khoản dùng số này.");
  assert.equal(phoneResetErrorMessage(Object.assign(new Error("Invalid phone verification."), { status: 401 })), "Phiên xác thực số điện thoại đã hết hạn. Hãy gửi lại mã.");
  assert.equal(phoneResetErrorMessage(disabled), "Khôi phục bằng SMS đang tạm tắt. Hãy dùng email.");
  assert.equal(phoneResetStartErrorMessage(Object.assign(new Error("SMS limit reached for today."), { status: 429 })), "Hôm nay PicKet đã gửi đủ SMS. Hãy thử lại vào ngày mai hoặc dùng email.");
  assert.equal(phoneResetSendErrorMessage({ code: "auth/quota-exceeded" }), firebasePhoneErrorMessage({ code: "auth/quota-exceeded" }));
  assert.equal(phoneSendErrorMessage({ code: "instant-unavailable" }), "Chưa xác minh tự động được số này. Hãy gửi lại mã.");
  assert.equal(phoneFlowRestartsFromPhone(restart), true);
  assert.equal(phoneFlowRestartsFromPhone({ status: 401 }), true);
  assert.equal(phoneFlowRestartsFromPhone({ status: 404 }), true);
  assert.equal(phoneFlowRestartsFromPhone(disabled), false);
  assert.equal(phoneFlowRestartsFromPhone({ status: 400 }), false);
});
