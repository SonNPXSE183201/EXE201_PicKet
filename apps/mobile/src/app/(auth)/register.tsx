import { router, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";

import { routes } from "@/core/navigation/routes";
import { useAuth } from "@/features/auth/auth-context";
import { validateEmail } from "@/features/auth/auth-errors";
import {
  AuthButton,
  AuthCard,
  AuthError,
  AuthFieldRow,
  AuthFooterPrompt,
  AuthHero,
  AuthNote,
  AuthPage,
  ConsentCheckbox,
  MethodChips,
} from "@/features/auth/auth-figma";
import { emailCodeDelivery } from "@/features/auth/email-code-delivery";
import { invalidLocalPhoneMessage, sanitizeLocalPhoneInput, vietnamPhonePrefix, vietnamPhoneToE164 } from "@/features/auth/phone-input";
import { phoneSignup } from "@/features/auth/phone-signup-store";
import type { SignupMethod } from "@/features/auth/signup-channels";
import { phoneSendErrorMessage } from "@/features/auth/signup-errors";
import { useSignupMethods } from "@/features/auth/signup-verification-store";

const termsUrl = "https://picketfinance.com/terms.html";
const privacyUrl = "https://picketfinance.com/privacy.html";

const methodLabels: Record<SignupMethod, string> = { email: "Email", phone: "Số điện thoại" };

/** OTP-first sign-up: verify the email or phone, then create the password. */
export default function RegisterScreen() {
  const { configured, sendEmailCode } = useAuth();
  const { methods } = useSignupMethods();
  const [method, setMethod] = useState<SignupMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState<string | null>(
    configured ? null : "Đăng nhập chưa sẵn sàng. Bạn vẫn có thể sử dụng trên thiết bị.",
  );
  const activeMethod = methods.includes(method) ? method : methods[0];

  function changeMethod(next: SignupMethod) {
    setMethod(next);
    setInvalid(false);
    setMessage(null);
  }

  async function submit() {
    if (running.current || !configured) return;
    let destination: string;
    if (activeMethod === "phone") {
      const e164 = vietnamPhoneToE164(phone);
      if (!e164) {
        setInvalid(true);
        return setMessage(invalidLocalPhoneMessage);
      }
      destination = e164;
    } else {
      const issue = validateEmail(email);
      if (issue) {
        setInvalid(true);
        return setMessage(issue);
      }
      destination = email.trim().toLowerCase();
    }
    if (!consent) return setMessage("Hãy đồng ý với Điều khoản và Chính sách quyền riêng tư để tiếp tục.");
    running.current = true;
    setInvalid(false);
    setMessage(null);
    if (activeMethod === "email") {
      // Open the code screen at once; it shows "sending" and any send error with "Đổi email".
      emailCodeDelivery.start(destination, sendEmailCode);
      router.push(routes.verifyCode("email", destination));
      return; // running stays set until this screen is focused again (no double push).
    }
    setBusy(true);
    try {
      // The API start (duplicate number, rate limits) must pass before Firebase sends an SMS;
      // the code screen then opens while Firebase is still sending (or verifies instantly).
      if (await phoneSignup.start(destination)) {
        router.push(routes.verifyCode("phone", destination));
        return;
      }
    } catch (error) {
      setMessage(phoneSendErrorMessage(error));
    } finally {
      setBusy(false);
    }
    running.current = false;
  }

  // Back from the code screen ("Đổi số" / "Đổi email" or the system back): allow a new send.
  useFocusEffect(useCallback(() => {
    running.current = false;
    setBusy(false);
  }, []));

  return (
    <AuthPage
      footer={<AuthFooterPrompt prompt="Đã có tài khoản?" action="Đăng nhập" onPress={() => router.replace(routes.login)} />}
    >
      <AuthHero
        title={["Tài khoản", "mới"]}
        subtitle={activeMethod === "phone" ? "Đăng ký bằng số điện thoại." : "Đăng ký bằng email."}
      />
      {methods.length > 1 && (
        <MethodChips
          disabled={busy}
          onChange={changeMethod}
          options={methods.map((value) => ({ value, label: methodLabels[value] }))}
          value={activeMethod}
        />
      )}
      <AuthCard>
        {activeMethod === "phone" ? (
          <AuthFieldRow
            autoComplete="tel-national"
            editable={!busy}
            invalid={invalid}
            keyboardType="phone-pad"
            label="Số điện thoại"
            onChangeText={(value) => {
              setPhone(sanitizeLocalPhoneInput(value));
              setInvalid(false);
            }}
            onSubmitEditing={() => void submit()}
            phonePrefix={vietnamPhonePrefix}
            placeholder="912 345 678"
            textContentType="telephoneNumber"
            value={phone}
          />
        ) : (
          <AuthFieldRow
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!busy}
            icon="email-outline"
            invalid={invalid}
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setEmail(value);
              setInvalid(false);
            }}
            onSubmitEditing={() => void submit()}
            placeholder="ban@email.com"
            textContentType="emailAddress"
            value={email}
          />
        )}
      </AuthCard>
      <AuthError>{message}</AuthError>
      <ConsentCheckbox
        checked={consent}
        disabled={busy}
        onChange={(next) => {
          setConsent(next);
          if (next) setMessage(null);
        }}
        onOpenPrivacy={() => void WebBrowser.openBrowserAsync(privacyUrl).catch(() => undefined)}
        onOpenTerms={() => void WebBrowser.openBrowserAsync(termsUrl).catch(() => undefined)}
      />
      <AuthButton busy={busy} disabled={busy || !configured} label="Gửi mã xác thực" onPress={() => void submit()} />
      <AuthNote>{activeMethod === "phone" ? "Picket sẽ gửi mã 6 số qua SMS." : "Picket sẽ gửi mã 6 số qua email."}</AuthNote>
    </AuthPage>
  );
}
