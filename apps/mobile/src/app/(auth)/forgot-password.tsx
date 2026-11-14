import { router } from "expo-router";
import { useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage, validateEmail } from "@/features/auth/auth-errors";
import { MethodChips } from "@/features/auth/auth-figma";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton, TextLink } from "@/features/auth/auth-screen";
import { invalidLocalPhoneMessage, sanitizeLocalPhoneInput, vietnamPhoneToE164 } from "@/features/auth/phone-input";
import { phoneReset } from "@/features/auth/phone-signup-store";
import { phoneResetSendErrorMessage } from "@/features/auth/signup-errors";
import { useSignupMethods } from "@/features/auth/signup-verification-store";

type RecoveryMethod = "email" | "phone";
const methodLabels: Record<RecoveryMethod, string> = { email: "Email", phone: "Số điện thoại" };

/**
 * Email: Supabase reset link (unchanged). Phone (SMS enabled by admins and
 * Firebase available): reset-start → Firebase code → new password → reset.
 */
export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const { methods } = useSignupMethods();
  const smsAvailable = methods.includes("phone");
  const [method, setMethod] = useState<RecoveryMethod>("email");
  const activeMethod: RecoveryMethod = smsAvailable ? method : "email";
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  function changeMethod(next: RecoveryMethod) {
    setMethod(next);
    setMessage(null);
  }

  async function submitEmail() {
    const issue = validateEmail(email);
    if (issue) return setMessage(issue);
    setBusy(true);
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setMessage("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.");
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitPhone() {
    if (running.current) return;
    const destination = vietnamPhoneToE164(phone);
    if (!destination) return setMessage(invalidLocalPhoneMessage);
    running.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await phoneReset.start(destination);
      // Android instant verification needs no code: go straight to the new password.
      if (phoneReset.snapshot().step === "verified") router.push(routes.resetPasswordByPhone);
      else router.push(routes.verifyCode("phone", destination, "reset"));
    } catch (error) {
      setMessage(phoneResetSendErrorMessage(error));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  const phoneMode = activeMethod === "phone";
  const submit = () => void (phoneMode ? submitPhone() : submitEmail());
  return (
    <AuthScreen
      title="Quên mật khẩu"
      subtitle={phoneMode ? "Nhập số điện thoại để nhận mã 6 số qua SMS." : "Nhập email để nhận liên kết đặt lại mật khẩu."}
    >
      {smsAvailable && (
        <MethodChips
          disabled={busy}
          onChange={changeMethod}
          options={(["email", "phone"] as const).map((value) => ({ value, label: methodLabels[value] }))}
          value={activeMethod}
        />
      )}
      {phoneMode ? (
        <AuthField autoComplete="tel" editable={!busy} keyboardType="phone-pad" onChangeText={(value) => setPhone(sanitizeLocalPhoneInput(value))} onSubmitEditing={submit} placeholder="Số điện thoại" textContentType="telephoneNumber" value={phone} />
      ) : (
        <AuthField autoCapitalize="none" autoComplete="email" editable={!busy} keyboardType="email-address" onChangeText={setEmail} onSubmitEditing={submit} placeholder="Email" value={email} />
      )}
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={busy} label={phoneMode ? "Gửi mã xác thực" : "Gửi hướng dẫn"} onPress={submit} />
      <TextLink label="Quay lại đăng nhập" onPress={() => router.replace(routes.login)} />
    </AuthScreen>
  );
}
