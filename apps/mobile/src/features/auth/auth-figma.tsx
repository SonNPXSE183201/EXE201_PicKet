import { figmaRadii, figmaType } from "@picket/design-tokens";
import { useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { FigmaButton, ReceiptDivider, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { PaperArt } from "@/core/ui/paper-art";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { otpLength } from "./otp-state";
import { passwordRuleChecks, passwordRuleLabels } from "./password-rules";

/** Figma mobile auth column: 20/24 padding, 16 gap, content on top and links pinned low. */
export function AuthPage({ children, footer }: PropsWithChildren<{ footer?: ReactNode }>) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
          <View style={styles.flex} />
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function todayStub(label: string, now = new Date()) {
  return `${label.toUpperCase()} · ${now.getDate()}/${now.getMonth() + 1}`;
}

/** Auth/Hero: 180 copy column plus the tilted polaroid, tape and receipt stub. */
export function AuthHero({ title, subtitle }: { title: [string, string]; subtitle: string }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.hero}>
      <View style={styles.heroCopy}>
        <Text style={styles.overline}>PicKet</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>{`${t(title[0])}\n${t(title[1])}`}</Text>
        <Text style={styles.heroSubtitle}>{t(subtitle)}</Text>
      </View>
      <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.heroArt}>
        <View style={[styles.polaroid, figmaShadow("paper")]}>
          <View style={styles.polaroidPhoto}>
            <PaperArt id="moneyBloomScene" style={styles.polaroidArt} />
          </View>
        </View>
        <View style={styles.tape} />
        <View style={[styles.stub, figmaShadow("stub")]}>
          <ReceiptEdge direction="top" />
          <Text style={[figmaType.micro, styles.stubDate]}>{todayStub(t("Hôm nay"))}</Text>
          <Text style={[figmaType.amountPocket, { color: colors.expense }]}>+12.000.000 ₫</Text>
        </View>
      </View>
    </View>
  );
}

export function AuthCard({ children }: PropsWithChildren) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={[styles.card, figmaShadow("paper")]}>{children}</View>;
}

export { ReceiptDivider as AuthDivider };

/** FieldRow: 36 icon box (or +84 prefix), 11 label, 14/21 bold input. */
export function AuthFieldRow({
  icon,
  phonePrefix,
  label,
  invalid = false,
  trailing,
  ...inputProps
}: TextInputProps & { icon?: IconName; phonePrefix?: string; label: string; invalid?: boolean; trailing?: ReactNode }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  const input = useRef<NativeTextInput>(null);
  // The hint shows (muted) only while the field is idle; focusing it clears the hint so typing starts clean.
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessible={false} accessibilityRole="none" onPress={() => input.current?.focus()} style={[styles.fieldRow, invalid && styles.fieldRowInvalid]}>
      <View style={styles.fieldIcon}>
        {phonePrefix ? (
          <>
            <Text style={styles.prefix}>{phonePrefix}</Text>
            <View style={styles.prefixBadge}><AppIcon name="chevron-down" size={10} color={colors.text} /></View>
          </>
        ) : icon ? <AppIcon name={icon} size={20} color={colors.text} /> : null}
      </View>
      <View style={styles.fieldBody}>
        <Text style={[styles.fieldLabel, invalid && { color: colors.warning }]}>{t(label)}</Text>
        <TextInput
          // React 19 passes ref as a prop; PicketTextInput spreads it onto the native input.
          {...({ ref: input } as TextInputProps)}
          borderless
          accessibilityLabel={t(label)}
          placeholderTextColor={colors.muted}
          style={styles.fieldInput}
          {...inputProps}
          onFocus={(event) => { setFocused(true); inputProps.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); inputProps.onBlur?.(event); }}
          placeholder={inputProps.placeholder && !focused ? t(inputProps.placeholder) : undefined}
        />
      </View>
      {trailing}
    </Pressable>
  );
}

export function PasswordVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle(): void }) {
  const { t } = useTranslation("auth");
  const { colors } = useMobileStyles(createStyles);
  return (
    <Pressable accessibilityLabel={t(visible ? "Ẩn mật khẩu" : "Hiện mật khẩu")} hitSlop={8} onPress={onToggle} style={{ padding: 6 }}>
      <AppIcon name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
    </Pressable>
  );
}

export function AuthError({ children }: { children: string | null }) {
  const { t } = useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  if (!children) return null;
  return <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{t(children)}</Text>;
}

export function AuthNote({ children }: { children: string }) {
  const { t } = useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  return <Text style={styles.note}>{t(children)}</Text>;
}

