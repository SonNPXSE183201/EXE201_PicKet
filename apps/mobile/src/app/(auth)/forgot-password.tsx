import { router } from "expo-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage, validateEmail } from "@/features/auth/auth-errors";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton, TextLink } from "@/features/auth/auth-screen";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
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

  return (
    <AuthScreen title="Quên mật khẩu" subtitle="Nhập email để nhận liên kết đặt lại mật khẩu.">
      <AuthField autoCapitalize="none" autoComplete="email" editable={!busy} keyboardType="email-address" onChangeText={setEmail} onSubmitEditing={() => void submit()} placeholder="Email" value={email} />
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={busy} label="Gửi hướng dẫn" onPress={() => void submit()} />
      <TextLink label="Quay lại đăng nhập" onPress={() => router.replace(routes.login)} />
    </AuthScreen>
  );
}
