import { StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { figmaShadow } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

/** Figma Card/Wallet: file-folder cover with a name tab and a tinted body. */
export function WalletCard({ name, kindLabel, amount, meta, tone, icon, onPress }: {
  name: string; kindLabel: string; amount: string; meta: string; tone: string; icon: IconName; onPress(): void;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${amount}`} onPress={onPress} style={styles.card}>
    <View style={[styles.tab, { backgroundColor: tone }]}><Text numberOfLines={1} style={[figmaType.captionStrong, { color: colors.text }]}>{name}</Text></View>
    <View style={[styles.body, { backgroundColor: tone, borderColor: tone }]}>
      <View style={styles.tile}><AppIcon name={icon} size={18} color={colors.text} /></View>
      <View style={{ height: 18 }} />
      <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{kindLabel}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[figmaType.amountPocket, { color: colors.text }]}>{amount}</Text>
      <Text numberOfLines={1} style={[figmaType.micro, { color: colors.muted }]}>{meta}</Text>
    </View>
  </Pressable>;
}

/** Plum pouch with the total and the save-jar art (G1 hero). */
export function WalletTotalPouch({ label, total, lines = 1, footer, art = "savings" }: { label: string; total: string; lines?: number; footer: string; art?: "savings" | "bloom" }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const extra = Math.max(0, lines - 1) * 40;
  return <View style={{ height: 144 + extra, alignSelf: "stretch" }}>
    <View style={[styles.pouch, { height: 136 + extra }, figmaShadow("camera", "#000000")]}>
      <View pointerEvents="none" style={[styles.stitch, { height: 120 + extra }]} />
      <Text style={[figmaType.captionStrong, { color: colors.onCamera, position: "absolute", left: 24, right: 100, top: 24 }]}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={Math.max(1, lines)} style={[figmaType.amountHero, { color: colors.onCamera, position: "absolute", left: 24, right: 100, top: 44 }]}>{total}</Text>
      <Text style={[figmaType.bodySmall, { color: colors.onCamera, position: "absolute", left: 24, right: 100, top: 98 + extra }]}>{footer}</Text>
    </View>
    <View pointerEvents="none" style={{ position: "absolute", right: -8, top: 40 + extra }}><PaperArt id={art} style={{ width: art === "bloom" ? 128 : 96, height: 96 }} /></View>
  </View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  card: { width: "46.5%" },
  tab: { alignSelf: "flex-start", maxWidth: 148, paddingHorizontal: 12, paddingVertical: 5, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  body: { padding: 14, gap: 4, borderWidth: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 24, borderTopRightRadius: 24 },
  tile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  pouch: { position: "absolute", left: 0, right: 0, top: 0, backgroundColor: colors.camera, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomRightRadius: 32, borderBottomLeftRadius: 16 },
  stitch: { position: "absolute", left: 8, right: 8, top: 8, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.onCamera, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomRightRadius: 25, borderBottomLeftRadius: 10 },
});
