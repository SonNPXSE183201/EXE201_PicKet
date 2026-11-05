import type { PropsWithChildren, ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PicketScrollView } from "@/core/ui/picket-scroll-view";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { IconButton } from "@/core/ui/picket-ui";
import { Overline, ReceiptDivider, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

/** Child-screen bar: 44 round back button + 16/800 title (Figma TopAppBar/Child). */
export function ChildBar({ title, onBack, backDisabled, action, closeIcon }: { title: string; onBack?: () => void; backDisabled?: boolean; action?: ReactNode; closeIcon?: boolean }) {
  const { t } = useTranslation("common");
  const { colors } = useMobileStyles(() => ({}));
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
    <IconButton variant="surface" icon={closeIcon ? "close" : "arrow-left"} label={t("Quay lại")} disabled={backDisabled} onPress={onBack ?? (() => router.back())} />
    <Text accessibilityRole="header" numberOfLines={1} style={[closeIcon ? figmaType.display : figmaType.titleSection, { flex: 1, color: colors.text }]}>{title}</Text>
    {action}
  </View>;
}

/** Scroll screen with an optional pinned bottom bar (primary action). */
export function FigmaScreen({ children, footer, gap = 20 }: PropsWithChildren<{ footer?: ReactNode; gap?: number }>) {
  const { colors } = useMobileStyles(() => ({}));
  const insets = useSafeAreaInsets();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
    <PicketScrollView contentContainerStyle={{ gap, paddingTop: 16, paddingBottom: footer ? 96 : 24 }}>{children}</PicketScrollView>
    {footer ? <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom), backgroundColor: colors.canvas }}>{footer}</View> : null}
  </SafeAreaView>;
}

/** White paper card (radius 24) holding form rows. */
export function PaperCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useMobileStyles(() => ({}));
  return <View style={[{ backgroundColor: colors.paper, borderRadius: 24, paddingVertical: 4, paddingHorizontal: 16 }, figmaShadow("paper"), style]}>{children}</View>;
}

/** Row inside PaperCard: tinted 36 tile + muted label + value, optional chevron / trailing action. */
export function FormRow({ icon, label, value, onPress, trailing, tone, children, last }: { icon: IconName; label: string; value?: string; onPress?: () => void; trailing?: ReactNode; tone?: "warning"; children?: ReactNode; last?: boolean }) {
  const { colors } = useMobileStyles(() => ({}));
  const body = <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 60 }}>
    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tone === "warning" ? colors.warningSurface : colors.selectedSurface, alignItems: "center", justifyContent: "center" }}><AppIcon name={icon} size={18} color={colors.text} /></View>
    <View style={{ flex: 1, minWidth: 1 }}>
      <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{label}</Text>
      {children ?? <Text numberOfLines={1} style={{ fontSize: 15, lineHeight: 22, fontWeight: "800", color: colors.text }}>{value}</Text>}
    </View>
    {trailing ?? (onPress ? <AppIcon name="chevron-right" size={20} color={colors.text} /> : null)}
  </View>;
  return <View>{onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? ""}`} onPress={onPress}>{body}</Pressable> : body}{last ? null : <ReceiptDivider />}</View>;
}

/** Receipt-paper amount block: overline, hero amount, dashed rule, optional footer (note line). */
export function AmountPaper({ overline, children, footer }: { overline: string; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useMobileStyles(() => ({}));
  return <View style={figmaShadow("paper")}>
    <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 20, paddingBottom: 14, paddingHorizontal: 16, alignItems: "center", gap: 6 }}>
      <Overline>{overline}</Overline>
      {children}
      <View style={{ alignSelf: "stretch", marginTop: 6 }}><ReceiptDivider /></View>
      {footer}
    </View>
    <ReceiptEdge direction="bottom" />
  </View>;
}

/** Hero amount text style (Figma display amount, underlined currency). */
export const heroAmount = { fontSize: 40, lineHeight: 48, fontWeight: "800", letterSpacing: -0.6 } as const;

/** Soft notice (warning/neutral) with 36 tile, title, body and optional text action. */
export function NoticeCard({ title, body, action, onAction, icon = "format-list-bulleted", tone = "warning" }: { title: string; body?: string; action?: string; onAction?: () => void; icon?: IconName; tone?: "warning" | "danger" }) {
  const { colors } = useMobileStyles(() => ({}));
  return <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tone === "danger" ? colors.dangerSurface : colors.warningSurface, alignItems: "center", justifyContent: "center" }}><AppIcon name={icon} size={18} color={colors.text} /></View>
    <View style={{ flex: 1, minWidth: 1 }}><Text style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>{body ? <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{body}</Text> : null}</View>
    {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}><Text style={[figmaType.button, { color: colors.primary }]}>{action}</Text></Pressable> : null}
  </View>;
}

/** Overline over a 16/800 title (section heading used on the add form). */
export function HeadingPair({ overline, title }: { overline: string; title: string }) {
  const { colors } = useMobileStyles(() => ({}));
  return <View><Overline muted={false}>{overline}</Overline><Text style={[figmaType.titleSection, { color: colors.text }]}>{title}</Text></View>;
}

export function ErrorLine({ children }: { children: ReactNode }) {
  const { colors } = useMobileStyles(() => ({}));
  return <Text accessibilityLiveRegion="polite" role="alert" style={[figmaType.bodySmall, { color: colors.expense }]}>{children}</Text>;
}
