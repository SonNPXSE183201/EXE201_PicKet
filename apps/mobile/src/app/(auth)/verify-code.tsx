import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";

import { routes } from "@/core/navigation/routes";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { IconButton } from "@/core/ui/picket-ui";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useAuth } from "@/features/auth/auth-context";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { AuthButton, AuthError, AuthHint, AuthLink, AuthOverline, AuthPage, CodeCard, CodeDigits } from "@/features/auth/auth-figma";
import { canSubmitOtp, formatCountdown, initialOtpState, otpLength, otpReducer, resendSecondsLeft } from "@/features/auth/otp-state";
import { formatVietnamPhone } from "@/features/auth/phone-input";
import { phoneFlow, usePhoneFlow, type PhoneFlowPurpose } from "@/features/auth/phone-signup-store";
import { firebasePhoneErrorMessage, isExpiredCodeError, isWrongCodeError, phoneResetSendErrorMessage, phoneSendErrorMessage } from "@/features/auth/signup-errors";

type Channel = "email" | "phone";

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ channel?: string; destination?: string; purpose?: string }>();
  const channel: Channel = params.channel === "phone" ? "phone" : "email";
  // SMS password recovery reuses this screen (forgot-password → code → new password).
  const purpose: PhoneFlowPurpose = channel === "phone" && params.purpose === "reset" ? "reset" : "signup";
  const destination = params.destination ?? "";
  const phoneState = usePhoneFlow(purpose);
  // A lost SMS session (process restart) cannot be resumed: start again. Checked
  // once so "Đổi số" (which resets the session while leaving) does not redirect twice.
  const [lostPhoneSession] = useState(() => channel === "phone" && phoneState.step === "idle");
  const start = purpose === "reset" ? routes.forgotPassword : routes.register;
  if (!destination || lostPhoneSession) return <Redirect href={start} />;
  return <VerifyCode channel={channel} purpose={purpose} destination={destination}
    autoCode={channel === "phone" ? phoneState.autoCode : null}
    phoneVerified={channel === "phone" && phoneState.step === "verified"} />;
}

