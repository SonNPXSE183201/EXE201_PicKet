import { router } from "expo-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage, validatePassword } from "@/features/auth/auth-errors";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton } from "@/features/auth/auth-screen";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const issue = validatePassword(password);
    if (issue) return setMessage(issue);
    if (password !== confirmation) return setMessage("Mật khẩu xác nhận không khớp.");
    setBusy(true);
    setMessage(null);
    try {
      await updatePassword(password);
      router.replace(routes.home);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="Đặt mật khẩu mới" subtitle="Dùng ít nhất 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.">
      <AuthField autoCapitalize="none" autoComplete="new-password" editable={!busy} onChangeText={setPassword} placeholder="Mật khẩu mới" secureTextEntry value={password} />
      <AuthField autoCapitalize="none" editable={!busy} onChangeText={setConfirmation} onSubmitEditing={() => void submit()} placeholder="Nhập lại mật khẩu" secureTextEntry value={confirmation} />
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={busy} label="Cập nhật mật khẩu" onPress={() => void submit()} />
    </AuthScreen>
  );
}
