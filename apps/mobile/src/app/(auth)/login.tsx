import { router } from "expo-router";
import { useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { passwordLoginCredentials } from "@picket/domain";
import {
  AuthButton,
  AuthCard,
  AuthDivider,
  AuthError,
  AuthFieldRow,
  AuthFooterPrompt,
  AuthHero,
  AuthLink,
  AuthPage,
  PasswordVisibilityToggle,
} from "@/features/auth/auth-figma";

export default function LoginScreen() {
  const { configured, enterLocalMode, signIn, signInWithGoogle } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [invalidIdentifier, setInvalidIdentifier] = useState(false);
  const [pending, setPending] = useState<
    "password" | "google" | "guest" | null
  >(null);
  const pendingRef = useRef(false);
  const busy = pending !== null;
  const [message, setMessage] = useState<string | null>(
    configured
      ? null
      : "Đăng nhập chưa sẵn sàng. Bạn vẫn có thể sử dụng trên thiết bị.",
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
    try {
      passwordLoginCredentials(identifier, password);
    } catch {
      setInvalidIdentifier(true);
      return setMessage("Email hoặc số điện thoại không hợp lệ.");
    }
    setInvalidIdentifier(false);
    void run("password", () => signIn(identifier, password));
  }

  function continueOnDevice() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending("guest");
    void enterLocalMode()
      .then(() => router.replace(routes.home))
      .catch((error) => setMessage(authErrorMessage(error)))
      .finally(() => {
        pendingRef.current = false;
        setPending(null);
      });
  }

  return (
    <AuthPage
      footer={<>
        <AuthLink chevron disabled={busy} label="Dùng trên thiết bị, không cần tài khoản" onPress={continueOnDevice} />
        <AuthFooterPrompt prompt="Chưa có tài khoản?" action="Đăng ký" onPress={() => router.push(routes.register)} />
      </>}
    >
      <AuthHero title={["Chào mừng", "trở lại"]} subtitle="Đăng nhập để đồng bộ dữ liệu." />
      <AuthCard>
        <AuthFieldRow
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
          editable={!busy}
          icon="account-outline"
          invalid={invalidIdentifier}
          keyboardType="default"
          label="Email hoặc số điện thoại"
          onChangeText={(value) => {
            setIdentifier(value);
            setInvalidIdentifier(false);
          }}
          textContentType="username"
          value={identifier}
        />
        <AuthDivider />
        <AuthFieldRow
          autoCapitalize="none"
          autoComplete="current-password"
          editable={!busy}
          icon="lock-outline"
          label="Mật khẩu"
          onChangeText={setPassword}
          onSubmitEditing={submit}
          secureTextEntry={!visible}
          textContentType="password"
          trailing={<PasswordVisibilityToggle visible={visible} onToggle={() => setVisible(!visible)} />}
          value={password}
        />
      </AuthCard>
      <AuthError>{message}</AuthError>
      <AuthButton busy={pending === "password"} disabled={busy} label="Đăng nhập" onPress={submit} />
      <AuthLink disabled={busy} label="Quên mật khẩu?" onPress={() => router.push(routes.forgotPassword)} />
      <AuthButton
        busy={pending === "google"}
        disabled={busy}
        icon="google"
        label="Tiếp tục với Google"
        onPress={() => void run("google", signInWithGoogle)}
        variant="outline"
      />
    </AuthPage>
  );
}
