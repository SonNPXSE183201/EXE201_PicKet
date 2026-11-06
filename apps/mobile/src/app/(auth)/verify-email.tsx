import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton, TextLink } from "@/features/auth/auth-screen";

export default function VerifyEmailScreen() {
  const {t}=useTranslation("auth");
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? "";
  const { resendSignup, verifySignup } = useAuth();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<void>, success?: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (success) setMessage(success);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function verify() {
    if (!/^\d{6,8}$/.test(token.trim())) return setMessage("Mã OTP cần từ 6 đến 8 chữ số.");
    void run(() => verifySignup(email, token));
  }

  return (
    <AuthScreen title="Xác thực email" subtitle={t("verificationDestination",{email:email||t("email của bạn")})}>
      <AuthField editable={!busy} keyboardType="number-pad" maxLength={8} onChangeText={setToken} onSubmitEditing={verify} placeholder="Mã OTP" value={token} />
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={busy} label="Xác thực" onPress={verify} />
      <TextLink label="Gửi lại mã" onPress={() => void run(() => resendSignup(email), "Mã mới đã được gửi.")} />
      <TextLink label="Quay lại đăng nhập" onPress={() => router.replace(routes.login)} />
    </AuthScreen>
  );
}
