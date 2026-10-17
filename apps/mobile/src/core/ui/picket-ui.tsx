import { colors, radii, spacing, typography } from "@picket/design-tokens";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppIcon, type IconName } from "./app-icon";
import { floatingActionBottom } from "./floating-action-layout";

import { AccessiblePressable as Pressable } from "./accessible-pressable";

export function PicketScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function IconButton({ icon, label, onPress, disabled = false }: { icon: IconName; label: string; onPress(): void; disabled?: boolean }) {
  return <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><AppIcon name={icon} /></Pressable>;
}

export function TopAppBar({ title, subtitle, back = true, action, backDisabled = false }: { title: string; subtitle?: string; back?: boolean; action?: ReactNode; backDisabled?: boolean }) {
  return <View style={styles.appBar}><View style={styles.appBarRow}>{back && <IconButton icon="arrow-left" label="Quay lại" disabled={backDisabled} onPress={() => router.back()} />}<Text accessibilityRole="header" style={styles.appBarTitle}>{title}</Text>{action}</View>{subtitle && <Text style={styles.appBarSubtitle}>{subtitle}</Text>}</View>;
}

export function MenuRow({ title, description, icon, onPress, disabled = false }: { title: string; description?: string; icon: IconName; onPress(): void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><View style={styles.menuIcon}><AppIcon name={icon} size={22} /></View><View style={{ flex: 1 }}><Text style={styles.menuTitle}>{title}</Text>{description && <Text style={styles.menuDescription}>{description}</Text>}</View><AppIcon name="chevron-right" color={colors.muted} size={20} /></Pressable>;
}

export function ConnectionNotice({ hasData, onRetry }: { hasData: boolean; onRetry(): void }) {
  return <Pressable onPress={onRetry} accessibilityLabel={hasData ? "Đang dùng dữ liệu đã lưu. Chạm để tải lại" : "Chưa tải được dữ liệu. Chạm để thử lại"} style={styles.notice}><AppIcon name={hasData ? "cloud-off-outline" : "refresh"} size={18} color={colors.muted} /><Text style={styles.noticeText}>{hasData ? "Đang dùng dữ liệu đã lưu" : "Chưa tải được dữ liệu"}</Text><Text style={styles.noticeAction}>Thử lại</Text></Pressable>;
}

export function ActionSheet({ title, visible, onClose, children }: PropsWithChildren<{ title: string; visible: boolean; onClose(): void }>) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetBackdrop}><Pressable accessibilityLabel="Đóng biểu mẫu" onPress={onClose} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(16, insets.bottom) }]}><View style={styles.sheetHeading}><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text><IconButton icon="close" label="Đóng biểu mẫu" onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>;
}

export function FloatingAction({ label, icon = "plus", iconOnly = false, onPress }: { label: string; icon?: IconName; iconOnly?: boolean; onPress(): void }) {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.fab, { bottom: floatingActionBottom(fontScale, insets.bottom) }, iconOnly && { width: 56, height: 56, borderRadius: 18, paddingHorizontal: 0 }]}><AppIcon name={icon} size={26} color={colors.white} />{!iconOnly && <Text style={styles.fabLabel}>{label}</Text>}</Pressable>;
}

export function Surface({ children, peach = false, style }: PropsWithChildren<{ peach?: boolean; style?: ViewStyle }>) {
  return <View style={[styles.surface, peach && styles.peachSurface, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
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

export function EmptyState({ title, description, action, onAction, symbol = "✦" }: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  symbol?: string;
}) {
  return (
    <Surface style={styles.emptyState}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.emptyIcon}>
        <AppIcon name={symbol === "▥" ? "chart-donut" : symbol === "◌" ? "shape-outline" : "inbox-outline"} size={30} />
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
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function ChoiceChip({ checked, label, onPress }: { checked: boolean; label: string; onPress(): void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked }} onPress={onPress} style={[styles.choiceChip, checked && styles.choiceChipSelected]}>{checked && <AppIcon name="check" size={16} color={colors.ink} />}<Text style={[styles.choiceChipText, checked && styles.choiceChipTextSelected]}>{label}</Text></Pressable>;
}

export function PrimaryAction({ busy = false, disabled = false, label, onPress }: { busy?: boolean; disabled?: boolean; label: string; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (busy || disabled) && styles.disabled]}>{busy && <ActivityIndicator accessibilityLabel="Đang xử lý" color={colors.white} size="small" />}<Text style={styles.primaryButtonText}>{busy ? "Đang xử lý…" : label}</Text></Pressable>;
}

export function DangerAction({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress(): void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.dangerButton}><Text style={styles.dangerButtonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.screen, paddingTop: 8, paddingBottom: 180, width: "100%", maxWidth: 720, alignSelf: "center" },
  surface: { padding: spacing.screen, borderRadius: radii.card, backgroundColor: colors.white },
  peachSurface: { backgroundColor: colors.peach },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", paddingBottom: 12, paddingTop: spacing.section },
  sectionTitle: { color: colors.ink, flex: 1, fontSize: typography.title.fontSize, fontWeight: typography.title.fontWeight },
  sectionAction: { color: colors.mauve, fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingHorizontal: 20, paddingVertical: 30 },
  emptyIcon: { alignItems: "center", backgroundColor: colors.peach, borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  emptySymbol: { color: colors.ink, fontSize: 28 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" },
  emptyDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.pill, flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 18, minHeight: 52, paddingVertical: 12, paddingHorizontal: 24 },
  primaryButtonText: { color: colors.white, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  shortcut: { alignItems: "center", flex: 1, gap: 9, minHeight: 102, paddingHorizontal: 4, paddingVertical: 10 },
  shortcutIcon: { alignItems: "center", backgroundColor: colors.white, borderRadius: 22, height: 52, justifyContent: "center", width: 52 },
  shortcutSymbol: { color: colors.mauve, fontSize: 23, fontWeight: "700" },
  shortcutLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", lineHeight: 16, textAlign: "center" },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.55 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "800", marginBottom: 8, marginTop: 14 },
  choiceChip: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: colors.white, borderColor: colors.line, borderRadius: radii.small, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  choiceChipSelected: { backgroundColor: colors.peach, borderColor: colors.peach },
  choiceChipText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  choiceChipTextSelected: { color: colors.ink },
  dangerButton: { alignItems: "center", borderColor: colors.expense, borderRadius: radii.medium, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 50 },
  dangerButtonText: { color: colors.expense, fontSize: 15, fontWeight: "800" },
  iconButton: { alignItems: "center", justifyContent: "center", borderRadius: 24 },
  appBar: { marginBottom: 20 },
  appBarRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56 },
  appBarTitle: { flex: 1, color: colors.ink, fontSize: 26, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5 },
  appBarSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 64 },
  menuIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  menuTitle: { color: colors.ink, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  menuDescription: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  notice: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 10, marginBottom: 8 },
  noticeText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  noticeAction: { color: colors.mauve, fontSize: 12, fontWeight: "700" },
  fab: { position: "absolute", bottom: 100, right: 20, backgroundColor: colors.mauve, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 56, borderRadius: 18, paddingHorizontal: 20, elevation: 3 },
  fabLabel: { color: colors.white, fontWeight: "700", fontSize: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(74,44,42,0.32)", justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHeading: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12 },
  sheetTitle: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.ink },
  sheetContent: { padding: 20, paddingBottom: 24 },
});
