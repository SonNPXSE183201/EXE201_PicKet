import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, View } from "react-native";
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
import { emailCodeDelivery, emailCodeErrorFor, emailCodeStateFor, useEmailCodeDelivery } from "@/features/auth/email-code-delivery";
import { canSubmitOtp, formatCountdown, initialOtpState, otpLength, otpReducer, resendSecondsLeft, shouldAutoSubmitOtp } from "@/features/auth/otp-state";
import { perfLog, perfStart } from "@/features/auth/perf-log";
import { formatVietnamPhone } from "@/features/auth/phone-input";
import { phoneFlow, usePhoneFlow, type PhoneFlowPurpose } from "@/features/auth/phone-signup-store";
import type { PhoneSignupSnapshot } from "@/features/auth/phone-signup-session";
import { firebasePhoneErrorMessage, isExpiredCodeError, isWrongCodeError, phoneResetSendErrorMessage, phoneSendErrorMessage } from "@/features/auth/signup-errors";

type Channel = "email" | "phone";
/** "sending": the screen opened before the code went out (inputs already accept typing). */
type Delivery = "sending" | "ready" | "failed";

function phoneDelivery(state: PhoneSignupSnapshot): Delivery {
  if (state.step === "sending") return "sending";
  if (state.step === "send-failed") return "failed";
  return "ready";
}

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ channel?: string; destination?: string; purpose?: string }>();
  const channel: Channel = params.channel === "phone" ? "phone" : "email";
  // SMS password recovery reuses this screen (forgot-password → code → new password).
  const purpose: PhoneFlowPurpose = channel === "phone" && params.purpose === "reset" ? "reset" : "signup";
  const destination = params.destination ?? "";
  const phoneState = usePhoneFlow(purpose);
  const emailState = useEmailCodeDelivery();
  // A lost SMS session (process restart) cannot be resumed: start again. Checked
  // once so "Đổi số" (which resets the session while leaving) does not redirect twice.
  const [lostPhoneSession] = useState(() => channel === "phone" && phoneState.step === "idle");
  const start = purpose === "reset" ? routes.forgotPassword : routes.register;
  if (!destination || lostPhoneSession) return <Redirect href={start} />;
  const delivery = channel === "phone" ? phoneDelivery(phoneState) : emailCodeStateFor(emailState, destination);
  // With delivery "ready" an error means a failed resend: the earlier code still works.
  const sendError = channel === "phone" ? phoneState.sendError : emailCodeErrorFor(emailState, destination);
  return <VerifyCode channel={channel} purpose={purpose} destination={destination}
    autoCode={channel === "phone" ? phoneState.autoCode : null}
    delivery={delivery}
    sendError={delivery === "sending" ? null : sendError}
    phoneVerified={channel === "phone" && phoneState.step === "verified"} />;
}

