import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { useTranslation } from "react-i18next";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { figmaShadow, ReceiptDivider } from "@/core/ui/figma-ui";
import { IconButton } from "@/core/ui/picket-ui";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { router } from "expo-router";

/** Figma sub-screen header: 44 round back button + 16/800 title. */
export function FigmaHeader({ title, onBack, backDisabled = false, right }: { title: string; onBack?: () => void; backDisabled?: boolean; right?: ReactNode }) {
  const { styles, colors } = useMobileStyles(createStyles);
  const { t } = useTranslation("common");
  return <View style={styles.header}>
    <IconButton icon="chevron-left" label={t("Quay lại")} variant="surface" disabled={backDisabled} onPress={onBack ?? (() => router.back())} />
    <Text accessibilityRole="header" numberOfLines={1} style={[figmaType.titleSection, { color: colors.text, flex: 1 }]}>{title}</Text>
    {right}
  </View>;
}

/** Purple uppercase overline label above a group. */
export function GroupLabel({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  const { colors } = useMobileStyles(createStyles);
  return <Text accessibilityRole="header" style={[figmaType.overline, { color: muted ? colors.muted : colors.primary }]}>{typeof children === "string" ? children.toUpperCase() : children}</Text>;
}

/** White rounded paper holding FieldRows split by dashed dividers. */
export function PaperGroup({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { styles } = useMobileStyles(createStyles);
  const items = Array.isArray(children) ? children.flat().filter(Boolean) : [children];
  return <View style={[styles.group, figmaShadow("paper"), style]}>
    {items.map((child, i) => <View key={i}>{i > 0 ? <ReceiptDivider /> : null}{child}</View>)}
  </View>;
}

/** Figma FieldRow: 36 tile + 11 meta + 14/700 title + trailing (chevron by default). */
export function FieldRow({ icon, meta, title, onPress, trailing, tone = "default", disabled, accessibilityLabel, children }: {
  icon: IconName; meta?: string; title: string; onPress?: () => void; trailing?: ReactNode | "chevron" | "none"; tone?: "default" | "warning"; disabled?: boolean; accessibilityLabel?: string; children?: ReactNode;
}) {
  const { styles, colors } = useMobileStyles(createStyles);
  const end = trailing === undefined || trailing === "chevron" ? (onPress ? <AppIcon name="chevron-right" size={18} color={colors.text} /> : null) : trailing === "none" ? null : trailing;
  const body = <>
    <View style={styles.tile}><AppIcon name={icon} size={20} color={colors.text} /></View>
    <View style={styles.rowText}>
      {meta ? <Text numberOfLines={1} style={{ color: colors.muted, fontWeight: "600", fontSize: 11, lineHeight: 16 }}>{meta}</Text> : null}
      {children ?? <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>}
    </View>
    {end}
  </>;
  const style = [styles.row, tone === "warning" && { backgroundColor: colors.warningSurface }];
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? [title, meta].filter(Boolean).join(", ")} disabled={disabled} onPress={onPress} style={style}>{body}</Pressable>
    : <View style={style}>{body}</View>;
}

/** Rounded cream notice card with a tinted icon tile (restore notice, tips). */
export function NoticeCard({ icon, children, tone = "warning" }: PropsWithChildren<{ icon: IconName; tone?: "warning" | "success" }>) {
  const { styles, colors } = useMobileStyles(createStyles);
  const bg = tone === "warning" ? colors.warningSurface : colors.successSurface;
  const fg = tone === "warning" ? colors.warning : colors.success;
  return <View style={styles.notice}>
    <View style={[styles.noticeTile, { backgroundColor: bg }]}><AppIcon name={icon} size={20} color={fg} /></View>
    <Text style={[figmaType.bodySmall, { color: colors.muted, flex: 1 }]}>{children}</Text>
  </View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 16 },
  group: { backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 6, overflow: "hidden" },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 14 },
  tile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 1 },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  noticeTile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
