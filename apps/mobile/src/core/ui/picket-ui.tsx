import { PaperArt } from "./paper-art";
import type { PaperAssetId } from "../theme/paper-assets";
import { PicketScrollView } from "./picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { spacing, typography } from "@/core/ui/mobile-palette";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppIcon, type IconName } from "./app-icon";
import { floatingActionBottom, floatingActionIconOnly } from "./floating-action-layout";

import { AccessiblePressable as Pressable } from "./accessible-pressable";

export function PicketScreen({ children }: PropsWithChildren) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PicketScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </PicketScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function IconButton({ icon, label, onPress, disabled = false, expanded }: { icon: IconName; label: string; onPress(): void; disabled?: boolean; expanded?: boolean }) {
  const { styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityLabel={label} accessibilityState={{ expanded, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><AppIcon name={icon} /></Pressable>;
}

export function TopAppBar({ title, subtitle, back = true, action, backDisabled = false, illustration, onBack }: { title: string; subtitle?: string; back?: boolean; action?: ReactNode; backDisabled?: boolean; illustration?: PaperAssetId; onBack?: () => void }) {
  const { t } = useTranslation("common");
  const { styles } = useMobileStyles(createStyles);
  return <View style={styles.appBar}><View style={styles.appBarRow}>{back && <IconButton icon="arrow-left" label={t("Quay lại")} disabled={backDisabled} onPress={onBack ?? (() => router.back())} />}<Text accessibilityRole="header" style={styles.appBarTitle}>{title}</Text>{action}{illustration && <PaperArt id={illustration} style={{ width: 58, height: 58 }} />}</View>{subtitle && <Text style={styles.appBarSubtitle}>{subtitle}</Text>}</View>;
}

export function MenuRow({ title, description, icon, illustration, onPress, disabled = false }: { title: string; description?: string; icon: IconName; illustration?: PaperAssetId; onPress(): void; disabled?: boolean }) {
  const { styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>{illustration ? <PaperArt id={illustration} style={{ width: 36, height: 36 }} /> : <View style={styles.menuIcon}><AppIcon name={icon} size={22} /></View>}<View style={{ flex: 1 }}><Text style={styles.menuTitle}>{title}</Text>{description && <Text style={styles.menuDescription}>{description}</Text>}</View></Pressable>;
}

export function ConnectionNotice({ hasData, onRetry }: { hasData: boolean; onRetry(): void }) {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable onPress={onRetry} accessibilityLabel={hasData ? t("Đang dùng dữ liệu đã lưu. Chạm để tải lại") : t("Chưa tải được dữ liệu. Chạm để thử lại")} style={styles.notice}><AppIcon name={hasData ? "cloud-off-outline" : "refresh"} size={18} color={colors.muted} /><Text style={styles.noticeText}>{hasData ? t("Đang dùng dữ liệu đã lưu") : t("Chưa tải được dữ liệu")}</Text><Text style={styles.noticeAction}>{t("Thử lại")}</Text></Pressable>;
}

export function ActionSheet({ title, visible, onClose, children }: PropsWithChildren<{ title: string; visible: boolean; onClose(): void }>) {
  const { t } = useTranslation("common");
  const { styles } = useMobileStyles(createStyles);
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetBackdrop}><Pressable accessibilityLabel={t("Đóng biểu mẫu")} onPress={onClose} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom) }]}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.sheetHandle} /><View style={styles.sheetHeading}><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text><IconButton icon="close" label={t("Đóng biểu mẫu")} onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>;
}

export function FloatingAction({ label, icon = "plus", iconOnly = false, onPress }: { label: string; icon?: IconName; iconOnly?: boolean; onPress(): void }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { fontScale, width } = useWindowDimensions();
  const compact = floatingActionIconOnly(iconOnly, fontScale, width);
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.fab, { bottom: floatingActionBottom(fontScale, insets.bottom) }, compact && { width: 56, height: 56, borderRadius: 18, paddingHorizontal: 0 }]}><AppIcon name={icon} size={26} color={colors.onPrimary} />{!compact && <Text style={styles.fabLabel}>{label}</Text>}</Pressable>;
}

export function Surface({ children, peach = false, style }: PropsWithChildren<{ peach?: boolean; style?: ViewStyle }>) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={[styles.surface, peach && styles.peachSurface, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, description, action, onAction, symbol = "✦", illustration }: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  symbol?: string;
  illustration?: PaperAssetId;
}) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <Surface style={styles.emptyState}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.emptyIcon}>
        <PaperArt id={illustration ?? (symbol === "◌" ? "shopping" : symbol === "▤" || symbol === "✓" ? "bills" : "empty")} style={{ width: 72, height: 72 }} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{action}</Text>
        </Pressable>
      ) : null}
    </Surface>
  );
}

