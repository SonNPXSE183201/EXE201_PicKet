import { figmaRadii, figmaType } from "@picket/design-tokens";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { PaperArt } from "@/core/ui/paper-art";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
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
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.overline}>PICKET</Text>
            <Text accessibilityRole="header" style={styles.title}>{t(title)}</Text>
            <Text style={styles.subtitle}>{t(subtitle)}</Text>
          </View>
          <PaperArt id="bloom" style={styles.heroArt} />
        </View>
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
  const google = label.includes("Google");
  return <FigmaButton label={t(label)} onPress={onPress} variant={google ? "outline" : "primary"} icon={google ? "google" : undefined} busy={busy} disabled={disabled} fullWidth />;
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
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 },
  hero: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroCopy: { flex: 1, gap: 8, paddingTop: 4 },
  heroArt: { width: 120, height: 120 },
  overline: { ...figmaType.overline, color: colors.primary, textTransform: "uppercase" },
  title: { ...figmaType.amountHero, color: colors.text },
  subtitle: { ...figmaType.bodySmall, color: colors.muted },
  form: { gap: 12, marginTop: 16, backgroundColor: colors.paper, borderRadius: figmaRadii.receipt, padding: 16, ...figmaShadow("paper") },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21, minHeight: 56, paddingHorizontal: 16 },
  link: { ...figmaType.captionStrong, color: colors.primary, paddingVertical: 6, textAlign: "center" },
  message: { ...figmaType.bodySmall, color: colors.expense },
});
