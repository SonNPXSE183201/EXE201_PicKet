import { useState, type PropsWithChildren, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import { figmaShadows, figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

/** Soft Figma drop shadows (stub, paper, camera, dock) as RN boxShadow. */
export function figmaShadow(name: keyof typeof figmaShadows, tint?: string): ViewStyle {
  const s = figmaShadows[name];
  const hex = (opacity: number) => Math.round(Math.min(1, opacity) * 255).toString(16).padStart(2, "0");
  // Device screens render the 7% Figma shadow almost invisibly, so paper/stub get a slightly firmer ambient layer plus a tight contact shadow.
  const lift = name === "paper" || name === "stub" ? 1.6 : 1;
  const layers: { offsetX: number; offsetY: number; blurRadius: number; color: string }[] = [{ offsetX: 0, offsetY: s.offsetY, blurRadius: s.radius, color: (tint ?? s.color) + hex(s.opacity * lift) }];
  if (lift > 1) layers.push({ offsetX: 0, offsetY: 1, blurRadius: 2, color: (tint ?? s.color) + hex(0.08) });
  return { boxShadow: layers };
}

export const figmaText = figmaType;

/** Figma SectionHeader: purple overline + 16 title, optional "link" or "add" action. */
export function SectionHeader({ overline, title, action = "none", actionLabel, actionAccessibilityLabel, onAction, style }: {
  overline?: string; title: string; action?: "none" | "link" | "add"; actionLabel?: string; actionAccessibilityLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <View style={[styles.sectionHeader, style]}>
    <View style={{ flex: 1 }}>
      {overline ? <Text style={styles.overline}>{overline.toUpperCase()}</Text> : null}
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
    </View>
    {action === "link" && actionLabel && onAction ? <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}><Text style={styles.sectionLink}>{actionLabel}</Text></Pressable> : null}
    {action === "add" && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionAccessibilityLabel ?? actionLabel} onPress={onAction} style={styles.sectionAdd}><AppIcon name="plus" size={22} color={colors.primary} /></Pressable> : null}
  </View>;
}

/** Figma Chip. success/warning = status, neutral = selected filter, outline = unselected filter. */
export function Chip({ label, tone = "neutral", size = "medium", onPress, style }: { label: string; tone?: "success" | "warning" | "neutral" | "outline"; size?: "small" | "medium"; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const palette = { success: [colors.successSurface, colors.success], warning: [colors.warningSurface, colors.warning], neutral: [colors.selectedSurface, colors.primary], outline: ["transparent", colors.text] }[tone];
  const body = <View style={[styles.chip, size === "small" && { paddingVertical: 2, paddingHorizontal: 8 }, { backgroundColor: palette[0] }, tone === "outline" && { borderWidth: 1, borderColor: colors.border }, style]}><Text style={[size === "small" ? figmaType.micro : { fontSize: 11, lineHeight: 16, fontWeight: "800" }, { color: palette[1] }]}>{label}</Text></View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
}

/** Figma Button: Primary / Secondary / Outline / Text × Large 48 / Medium 40. */
export function FigmaButton({ label, onPress, variant = "primary", size = "large", icon, disabled = false, busy = false, fullWidth = false, style }: {
  label: string; onPress(): void; variant?: "primary" | "secondary" | "outline" | "text"; size?: "large" | "medium"; icon?: IconName; disabled?: boolean; busy?: boolean; fullWidth?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const fg = variant === "primary" ? colors.onPrimary : variant === "text" ? colors.primary : colors.text;
  const bg = variant === "primary" ? colors.primary : variant === "secondary" ? colors.selectedSurface : variant === "outline" ? colors.surface : "transparent";
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, { minHeight: size === "large" ? 48 : 40, backgroundColor: bg }, variant === "outline" && { borderWidth: 1, borderColor: colors.border }, fullWidth && { alignSelf: "stretch" }, (disabled || busy) && { opacity: .5 }, pressed && { opacity: .75 }, style]}>
    {busy ? <ActivityIndicator accessibilityLabel={label} size="small" color={fg} /> : icon ? <AppIcon name={icon} size={18} color={fg} /> : null}<Text numberOfLines={1} style={[figmaType.button, { color: fg, flexShrink: 0 }]}>{label}</Text>
  </Pressable>;
}

/**
 * Figma Receipt/Edge: 10 wide x 8 deep teeth in the paper colour, hanging off the paper (absolute, so the paper's own shadow stays on the
 * rectangular body only). A shadow-tinted tooth row sits 2px behind it so the drop shadow reads along the zig-zag.
 */
export function ReceiptEdge({ direction = "bottom", color }: { direction?: "top" | "bottom"; color?: string }) {
  const { colors } = useMobileStyles(createStyles);
  const [width, setWidth] = useState(0);
  const tooth = 10, depth = 8, count = Math.ceil(width / tooth) + 1;
  const paper = color ?? colors.paper;
  const down = direction === "bottom";
  const row = (fill: string, offset: number) => <View style={{ position: "absolute", left: 0, right: 0, [down ? "top" : "bottom"]: offset, flexDirection: "row" }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={down
      ? { width: 0, height: 0, borderLeftWidth: tooth / 2, borderRightWidth: tooth / 2, borderTopWidth: depth, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: fill }
      : { width: 0, height: 0, borderLeftWidth: tooth / 2, borderRightWidth: tooth / 2, borderBottomWidth: depth, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: fill }} />)}
  </View>;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ position: "absolute", left: 0, right: 0, [down ? "bottom" : "top"]: 1 - depth, height: depth + 3, overflow: "hidden" }}>
    {row(colors.text + "2E", 2.5)}
    {row(colors.text + "14", 1.2)}
    {row(paper, 0)}
  </View>;
}

