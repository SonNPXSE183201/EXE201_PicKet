import { router } from "expo-router";
import { useRef, useState } from "react";
import { normalizePhoneNumber } from "@picket/domain";
import { routes } from "@/core/navigation/routes";
import { useAuth } from "@/features/auth/auth-context";
import { authErrorMessage, validateEmail, validatePassword } from "@/features/auth/auth-errors";
import { AuthField, AuthMessage, AuthScreen, PrimaryButton, TextLink } from "@/features/auth/auth-screen";

type Mode = "email" | "phone";

/**
 * Sign-up with email, or with a phone number plus email. Today the one-time
 * code is sent to the email (Gmail OTP via Supabase Auth); once an SMS
 * provider is enabled the phone can be confirmed by SMS as well.
 */
export default function RegisterScreen() {
  const { configured, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("email");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState<string | null>(
    configured ? null : "Đăng nhập chưa sẵn sàng. Bạn vẫn có thể sử dụng trên thiết bị.",
  );

  async function submit() {
    if (running.current || !configured) return;
    let normalizedPhone: string | undefined;
    if (mode === "phone") {
      try {
        normalizedPhone = normalizePhoneNumber(phone);
      } catch {
        return setMessage("Số điện thoại không hợp lệ.");
      }
    }
    const invalid = validateEmail(email) ?? validatePassword(password);
    if (invalid) return setMessage(invalid);
    running.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const needsCode = await signUp(email, password, normalizedPhone);
      if (needsCode) router.replace(routes.verifyEmail(email.trim().toLowerCase()));
      else router.replace(routes.home);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Tạo tài khoản Picket"
      subtitle={
        mode === "phone"
          ? "Đăng ký bằng số điện thoại. Mã xác minh sẽ được gửi tới email của bạn."
          : "Mã xác minh sẽ được gửi tới email của bạn."
      }
    >
      <TextLink
        label={mode === "email" ? "Đăng ký bằng số điện thoại" : "Đăng ký chỉ bằng email"}
        onPress={() => {
          setMode(mode === "email" ? "phone" : "email");
          setMessage(null);
        }}
      />
      {mode === "phone" && (
        <AuthField
          autoComplete="tel"
          editable={!busy}
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="Số điện thoại"
          value={phone}
        />
      )}
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={!busy}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="new-password"
        editable={!busy}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        placeholder="Mật khẩu (ít nhất 12 ký tự)"
        secureTextEntry
        value={password}
      />
      {message && <AuthMessage>{message}</AuthMessage>}
      <PrimaryButton busy={busy} disabled={busy} label="Đăng ký" onPress={() => void submit()} />
      <PrimaryButton disabled={busy} label="Tiếp tục với Google" onPress={() => void signInWithGoogle().catch((error) => setMessage(authErrorMessage(error)))} />
      <TextLink label="Đã có tài khoản? Đăng nhập" onPress={() => router.replace(routes.login)} />
    </AuthScreen>
  );
}