export function Shortcut({ label, symbol, onPress }: { label: string; symbol: ReactNode; onPress: () => void }) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.shortcutIcon}>
        {typeof symbol === "string" ? <Text style={styles.shortcutSymbol}>{symbol}</Text> : symbol}
      </View>
      <Text numberOfLines={2} style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: PropsWithChildren) {
  const { styles } = useMobileStyles(createStyles);
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function ChoiceChip({ checked, label, onPress, disabled=false }: { checked: boolean; label: string; onPress(): void; disabled?: boolean }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} style={[styles.choiceTarget, disabled && styles.disabled]}><View style={[styles.choiceChip, checked && styles.choiceChipSelected]}>{checked && <AppIcon name="check" size={14} color={colors.selectedText} />}<Text style={[styles.choiceChipText, checked && styles.choiceChipTextSelected]}>{label}</Text></View></Pressable>;
}

export function PrimaryAction({ busy = false, disabled = false, label, onPress }: { busy?: boolean; disabled?: boolean; label: string; onPress(): void }) {
  const {t}=useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled:busy||disabled }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && { backgroundColor: colors.primaryPressed }, (busy || disabled) && { backgroundColor: colors.disabledSurface, borderColor: colors.controlBorder }]}>{busy && <ActivityIndicator accessibilityLabel={t("Đang xử lý")} color={colors.disabledText} size="small" />}<Text style={[styles.primaryButtonText, (busy || disabled) && { color: colors.disabledText }]}>{label}</Text></Pressable>;
}

export function DangerAction({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress(): void }) {
  const { styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.dangerButton}><Text style={styles.dangerButtonText}>{label}</Text></Pressable>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.screen, paddingTop: 8, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  surface: { padding: paperControl.cardPadding, borderRadius: paperShape.card, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  peachSurface: { backgroundColor: colors.peach },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", paddingBottom: 12, paddingTop: spacing.section },
  sectionTitle: { color: colors.ink, flex: 1, fontSize: typography.title.fontSize, fontWeight: typography.title.fontWeight },
  sectionAction: { color: colors.link, fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 20 },
  emptyIcon: { alignItems: "center", borderRadius: 24, height: 64, justifyContent: "center", width: 64 },
  emptySymbol: { color: colors.ink, fontSize: 28 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" },
  emptyDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderColor: colors.primaryOutline, borderWidth: 1, borderRadius: 26, flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 12, minHeight: paperControl.height, paddingVertical: 10, paddingHorizontal: 24 },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  shortcut: { alignItems: "center", flex: 1, gap: 9, minHeight: 102, paddingHorizontal: 4, paddingVertical: 10 },
  shortcutIcon: { alignItems: "center", backgroundColor: colors.white, borderRadius: 22, height: 52, justifyContent: "center", width: 52 },
  shortcutSymbol: { color: colors.link, fontSize: 23, fontWeight: "700" },
  shortcutLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", lineHeight: 16, textAlign: "center" },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.55 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "700", marginBottom: 8, marginTop: 14 },
  choiceChip: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.chip, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  choiceChipSelected: { backgroundColor: colors.selectedSurface, borderColor: colors.primaryOutline },
  choiceChipText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  choiceChipTextSelected: { color: colors.selectedText },
  dangerButton: { alignItems: "center", borderColor: colors.danger, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: paperControl.height },
  dangerButtonText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  choiceTarget: { justifyContent: "center", minHeight: paperControl.height },
  iconButton: { alignItems: "center", justifyContent: "center", borderRadius: 16 },
  appBar: { marginBottom: 20 },
  appBarRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56 },
  appBarTitle: { flex: 1, color: colors.ink, fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5 },
  appBarSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, minHeight: 64 },
  menuIcon: { width: paperControl.iconSize, height: paperControl.iconSize, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.pocketLilac },
  menuTitle: { color: colors.ink, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  menuDescription: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  notice: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 10, marginBottom: 8 },
  noticeText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  noticeAction: { color: colors.link, fontSize: 12, fontWeight: "700" },
  fab: { position: "absolute", bottom: 100, right: 20, backgroundColor: colors.mauve, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 56, borderRadius: 18, paddingHorizontal: 20, elevation: 0 },
  fabLabel: { color: colors.onPrimary, fontWeight: "700", fontSize: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHeading: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.controlBorder, alignSelf: "center", marginTop: 10 },
  sheetTitle: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.ink },
  sheetContent: { padding: 20, paddingBottom: 24 },
});