function VerifyCode({ channel, purpose, destination, autoCode, phoneVerified }: {
  channel: Channel;
  purpose: PhoneFlowPurpose;
  destination: string;
  autoCode: string | null;
  /** Android instant verification can finish without any code. */
  phoneVerified: boolean;
}) {
  const { t } = useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  const { sendEmailCode, verifyEmailCode } = useAuth();
  const [state, dispatch] = useReducer(otpReducer, undefined, () => initialOtpState(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const verifying = useRef(false);
  const leftForPassword = useRef(false);
  const flow = phoneFlow(purpose);
  const passwordRoute = purpose === "reset" ? routes.resetPasswordByPhone : routes.createPassword;
  const startRoute = purpose === "reset" ? routes.forgotPassword : routes.register;
  const sendErrorMessage = purpose === "reset" ? phoneResetSendErrorMessage : phoneSendErrorMessage;
  const secondsLeft = resendSecondsLeft(state, now);
  const shownDestination = channel === "phone" ? formatVietnamPhone(destination) : destination;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const verify = useCallback(async (code: string) => {
    if (verifying.current || code.length !== otpLength) return;
    verifying.current = true;
    dispatch({ type: "submit" });
    setNotice(null);
    try {
      if (channel === "phone") {
        await flow.confirm(code);
        dispatch({ type: "verified" });
        if (!leftForPassword.current) {
          leftForPassword.current = true;
          router.replace(passwordRoute);
        }
      } else {
        await verifyEmailCode(destination, code);
        // The session is flagged for password setup; the root gate shows create-password.
        dispatch({ type: "verified" });
      }
    } catch (error) {
      if (isWrongCodeError(error)) dispatch({ type: "wrongCode" });
      else if (isExpiredCodeError(error)) dispatch({ type: "expired", message: firebasePhoneErrorMessage(error) });
      else dispatch({ type: "failed", message: channel === "phone" ? firebasePhoneErrorMessage(error) : authErrorMessage(error) });
    } finally {
      verifying.current = false;
    }
  }, [channel, destination, flow, passwordRoute, verifyEmailCode]);

  // Firebase verified the number without a code (Android instant verification).
  useEffect(() => {
    if (!phoneVerified || leftForPassword.current) return;
    leftForPassword.current = true;
    router.replace(passwordRoute);
  }, [phoneVerified, passwordRoute]);

  // Android SMS Retriever: Firebase verified the code on-device.
  useEffect(() => {
    if (!autoCode || state.status === "verified") return;
    dispatch({ type: "input", value: autoCode });
    void verify(autoCode);
  }, [autoCode, state.status, verify]);

  async function resend() {
    if (resending || secondsLeft > 0) return;
    setResending(true);
    setNotice(null);
    try {
      if (channel === "phone") await flow.resend();
      else await sendEmailCode(destination);
      dispatch({ type: "resent", now: Date.now() });
      setNow(Date.now());
      setNotice("Mã mới đã được gửi.");
    } catch (error) {
      dispatch({ type: "failed", message: channel === "phone" ? sendErrorMessage(error) : authErrorMessage(error) });
    } finally {
      setResending(false);
    }
  }

  function changeDestination() {
    if (channel === "phone") flow.reset();
    if (router.canGoBack()) router.back();
    else router.replace(startRoute);
  }

  const error = state.error === "wrong"
    ? state.status === "locked"
      ? t("Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã.")
      : t("Mã chưa đúng. Bạn còn {{count}} lần thử.", { count: state.attemptsLeft })
    : state.message;

  return (
    <AuthPage
      footer={<>
        <AuthButton busy={state.status === "verifying"} disabled={!canSubmitOtp(state)} label="Xác thực" onPress={() => void verify(state.code)} />
        <AuthLink label={channel === "phone" ? "Đổi số" : "Đổi email"} onPress={changeDestination} />
      </>}
    >
      <View style={styles.back}>
        <IconButton icon="chevron-left" label={t("Quay lại")} onPress={changeDestination} variant="surface" />
      </View>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{t("Nhập mã xác thực")}</Text>
        <Text style={styles.subtitle}>
          {t("Mã 6 số đã gửi tới")} <Text style={styles.destination}>{shownDestination}</Text>
        </Text>
      </View>
      <CodeCard>
        <AuthOverline>Mã xác thực</AuthOverline>
        <CodeDigits
          disabled={state.status === "verifying" || state.status === "verified" || state.status === "locked"}
          error={state.error === "wrong"}
          onChange={(value) => dispatch({ type: "input", value })}
          onSubmit={() => void verify(state.code)}
          value={state.code}
        />
        <Pressable accessibilityRole="button" disabled={secondsLeft > 0 || resending} onPress={() => void resend()} style={styles.resend}>
          <Text style={styles.resendMuted}>{t("Chưa nhận được?")}</Text>
          <Text style={[styles.resendAction, secondsLeft > 0 && styles.resendWaiting]}>
            {secondsLeft > 0 ? t("Gửi lại mã sau {{time}}", { time: formatCountdown(secondsLeft) }) : t("Gửi lại mã")}
          </Text>
        </Pressable>
      </CodeCard>
      <AuthError>{error}</AuthError>
      {notice && !error ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{t(notice)}</Text> : null}
      <AuthHint icon="message-text-outline">
        {channel === "phone" ? "Chưa thấy SMS? Kiểm tra lại số điện thoại hoặc sóng di động." : "Chưa thấy email? Kiểm tra thư mục Spam."}
      </AuthHint>
    </AuthPage>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  back: { alignItems: "flex-start" },
  heading: { gap: 4 },
  title: { ...figmaType.display, color: colors.text },
  subtitle: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.muted },
  destination: { fontWeight: "800", color: colors.text },
  resend: { flexDirection: "row", gap: 4, alignItems: "center", minHeight: 24, alignSelf: "flex-start" },
  resendMuted: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.muted },
  resendAction: { fontSize: 12, lineHeight: 18, fontWeight: "800", color: colors.primary },
  resendWaiting: { color: colors.text },
  notice: { ...figmaType.bodySmall, color: colors.success },
});