function VerifyCode({ channel, purpose, destination, autoCode, delivery, sendError, phoneVerified }: {
  channel: Channel;
  purpose: PhoneFlowPurpose;
  destination: string;
  autoCode: string | null;
  delivery: Delivery;
  sendError: unknown;
  /** Android instant verification can finish without any code. */
  phoneVerified: boolean;
}) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  const { sendEmailCode, verifyEmailCode } = useAuth();
  const [state, dispatch] = useReducer(otpReducer, undefined, () => initialOtpState(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const verifying = useRef(false);
  const leftForPassword = useRef(false);
  const lastAutoSubmitted = useRef<string | null>(null);
  const appliedAutoCode = useRef<string | null>(null);
  const flow = phoneFlow(purpose);
  const passwordRoute = purpose === "reset" ? routes.resetPasswordByPhone : routes.createPassword;
  const startRoute = purpose === "reset" ? routes.forgotPassword : routes.register;
  const sendErrorMessage = purpose === "reset" ? phoneResetSendErrorMessage : phoneSendErrorMessage;
  const secondsLeft = resendSecondsLeft(state, now);
  const shownDestination = channel === "phone" ? formatVietnamPhone(destination) : destination;
  const ready = delivery === "ready";
  const sending = delivery === "sending";
  const failed = delivery === "failed";
  // No SMS/email went out after a failed send, so the resend cooldown does not apply.
  const canResend = !resending && !sending && (failed || secondsLeft <= 0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const verify = useCallback(async (code: string) => {
    if (verifying.current || code.length !== otpLength) return;
    // Not before the code went out (keyboard "done" while sending): the auto-submit
    // sends it once delivery is ready.
    if (!ready) return;
    // The code cannot be checked before Firebase reported CODE_SENT (no verificationId yet).
    if (channel === "phone" && flow.snapshot().step !== "code-sent" && flow.snapshot().step !== "verified") return;
    // A code submitted by hand is not auto-submitted again.
    lastAutoSubmitted.current = code;
    verifying.current = true;
    dispatch({ type: "submit" });
    setNotice(null);
    try {
      if (channel === "phone") {
        await flow.confirm(code);
        dispatch({ type: "verified" });
        // Navigate right away: nothing else is awaited between the sign-in and the password step.
        if (!leftForPassword.current) {
          leftForPassword.current = true;
          router.replace(passwordRoute);
        }
      } else {
        const startedAt = perfStart();
        try {
          await verifyEmailCode(destination, code);
        } finally {
          perfLog("email-verify", startedAt);
        }
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
  }, [channel, destination, flow, passwordRoute, ready, verifyEmailCode]);

  // Firebase verified the number without a code (Android instant verification).
  useEffect(() => {
    if (!phoneVerified || leftForPassword.current) return;
    leftForPassword.current = true;
    router.replace(passwordRoute);
  }, [phoneVerified, passwordRoute]);

  // Android SMS Retriever: Firebase read the code on-device; the auto-submit below sends it.
  // Applied once, when the boxes accept input (not while a typed code is being checked).
  useEffect(() => {
    if (!autoCode || appliedAutoCode.current === autoCode) return;
    if (state.status === "verifying" || state.status === "verified") return;
    appliedAutoCode.current = autoCode;
    dispatch({ type: "input", value: autoCode });
  }, [autoCode, state.status]);

  // 6th digit typed, pasted or autofilled: submit once per code (the button stays as fallback).
  useEffect(() => {
    if (!shouldAutoSubmitOtp(state, ready, lastAutoSubmitted.current)) return;
    lastAutoSubmitted.current = state.code;
    void verify(state.code);
  }, [state, ready, verify]);

  async function resend() {
    if (!canResend) return;
    setResending(true);
    setNotice(null);
    try {
      if (channel === "phone") {
        if (!(await flow.resend())) return;
      } else {
        emailCodeDelivery.start(destination, sendEmailCode);
      }
      lastAutoSubmitted.current = null;
      appliedAutoCode.current = null;
      dispatch({ type: "resent", now: Date.now() });
      setNow(Date.now());
      await (channel === "phone" ? flow.delivered() : emailCodeDelivery.delivered());
      // A failed resend keeps the earlier code usable ("code-sent"/"sent") with an error.
      const delivered = channel === "phone"
        ? flow.snapshot().step === "code-sent" && !flow.snapshot().sendError
        : emailCodeDelivery.snapshot().status === "sent" && !emailCodeDelivery.snapshot().error;
      if (delivered) setNotice("Mã mới đã được gửi.");
    } catch (error) {
      dispatch({ type: "failed", message: channel === "phone" ? sendErrorMessage(error) : authErrorMessage(error) });
    } finally {
      setResending(false);
    }
  }

  function changeDestination() {
    if (channel === "phone") flow.reset();
    else emailCodeDelivery.reset();
    if (router.canGoBack()) router.back();
    else router.replace(startRoute);
  }

  const otpError = state.error === "wrong"
    ? state.status === "locked"
      ? t("Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã.")
      : t("Mã chưa đúng. Bạn còn {{count}} lần thử.", { count: state.attemptsLeft })
    : state.message;
  // The latest problem wins: an error from the last tap (e.g. a resend refused by the
  // API) over the earlier send failure, which is cleared when a resend starts.
  const sendFailure = failed || sendError
    ? channel === "phone" ? sendErrorMessage(sendError) : authErrorMessage(sendError)
    : null;
  const error = otpError ?? sendFailure;
  const changeLabel = channel === "phone" ? "Đổi số" : "Đổi email";
  const heading = sending ? "Đang gửi mã tới" : failed ? "Chưa gửi được mã tới" : "Mã 6 số đã gửi tới";

  return (
    <AuthPage
      footer={<>
        {failed
          ? <AuthButton label={changeLabel} onPress={changeDestination} />
          : <AuthButton busy={state.status === "verifying"} disabled={!ready || !canSubmitOtp(state)} label="Xác thực" onPress={() => void verify(state.code)} />}
        {failed ? null : <AuthLink label={changeLabel} onPress={changeDestination} />}
      </>}
    >
      <View style={styles.back}>
        <IconButton icon="chevron-left" label={t("Quay lại")} onPress={changeDestination} variant="surface" />
      </View>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{t("Nhập mã xác thực")}</Text>
        <Text style={styles.subtitle}>
          {t(heading)} <Text style={styles.destination}>{shownDestination}</Text>
        </Text>
      </View>
      <CodeCard>
        <AuthOverline>Mã xác thực</AuthOverline>
        <CodeDigits
          disabled={failed || state.status === "verifying" || state.status === "verified" || state.status === "locked"}
          error={state.error === "wrong"}
          onChange={(value) => dispatch({ type: "input", value })}
          onSubmit={() => void verify(state.code)}
          value={state.code}
        />
        {sending ? (
          <View accessibilityLiveRegion="polite" style={styles.resend}>
            <ActivityIndicator accessibilityLabel={t("Đang gửi mã…")} color={colors.primary} size="small" />
            <Text style={styles.resendMuted}>{t("Đang gửi mã…")}</Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" disabled={!canResend} onPress={() => void resend()} style={styles.resend}>
            <Text style={styles.resendMuted}>{t("Chưa nhận được?")}</Text>
            <Text style={[styles.resendAction, !canResend && styles.resendWaiting]}>
              {canResend || resending ? t("Gửi lại mã") : t("Gửi lại mã sau {{time}}", { time: formatCountdown(secondsLeft) })}
            </Text>
          </Pressable>
        )}
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
