import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PaperArt } from "@/core/ui/paper-art";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { radii } from "@/core/ui/mobile-palette";
import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, StyleSheet, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { AppIcon } from "@/core/ui/app-icon";
import { BrandLogo } from "@/core/ui/brand-logo";
import { useTranslation } from "react-i18next";

export function AuthScreen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  const {t}=useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}><BrandLogo size={76} /><PaperArt id="bloom" style={{ width: 116, height: 116 }} /></View>
        <Text accessibilityRole="header" style={styles.title}>{t(title)}</Text>
        <Text style={styles.subtitle}>{t(subtitle)}</Text>
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AuthField(props: TextInputProps) {
  const {t}=useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  const { accessibilityLabel, placeholder, ...inputProps } = props;
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : placeholder ? t(placeholder) : undefined}
      placeholder={placeholder ? t(placeholder) : undefined}
      placeholderTextColor={colors.muted}
      style={styles.input}
      {...inputProps}
    />
  );
}

export function PrimaryButton({
  busy,
  disabled,
  label,
  onPress,
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress(): void;
}) {
  const {t}=useTranslation("auth");
  const { colors, styles } = useMobileStyles(createStyles);
  return (
      <Pressable accessibilityRole="button" accessibilityLabel={t(label)} accessibilityState={{ busy, disabled: busy || disabled }} disabled={busy || disabled} onPress={onPress} style={[styles.primary, label.includes("Google") && styles.google, (busy || disabled) && styles.disabled]}>
      {busy ? <ActivityIndicator accessibilityLabel={t("processing",{label:t(label)})} color={label.includes("Google") ? colors.mauve : colors.onPrimary} /> : <>{label.includes("Google") && <AppIcon name="google" color={colors.ink} size={20} />}<Text style={[styles.primaryText, label.includes("Google") && { color: colors.ink }]}>{t(label)}</Text></>}
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress(): void }) {
  const {t}=useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}><Text style={styles.link}>{t(label)}</Text></Pressable>;
}

export function AuthMessage({ children }: { children: ReactNode }) {
  const {t}=useTranslation("auth");
  const { styles } = useMobileStyles(createStyles);
  return <Text accessibilityLiveRegion="polite" role="alert" style={styles.message}>{typeof children==="string"?t(children):children}</Text>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", flexGrow: 1, justifyContent: "center", padding: paperSpace.screen },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  brandMark: { alignItems: "center", alignSelf: "center", backgroundColor: colors.mauve, borderRadius: radii.small, borderBottomLeftRadius: 5, height: 52, justifyContent: "center", width: 52 },
  brandLetter: { color: colors.onPrimary, fontSize: 26, fontWeight: "700" },
  brand: { color: colors.ink, fontSize: 24, fontWeight: "700", marginTop: 10, textAlign: "center" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", marginTop: 24 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  form: { gap: 14, marginTop: 26 },
  input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, flexDirection: "row", gap: 12, borderRadius: paperShape.button, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 18 },
  google: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1 },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  link: { color: colors.link, fontSize: 14, fontWeight: "700", paddingVertical: 6, textAlign: "center" },
  message: { color: colors.expense, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
