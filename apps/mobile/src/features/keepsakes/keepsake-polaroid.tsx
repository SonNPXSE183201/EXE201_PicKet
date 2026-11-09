import { StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PaperArt } from "@/core/ui/paper-art";
import type { PaperAssetId } from "@/core/theme/paper-assets";
import { Chip, figmaShadow } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { KeepsakePhoto } from "@/features/keepsakes/keepsake-photo";
import type { DisplayKeepsake } from "@/features/keepsakes/cloud-keepsakes";

const artByCategory: Record<string, PaperAssetId> = { "Công nghệ": "leisure", "Trang phục": "beauty", "Đồ dùng": "home", "Kỷ niệm": "gift" };

function warrantyLabel(until: string | null, now = Date.now()) {
  if (!until) return null;
  const days = Math.ceil((new Date(`${until}T23:59:59`).getTime() - now) / 86_400_000);
  return days >= 0 && days <= 90 ? `Bảo hành còn ${days} ngày` : null;
}

/** Figma Card/Polaroid: white frame, 112 photo window, alternating -2/+2 degree tilt. */
export function KeepsakePolaroid({ item, index, onPress }: { item: DisplayKeepsake; index: number; onPress(): void }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const date = new Date(item.date);
  const warranty = warrantyLabel(item.warrantyUntil ?? null);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${formatVnd(item.amount)}`} onPress={onPress} style={styles.slot}>
    <View style={[styles.card, figmaShadow("paper"), { transform: [{ rotate: index % 2 === 0 ? "2deg" : "-2deg" }] }]}>
      <View style={styles.photo}>
        {item.photoUri
          ? <KeepsakePhoto owner={item.userId} accessibilityLabel={`Ảnh ${item.title}`} uri={item.photoUri} style={StyleSheet.absoluteFill as never} />
          : <PaperArt id={artByCategory[item.category] ?? "shopping"} style={{ position: "absolute", left: 22, top: 10, width: 92, height: 92 }} />}
        {warranty ? <View style={styles.badge}><Chip tone="warning" label={warranty} /></View> : null}
      </View>
      <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text, marginTop: 4 }]}>{item.title}</Text>
      <Text numberOfLines={1} style={[figmaType.micro, { color: colors.muted }]}>{`${formatVnd(item.amount)} · ${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`}</Text>
    </View>
  </Pressable>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  slot: { width: 150, height: 187, alignItems: "center", justifyContent: "center" },
  card: { width: 144, backgroundColor: colors.paper, borderRadius: 6, paddingTop: 6, paddingHorizontal: 6, paddingBottom: 12, gap: 0 },
  photo: { height: 112, borderRadius: 3, backgroundColor: colors.elevated, overflow: "hidden" },
  badge: { position: "absolute", left: 6, top: 82 },
});
