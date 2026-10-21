import { router } from "expo-router";
import { useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage, validateEmail } from "@/features/auth/auth-errors";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton, TextLink } from "@/features/auth/auth-screen";

export default function LoginScreen() {
  const { configured, enterLocalMode, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"password" | "google" | "guest" | null>(null);
  const pendingRef = useRef(false);
  const busy = pending !== null;
  const [message, setMessage] = useState<string | null>(
    configured ? null : "Đăng nhập chưa sẵn sàng. Bạn vẫn có thể sử dụng trên thiết bị.",
  );

  async function run(kind: "password" | "google", action: () => Promise<void>) {
    if (pendingRef.current || !configured) return;
    pendingRef.current = true;
    setPending(kind);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  function submit() {
    const issue = validateEmail(email);
    if (issue) return setMessage(issue);
    void run("password", () => signIn(email, password));
  }

  return (
    <AuthScreen title="Chào mừng trở lại" subtitle="Đăng nhập để đồng bộ, hoặc lưu nhật ký riêng trên điện thoại.">
      <AuthField autoCapitalize="none" autoComplete="email" editable={!busy} keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
      <AuthField autoCapitalize="none" autoComplete="current-password" editable={!busy} onChangeText={setPassword} onSubmitEditing={submit} placeholder="Mật khẩu" secureTextEntry value={password} />
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={pending === "password"} disabled={busy} label="Đăng nhập" onPress={submit} />
      <PrimaryButton busy={pending === "google"} disabled={busy} label="Tiếp tục với Google" onPress={() => void run("google", signInWithGoogle)} />
      <TextLink label="Dùng trên thiết bị, không cần đăng nhập" onPress={() => {
        if (pendingRef.current) return;
        pendingRef.current = true; setPending("guest");
        void enterLocalMode().then(() => router.replace(routes.home)).catch((error) => setMessage(authErrorMessage(error))).finally(() => { pendingRef.current = false; setPending(null); });
      }} />
      <TextLink label="Quên mật khẩu?" onPress={() => router.push(routes.forgotPassword)} />
      <TextLink label="Chưa có tài khoản? Đăng ký" onPress={() => router.push(routes.register)} />
    </AuthScreen>
  );
}
