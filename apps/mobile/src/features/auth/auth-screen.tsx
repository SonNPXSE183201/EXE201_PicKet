import { colors, radii } from "@picket/design-tokens";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { AppIcon } from "@/core/ui/app-icon";
import { BrandLogo } from "@/core/ui/brand-logo";

export function AuthScreen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandLogo size={112} />
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AuthField(props: TextInputProps) {
  const { accessibilityLabel, placeholder, ...inputProps } = props;
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel ?? placeholder}
      placeholder={placeholder}
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
  return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy, disabled: busy || disabled }} disabled={busy || disabled} onPress={onPress} style={[styles.primary, label.includes("Google") && styles.google, (busy || disabled) && styles.disabled]}>
      {busy ? <ActivityIndicator accessibilityLabel={`Đang xử lý ${label}`} color={label.includes("Google") ? colors.mauve : colors.white} /> : <>{label.includes("Google") && <AppIcon name="google" color={colors.ink} size={20} />}<Text style={[styles.primaryText, label.includes("Google") && { color: colors.ink }]}>{label}</Text></>}
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress(): void }) {
  return <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}><Text style={styles.link}>{label}</Text></Pressable>;
}

export function AuthMessage({ children }: { children: ReactNode }) {
  return <Text accessibilityLiveRegion="polite" role="alert" style={styles.message}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandMark: { alignItems: "center", alignSelf: "center", backgroundColor: colors.mauve, borderRadius: radii.small, borderBottomLeftRadius: 5, height: 52, justifyContent: "center", width: 52 },
  brandLetter: { color: colors.white, fontSize: 26, fontWeight: "700" },
  brand: { color: colors.ink, fontSize: 24, fontWeight: "700", marginTop: 10, textAlign: "center" },
  title: { color: colors.ink, fontSize: 30, fontWeight: "700", marginTop: 36 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  form: { gap: 14, marginTop: 26 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, flexDirection: "row", gap: 12, borderRadius: 28, justifyContent: "center", minHeight: 52, paddingHorizontal: 18 },
  google: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  link: { color: colors.mauve, fontSize: 14, fontWeight: "700", paddingVertical: 6, textAlign: "center" },
  message: { color: colors.expense, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