export function AuthButton({ label, onPress, busy, disabled, variant = "primary", icon }: { label: string; onPress(): void; busy?: boolean; disabled?: boolean; variant?: "primary" | "outline" | "text"; icon?: IconName }) {
  const { t } = useTranslation("auth");
  return <FigmaButton fullWidth label={t(label)} onPress={onPress} busy={busy} disabled={disabled} variant={variant} icon={icon} />;
}

export function AuthLink({ label, onPress, chevron = false, disabled = false }: { label: string; onPress(): void; chevron?: boolean; disabled?: boolean }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <Pressable accessibilityRole="link" disabled={disabled} hitSlop={8} onPress={onPress} style={styles.linkRow}>
      <Text style={styles.link}>{t(label)}</Text>
      {chevron ? <AppIcon name="chevron-right" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

/** "Chưa có tài khoản? **Đăng ký**" footer. */
export function AuthFooterPrompt({ prompt, action, onPress }: { prompt: string; action: string; onPress(): void }) {
  const { t } = useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${t(prompt)} ${t(action)}`} hitSlop={8} onPress={onPress} style={styles.footerPrompt}>
      <Text style={styles.footerMuted}>{t(prompt)}</Text>
      <Text style={styles.footerAction}>{t(action)}</Text>
    </Pressable>
  );
}

export function MethodChips<T extends string>({ options, value, onChange, disabled }: { options: { value: T; label: string }[]; value: T; onChange(value: T): void; disabled?: boolean }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View accessibilityRole="radiogroup" style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected ? { backgroundColor: colors.selectedSurface } : { borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.chipText, { color: selected ? colors.primary : colors.text }]}>{t(option.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Checkbox 22 r7 + consent copy with Terms / Privacy links. */
export function ConsentCheckbox({ checked, onChange, onOpenTerms, onOpenPrivacy, disabled }: { checked: boolean; onChange(next: boolean): void; onOpenTerms(): void; onOpenPrivacy(): void; disabled?: boolean }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.consent}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t("Tôi đồng ý với Điều khoản và Chính sách quyền riêng tư")}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        hitSlop={10}
        onPress={() => onChange(!checked)}
        style={[styles.checkbox, checked ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}
      >
        {checked ? <AppIcon name="check" size={16} color={colors.onPrimary} /> : null}
      </Pressable>
      <Text style={styles.consentText}>
        {t("Tôi đồng ý với ")}
        <Text accessibilityRole="link" onPress={onOpenTerms} style={styles.consentLink}>{t("Điều khoản")}</Text>
        {t(" và ")}
        <Text accessibilityRole="link" onPress={onOpenPrivacy} style={styles.consentLink}>{t("Chính sách quyền riêng tư")}</Text>
      </Text>
    </View>
  );
}

export function PasswordRuleList({ password }: { password: string }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  const checks = passwordRuleChecks(password);
  return (
    <View style={styles.rules}>
      {passwordRuleLabels.map((rule) => {
        const met = checks[rule.id];
        return (
          <View key={rule.id} accessible accessibilityLabel={`${t(rule.label)}: ${t(met ? "đã đạt" : "chưa đạt")}`} style={styles.ruleRow}>
            <View style={[styles.ruleDot, met ? { backgroundColor: colors.successSurface, borderColor: colors.successSurface } : null]}>
              {met ? <AppIcon name="check" size={12} color={colors.success} /> : null}
            </View>
            <Text style={[styles.ruleText, { color: met ? colors.text : colors.muted }]}>{t(rule.label)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Six CodeDigit boxes over one hidden input so paste and SMS/email autofill fill all digits. */
export function CodeDigits({ value, onChange, onSubmit, error, disabled, autoFocus = true }: { value: string; onChange(value: string): void; onSubmit(): void; error: boolean; disabled?: boolean; autoFocus?: boolean }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  const input = useRef<NativeTextInput>(null);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessible={false} accessibilityRole="none" onPress={() => input.current?.focus()} style={styles.digits}>
      {Array.from({ length: otpLength }, (_, index) => {
        const digit = value[index] ?? "";
        const active = focused && !disabled && index === Math.min(value.length, otpLength - 1) && value.length < otpLength;
        return (
          <View
            key={index}
            style={[
              styles.digit,
              digit ? styles.digitFilled : styles.digitEmpty,
              active && { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.paper },
              error && { borderColor: colors.expense },
            ]}
          >
            {digit ? <Text style={styles.digitText}>{digit}</Text> : active ? <View style={styles.caret} /> : null}
          </View>
        );
      })}
      <NativeTextInput
        ref={input}
        accessibilityLabel={t("Mã xác thực 6 số")}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        caretHidden
        editable={!disabled}
        importantForAutofill="yes"
        keyboardType="number-pad"
        maxLength={otpLength}
        onBlur={() => setFocused(false)}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onSubmitEditing={onSubmit}
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
        value={value}
      />
    </Pressable>
  );
}

/** White code card with the receipt-v2 art peeking behind and a zig-zag bottom. */
export function CodeCard({ children }: PropsWithChildren) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.codeWrap}>
      <PaperArt id="receiptNote" style={styles.codeArt} />
      <View style={[styles.codeCard, figmaShadow("paper")]}>
        {children}
        <ReceiptEdge direction="bottom" />
      </View>
    </View>
  );
}

export function AuthOverline({ children }: { children: string }) {
  const { t } = useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  return <Text style={styles.codeOverline}>{t(children).toUpperCase()}</Text>;
}

export function AuthHint({ icon, children }: { icon: IconName; children: string }) {
  const { t } = useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.hint}>
      <AppIcon name={icon} size={16} color={colors.muted} />
      <Text style={styles.hintText}>{t(children)}</Text>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  footer: { gap: 12, alignItems: "center", paddingTop: 8 },
  hero: { minHeight: 236, flexDirection: "row" },
  heroCopy: { width: 180, gap: 8, paddingTop: 4, zIndex: 1 },
  overline: { ...figmaType.overline, color: colors.primary },
  heroTitle: { ...figmaType.amountHero, color: colors.text },
  heroSubtitle: { ...figmaType.bodySmall, color: colors.muted },
  heroArt: { flex: 1, minWidth: 140, height: 236 },
  polaroid: { position: "absolute", top: 12, right: 8, width: 128, height: 134, borderRadius: 6, backgroundColor: colors.paper, padding: 6, transform: [{ rotate: "7deg" }] },
  polaroidPhoto: { width: 116, height: 116, borderRadius: 3, backgroundColor: colors.pocketMint, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  polaroidArt: { width: 104, height: 88 },
  tape: { position: "absolute", top: 4, right: 46, width: 46, height: 14, backgroundColor: colors.pocketCoral, opacity: 0.9, transform: [{ rotate: "-10deg" }] },
  stub: { position: "absolute", top: 140, right: -6, width: 170, minHeight: 84, backgroundColor: colors.paper, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12, gap: 2, transform: [{ rotate: "-3deg" }] },
  stubDate: { color: colors.muted, letterSpacing: 1.2 },
  card: { backgroundColor: colors.paper, borderRadius: figmaRadii.receipt, paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8, minHeight: 56, borderRadius: 14 },
  fieldRowInvalid: { backgroundColor: colors.warningSurface },
  fieldIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  prefix: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: colors.text },
  prefixBadge: { position: "absolute", right: -4, bottom: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  fieldBody: { flex: 1, gap: 0 },
  fieldLabel: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: colors.muted },
  fieldInput: { fontSize: 14, lineHeight: 21, fontWeight: "700", color: colors.text, paddingVertical: 0, paddingHorizontal: 0, minHeight: 24, borderWidth: 0, backgroundColor: "transparent" },
  error: { ...figmaType.bodySmall, color: colors.expense, marginTop: -4 },
  note: { ...figmaType.bodySmall, color: colors.text },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 32 },
  link: { ...figmaType.captionStrong, color: colors.primary, textAlign: "center" },
  footerPrompt: { flexDirection: "row", gap: 4, justifyContent: "center", alignItems: "center", minHeight: 32 },
  footerMuted: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.muted },
  footerAction: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: colors.primary },
  chips: { flexDirection: "row", gap: 8 },
  chip: { minHeight: 32, paddingHorizontal: 14, borderRadius: figmaRadii.chip, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, lineHeight: 18, fontWeight: "800" },
  consent: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", marginTop: 1 },
  consentText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.text },
  consentLink: { fontWeight: "700", color: colors.primary, textDecorationLine: "underline" },
  rules: { gap: 6, paddingHorizontal: 4 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  ruleText: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  digits: { flexDirection: "row", justifyContent: "space-between" },
  digit: { width: 40, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  digitFilled: { backgroundColor: colors.paper, borderColor: colors.border },
  digitEmpty: { backgroundColor: colors.elevated, borderColor: colors.border },
  digitText: { fontSize: 20, lineHeight: 26, fontWeight: "800", color: colors.text },
  caret: { width: 2, height: 22, borderRadius: 1, backgroundColor: colors.primary },
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0.01, color: "transparent" },
  codeWrap: { marginTop: 18 },
  codeArt: { position: "absolute", right: 0, top: -38, width: 104, height: 104 },
  codeCard: { backgroundColor: colors.paper, borderTopLeftRadius: figmaRadii.receipt, borderTopRightRadius: figmaRadii.receipt, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  codeOverline: { ...figmaType.overline, color: colors.muted },
  hint: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 2 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.muted },
});
