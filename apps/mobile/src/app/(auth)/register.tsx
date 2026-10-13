import { router } from "expo-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage, validateEmail, validatePassword } from "@/features/auth/auth-errors";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton, TextLink } from "@/features/auth/auth-screen";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const issue = validateEmail(email) ?? validatePassword(password);
    if (issue) return setMessage(issue);
    if (password !== confirmation) return setMessage("Mật khẩu xác nhận không khớp.");
    setBusy(true);
    setMessage(null);
    try {
      const requiresVerification = await signUp(email, password);
      if (requiresVerification) {
        router.replace(routes.verifyEmail(email.trim().toLowerCase()));
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="Tạo tài khoản Picket" subtitle="Bắt đầu hành trình tài chính của riêng bạn.">
      <AuthField autoCapitalize="none" autoComplete="email" editable={!busy} keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
      <AuthField autoCapitalize="none" autoComplete="new-password" editable={!busy} onChangeText={setPassword} placeholder="Mật khẩu" secureTextEntry value={password} />
      <AuthField autoCapitalize="none" editable={!busy} onChangeText={setConfirmation} onSubmitEditing={() => void submit()} placeholder="Nhập lại mật khẩu" secureTextEntry value={confirmation} />
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={busy} label="Đăng ký" onPress={() => void submit()} />
      <TextLink label="Đã có tài khoản? Đăng nhập" onPress={() => router.replace(routes.login)} />
    </AuthScreen>
  );
}
