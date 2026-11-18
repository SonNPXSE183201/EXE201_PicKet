import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";

import { routes } from "@/core/navigation/routes";
import { useAuth } from "./auth-context";
import { authErrorMessage } from "./auth-errors";
import {
  AuthButton,
  AuthCard,
  AuthDivider,
  AuthError,
  AuthFieldRow,
  AuthHero,
  AuthLink,
  AuthNote,
  AuthPage,
  PasswordRuleList,
  PasswordVisibilityToggle,
} from "./auth-figma";
import { newPasswordIssue } from "./password-rules";
import { createPasswordMode } from "./password-setup-gate";
import { phoneFlow, usePhoneFlow, type PhoneFlowPurpose } from "./phone-signup-store";
import { phoneFlowRestartsFromPhone, phoneResetErrorMessage, phoneSignupCompleteErrorMessage } from "./signup-errors";

/**
 * Last sign-up step after the OTP. "session": email OTP account (signed in,
 * flagged for setup; rendered by the root gate). "phone": verified SMS
 * sign-up that creates the account with this password. With purpose "reset":
 * new password after SMS password recovery.
 */
export function CreatePasswordScreen({ purpose = "signup" }: { purpose?: PhoneFlowPurpose }) {
  const { passwordSetupRequired, session, completePasswordSetup, signOut } = useAuth();
  const phoneState = usePhoneFlow(purpose);
  const flow = phoneFlow(purpose);
  const resetting = purpose === "reset";
  const resetDone = resetting && phoneState.step === "completed";
  const mode = resetting
    ? (!session && (phoneState.step === "verified" || resetDone) ? "phone" : "none")
    : createPasswordMode({
      sessionRequiresSetup: passwordSetupRequired,
      hasSession: session !== null,
      // "completed": the account exists and its session is being applied; the auth
      // layout leaves for home once it lands (no flash back to the register screen).
      phoneVerified: phoneState.step === "verified" || phoneState.step === "completed",
    });
  const startRoute = resetting ? routes.forgotPassword : routes.register;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [busy, setBusy] = useState<"save" | "leave" | null>(null);
  const running = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  // The server needs a new start (expired, used, unknown phone): only "send again" remains.
  const [restart, setRestart] = useState(false);

  if (mode === "none") return <Redirect href={session ? routes.home : startRoute} />;

  async function submit() {
    if (running.current) return;
    const issue = newPasswordIssue(password, confirmation);
    setMismatch(issue === "Mật khẩu xác nhận không khớp.");
    if (issue) return setMessage(issue);
    running.current = true;
    setBusy("save");
    setMessage(null);
    try {
      if (mode === "session") {
        // Clearing the flag re-renders the root layout into the app.
        await completePasswordSetup(password);
      } else {
        // Sign-up applies the new session; recovery shows the success state below.
        await flow.complete(password);
      }
      // SMS success: stay busy until the auth layout leaves for home (no second submit).
      if (mode === "session") {
        running.current = false;
        setBusy(null);
      }
    } catch (error) {
      if (mode === "session") setMessage(authErrorMessage(error));
      else {
        setMessage(resetting ? phoneResetErrorMessage(error) : phoneSignupCompleteErrorMessage(error));
        setRestart(phoneFlowRestartsFromPhone(error));
      }
      running.current = false;
      setBusy(null);
    }
  }

  function leave() {
    if (running.current) return;
    if (mode === "phone") {
      flow.reset();
      router.replace(startRoute);
      return;
    }
    running.current = true;
    setBusy("leave");
    void signOut()
      .catch((error) => setMessage(authErrorMessage(error)))
      .finally(() => {
        running.current = false;
        setBusy(null);
      });
  }

  if (resetDone) {
    return (
      <AuthPage
        footer={<AuthButton label="Đăng nhập" onPress={() => {
          phoneFlow("reset").reset();
          router.replace(routes.login);
        }} />}
      >
        <AuthHero title={["Mật khẩu", "mới"]} subtitle="Đã đặt lại mật khẩu. Hãy đăng nhập bằng số điện thoại và mật khẩu mới." />
      </AuthPage>
    );
  }

  return (
    <AuthPage
      footer={<>
        {restart
          ? <AuthButton label="Gửi lại mã" onPress={leave} />
          : <AuthButton busy={busy === "save"} disabled={busy !== null} label={resetting ? "Đặt lại mật khẩu" : "Hoàn tất"} onPress={() => void submit()} />}
        <AuthLink disabled={busy !== null} label={mode === "session" ? "Đăng xuất" : resetting ? "Quay lại" : "Hủy đăng ký"} onPress={leave} />
      </>}
    >
      <AuthHero title={["Mật khẩu", "mới"]} subtitle={resetting ? "Đặt mật khẩu mới cho tài khoản của bạn." : "Đặt một mật khẩu bạn dễ nhớ."} />
      <AuthCard>
        <AuthFieldRow
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={busy === null}
          icon="lock-outline"
          label="Mật khẩu mới"
          onChangeText={setPassword}
          secureTextEntry={!visible}
          textContentType="newPassword"
          trailing={<PasswordVisibilityToggle visible={visible} onToggle={() => setVisible(!visible)} />}
          value={password}
        />
        <AuthDivider />
        <AuthFieldRow
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={busy === null}
          icon="lock-outline"
          invalid={mismatch}
          label="Nhập lại mật khẩu"
          onChangeText={(value) => {
            setConfirmation(value);
            setMismatch(false);
          }}
          onSubmitEditing={() => void submit()}
          secureTextEntry={!confirmVisible}
          textContentType="newPassword"
          trailing={<PasswordVisibilityToggle visible={confirmVisible} onToggle={() => setConfirmVisible(!confirmVisible)} />}
          value={confirmation}
        />
      </AuthCard>
      <AuthError>{message}</AuthError>
      {busy === "save" ? (
        <AuthNote>{resetting ? "Đang đặt lại mật khẩu…" : mode === "phone" ? "Đang tạo tài khoản…" : "Đang lưu mật khẩu…"}</AuthNote>
      ) : null}
      <PasswordRuleList password={password} />
    </AuthPage>
  );
}