/** Dashed divider between date groups inside a receipt sheet. */
export function ReceiptDivider() {
  const { colors } = useMobileStyles(createStyles);
  return <View accessible={false} style={{ height: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, alignSelf: "stretch" }} />;
}

/** White receipt sheet with rounded top, zig-zag bottom and soft Paper shadow. */
export function ReceiptSheet({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={styles.receiptSheet}><View style={[styles.receiptBody, figmaShadow("paper"), style]}>{children}<ReceiptEdge direction="bottom" /></View></View>;
}

/** Date-group caption used on receipt sheets and stubs. */
export function Overline({ children, muted = true }: PropsWithChildren<{ muted?: boolean }>) {
  const { colors } = useMobileStyles(createStyles);
  return <Text style={[figmaType.overline, { color: muted ? colors.muted : colors.primary }]}>{typeof children === "string" ? children.toUpperCase() : children}</Text>;
}

/** Row/Transaction: 36 tile tinted with a pocket colour + title/meta + signed amount. */
export function TransactionRow({ tile, title, meta, amount, amountColor, onPress, tileColor }: { tile: ReactNode; title: string; meta?: string; amount: string; amountColor?: string; onPress?: () => void; tileColor?: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={styles.txRow}>
    <View style={[styles.tile, { backgroundColor: tileColor ?? colors.pocketCoral }]}>{tile}</View>
    <View style={{ flex: 1, minWidth: 1 }}><Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>{meta ? <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted }]}>{meta}</Text> : null}</View>
    <Text numberOfLines={1} style={[figmaType.amountRow, { color: amountColor ?? colors.text, fontVariant: ["tabular-nums"], maxWidth: "42%" }]}>{amount}</Text>
  </Pressable>;
}

/** Dashed "add" card (Pocket/Add). layout="wide" is the new-user row, "card" is the scroller tail. */
export function DashedAddCard({ label, description, layout = "wide", onPress, cardWidth = 110 }: { label: string; description?: string; layout?: "wide" | "card"; onPress(): void; cardWidth?: number | `${number}%` }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const plus = <View style={styles.plus}><AppIcon name="plus" size={20} color={colors.primary} /></View>;
  return layout === "card"
    ? <Pressable accessibilityRole="button" onPress={onPress} style={[styles.addCard, { width: cardWidth, height: 162, gap: 8, justifyContent: "center", alignItems: "center" }]}>{plus}<Text numberOfLines={1} style={[figmaType.button, { color: colors.primary, textAlign: "center", alignSelf: "stretch" }]}>{label}</Text></Pressable>
    : <Pressable accessibilityRole="button" onPress={onPress} style={[styles.addCard, { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 }]}>{plus}<View style={{ flex: 1 }}><Text style={[figmaType.bodyStrong, { color: colors.text }]}>{label}</Text>{description ? <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{description}</Text> : null}</View></Pressable>;
}

/** Loading placeholder block (Skeleton): elevated colour at 65-75% opacity. */
export function Skeleton({ width, height, radius, style, tone = "elevated" }: { width?: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle>; tone?: "elevated" | "onDark" }) {
  const { colors } = useMobileStyles(createStyles);
  return <View accessible={false} importantForAccessibility="no" style={[{ width, height, borderRadius: radius ?? height / 2, backgroundColor: tone === "onDark" ? "#FFFFFF" : colors.elevated, opacity: tone === "onDark" ? .22 : .7 }, style]} />;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  overline: { ...figmaType.overline, color: colors.primary },
  sectionTitle: { ...figmaType.titleSection, color: colors.text },
  sectionLink: { ...figmaType.bodyStrong, color: colors.primary },
  sectionAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.selectedSurface, alignItems: "center", justifyContent: "center" },
  chip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 24, paddingHorizontal: 20 },
  receiptSheet: { alignSelf: "stretch", marginBottom: 8 },
  receiptBody: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16, gap: 8 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4, minHeight: 44 },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addCard: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.muted, borderRadius: 24 },
  plus: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
