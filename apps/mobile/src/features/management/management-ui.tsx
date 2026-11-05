import type { PropsWithChildren, ReactNode } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import type { PaperAssetId } from "@/core/theme/paper-assets";
import { ReceiptDivider, figmaShadow } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

/** White paper card (radius 18, Paper shadow) used for grouped rows in the management screens. */
export function PaperCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={[styles.paperCard, figmaShadow("paper"), style]}>{children}</View>;
}

/** Figma FieldRow: 36 tile + 11 label + 14 value (children replace the value for inputs). */
export function FieldRow({ icon, label, value, trailing, onPress, children }: PropsWithChildren<{ icon: IconName; label: string; value?: string; trailing?: ReactNode; onPress?: () => void }>) {
  const { colors, styles } = useMobileStyles(createStyles);
  const body = <>
    <View style={styles.fieldTile}><AppIcon name={icon} size={20} color={colors.text} /></View>
    <View style={{ flex: 1 }}>
      <Text style={[figmaType.tab, { color: colors.muted }]}>{label}</Text>
      {children ?? <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{value}</Text>}
    </View>
    {trailing}
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.fieldRow}>{body}</Pressable>
    : <View style={styles.fieldRow}>{body}</View>;
}

export function FieldDivider() { return <ReceiptDivider />; }

/** Figma CategoryTile (52 tile + 11 label) for small pickers. */
export function TypeTile({ icon, label, selected, color, onPress }: { icon: IconName; label: string; selected: boolean; color?: string; onPress(): void }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label} onPress={onPress} style={styles.typeTile}>
    <View style={[styles.typeBox, selected ? { backgroundColor: color ?? colors.pocketMint, borderColor: colors.primary, borderWidth: 1.5 } : null]}>
      <AppIcon name={icon} size={20} color={selected ? colors.primary : colors.text} />
    </View>
    <Text style={[selected ? figmaType.tabActive : figmaType.tab, { color: selected ? colors.primary : colors.text }]}>{label}</Text>
  </Pressable>;
}

/** Empty state: Figma art + 16/800 title + body + optional action node. */
export function ManagementEmpty({ art, title, body, action }: { art: PaperAssetId | ImageSourcePropType; title: string; body: string; action?: ReactNode }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <View style={styles.empty}>
    {typeof art === "string" ? <PaperArt id={art} style={{ width: 132, height: 132 }} /> : <Image accessible={false} source={art} resizeMode="contain" style={{ width: 132, height: 132 }} />}
    <Text accessibilityRole="header" style={[figmaType.titleSection, { color: colors.text, textAlign: "center" }]}>{title}</Text>
    <Text style={[figmaType.bodySmall, { color: colors.muted, textAlign: "center" }]}>{body}</Text>
    {action ? <View style={{ marginTop: 8, alignSelf: "center" }}>{action}</View> : null}
  </View>;
}

/** Overline label (11/800 muted, uppercased). */
export function FieldOverline({ children }: { children: string }) {
  const { colors } = useMobileStyles(createStyles);
  return <Text style={[figmaType.overline, { color: colors.muted }]}>{children.toUpperCase()}</Text>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  paperCard: { backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 6, alignSelf: "stretch" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, padding: 8, borderRadius: 14 },
  fieldTile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  typeTile: { width: 68, alignItems: "center", gap: 6, minHeight: 44 },
  typeBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  segTray: { flexDirection: "row", gap: 4, height: 44, padding: 4, borderRadius: 22, backgroundColor: colors.elevated, alignSelf: "stretch" },
  seg: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  segOn: { backgroundColor: colors.paper, boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: "#30213314" }] },
  chevronRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8, paddingVertical: 10 },
  empty: { alignItems: "center", gap: 8, paddingTop: 70, paddingHorizontal: 12 },
});

/** Figma SegmentedControl: elevated tray, selected segment white with purple label. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange(value: T): void }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <View accessibilityRole="tablist" style={styles.segTray}>
    {options.map((option) => { const on = option.value === value;
      return <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} key={option.value} onPress={() => onChange(option.value)} style={[styles.seg, on && styles.segOn]}>
        <Text style={[on ? figmaType.button : figmaType.captionStrong, { color: on ? colors.primary : colors.muted }]}>{option.label}</Text>
      </Pressable>; })}
  </View>;
}

/** List row inside a PaperCard: 36 tile, title, meta, chevron. */
export function ChevronRow({ tile, tileColor, title, meta, onPress, disabled }: { tile: ReactNode; tileColor: string; title: string; meta?: string; onPress?: () => void; disabled?: boolean }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" disabled={disabled || !onPress} onPress={onPress} style={styles.chevronRow}>
    <View style={[styles.fieldTile, { backgroundColor: tileColor }]}>{tile}</View>
    <View style={{ flex: 1, gap: 1 }}>
      <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>
      {meta ? <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted }]}>{meta}</Text> : null}
    </View>
    {onPress && !disabled ? <AppIcon name="chevron-right" size={16} color={colors.muted} /> : null}
  </Pressable>;
}
