import { StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { ReceiptEdge, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

export type StubState = { kind: "default"; title: string; amount: string } | { kind: "empty"; title: string; hint: string } | { kind: "hidden"; title: string };

/** Hero/Balance: plum pouch with a stitched edge and the "today" receipt stub tucked behind it. */
export function HomeHero({ label, balance, lines = 1, hidden, onToggle, toggleLabel, wallets, onWallets, stub }: {
  label: string; balance: string; lines?: number; hidden: boolean; onToggle(): void; toggleLabel: string; wallets?: string; onWallets?: () => void; stub: StubState;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const extra = Math.max(0, lines - 1) * 40;
  return <View style={[styles.hero, { height: 180 + extra }]}>
    <View pointerEvents="none" style={[styles.stub, figmaShadow("stub")]}>
      <ReceiptEdge direction="top" />
      <View style={styles.stubPaper}>
        <Text style={[figmaType.overline, { color: colors.muted }]}>{stub.title.toUpperCase()}</Text>
        {stub.kind === "default" && <Text style={[figmaType.amountRow, { color: colors.expense }]}>{stub.amount}</Text>}
        {stub.kind === "empty" && <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{stub.hint}</Text>}
        {stub.kind === "hidden" && <Text style={[figmaType.amountRow, { color: colors.muted }]}>••••••</Text>}
      </View>
    </View>
    <View style={[styles.pouch, { height: 108 + extra }, figmaShadow("camera", "#000000")]}>
      <View pointerEvents="none" style={[styles.stitch, { height: 92 + extra }]} />
      <View style={styles.labelRow}>
        <Text numberOfLines={1} style={[figmaType.captionStrong, { color: colors.onCamera, flexShrink: 0 }]}>{label}</Text>
        <Pressable accessibilityLabel={toggleLabel} accessibilityRole="button" onPress={onToggle} style={styles.eye}><AppIcon name={hidden ? "eye-off-outline" : "eye-outline"} size={16} color={colors.onCamera} /></Pressable>
      </View>
      {wallets && onWallets ? <Pressable accessibilityRole="button" onPress={onWallets} style={styles.wallets}><Text style={[figmaType.captionStrong, { color: colors.onCamera }]}>{wallets}</Text><AppIcon name="chevron-right" size={16} color={colors.onCamera} /></Pressable> : null}
      <Text adjustsFontSizeToFit minimumFontScale={.6} numberOfLines={Math.max(1, lines)} style={[styles.amount, { color: colors.onCamera }]}>{balance}</Text>
    </View>
    <View pointerEvents="none" style={[styles.art, { top: 100 + extra }]}><PaperArt id="bloom" style={{ width: 100, height: 84 }} /></View>
  </View>;
}

/** Loading variant of Hero/Balance (Nhà / Đang tải). */
export function HomeHeroSkeleton({ label }: { label: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return <View style={styles.hero}>
    <View style={[styles.stub, figmaShadow("stub")]}>
      <ReceiptEdge direction="top" />
      <View style={[styles.stubPaper, { gap: 8 }]}><Skeleton width={100} height={8} /><Skeleton width={72} height={14} /></View>
    </View>
    <View style={[styles.pouch, figmaShadow("camera", "#000000")]}>
      <View pointerEvents="none" style={styles.stitch} />
      <View style={styles.labelRow}><Text style={[figmaType.captionStrong, { color: colors.onCamera }]}>{label}</Text></View>
      <Skeleton tone="onDark" width={160} height={28} radius={10} style={{ position: "absolute", left: 24, top: 50 }} />
      <Skeleton tone="onDark" width={46} height={24} radius={12} style={{ position: "absolute", left: 250, top: 12 }} />
    </View>
    <View pointerEvents="none" style={[styles.art, { top: 100 }]}><PaperArt id="bloom" style={{ width: 100, height: 84 }} /></View>
  </View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  hero: { height: 180, alignSelf: "stretch" },
  stub: { position: "absolute", top: 0, right: 16, width: 170, transform: [{ rotate: "5deg" }] },
  stubPaper: { backgroundColor: colors.paper, paddingTop: 5, paddingHorizontal: 12, paddingBottom: 40 },
  pouch: { position: "absolute", left: 0, right: 0, top: 60, height: 108, backgroundColor: colors.camera, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomRightRadius: 32, borderBottomLeftRadius: 16 },
  stitch: { position: "absolute", left: 8, right: 8, top: 8, height: 92, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.onCamera, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomRightRadius: 25, borderBottomLeftRadius: 10 },
  labelRow: { position: "absolute", left: 24, right: 96, top: 10, flexDirection: "row", alignItems: "center", minHeight: 44, marginTop: -10 },
  eye: { width: 44, height: 44, marginLeft: -6, alignItems: "center", justifyContent: "center" },
  wallets: { position: "absolute", right: 24, top: 12, height: 24, flexDirection: "row", alignItems: "center", minHeight: 24, minWidth: 24 },
  amount: { position: "absolute", left: 24, right: 90, top: 42, fontSize: 34, lineHeight: 42, fontWeight: "800", letterSpacing: -0.6, fontVariant: ["tabular-nums"] },
  art: { position: "absolute", right: -12 },
});
