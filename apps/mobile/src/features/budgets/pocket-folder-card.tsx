import { figmaType } from "@picket/design-tokens";
import { StyleSheet, View } from "react-native";

import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { resolvePaperAsset } from "@/core/theme/paper-assets";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Chip, figmaShadow } from "@/core/ui/figma-ui";
import { PaperArt } from "@/core/ui/paper-art";
import { PicketText as Text } from "@/core/ui/picket-text";
import type { PocketAppearance } from "./pocket-appearance";

/** Figma E2 Pocket/Folder grid card: tab + remaining amount + progress + usage. */
export function PocketFolderCard({ name, appearance, remainingLabel, remaining, percent, usedLabel, nearLabel, accessibilityLabel, onPress }: {
  name: string; appearance: PocketAppearance; remainingLabel: string; remaining: string; percent: number; usedLabel: string; nearLabel: string; accessibilityLabel: string; onPress(): void;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const tone = colors[appearance.tone];
  const near = percent >= 80;
  const fill = Math.max(0, Math.min(100, percent));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.card}>
      <View style={[styles.tab, { backgroundColor: tone }]}><Text numberOfLines={1} style={[figmaType.captionStrong, { color: colors.text }]}>{name}</Text></View>
      <View style={[styles.body, { backgroundColor: tone }, figmaShadow("paper")]}>
        <View pointerEvents="none" style={styles.sticker}><PaperArt id={resolvePaperAsset(appearance.assetId)} style={{ width: 60, height: 60 }} /></View>
        <View style={styles.copy}>
          <Text style={[figmaType.bodySmall, { color: colors.text }]}>{remainingLabel}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[figmaType.amountPocket, { color: colors.text }]}>{remaining}</Text>
          <View style={styles.progress}>
            <View style={{ width: `${fill}%`, backgroundColor: near ? colors.warning : colors.text }} />
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.6)" }} />
          </View>
          <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.text }]}>{usedLabel}</Text>
          {near && <View style={styles.near}><Chip tone="warning" size="small" label={nearLabel} /></View>}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (_: MobileThemeColors) => StyleSheet.create({
  card: { width: "48%", minHeight: 188 },
  tab: { height: 28, alignSelf: "flex-start", maxWidth: "100%", justifyContent: "center", paddingLeft: 12, paddingRight: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  body: { marginTop: -2, flex: 1, minHeight: 162, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: 14, justifyContent: "flex-end" },
  sticker: { position: "absolute", right: 4, top: -18, transform: [{ rotate: "8deg" }] },
  copy: { gap: 2, marginTop: 40 },
  progress: { height: 6, borderRadius: 3, overflow: "hidden", flexDirection: "row", marginVertical: 4 },
  near: { alignSelf: "flex-start", marginTop: 4 },
});
