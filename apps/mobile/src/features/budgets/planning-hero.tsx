import { figmaType } from "@picket/design-tokens";
import { Image, StyleSheet, View } from "react-native";

import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { PicketText as Text } from "@/core/ui/picket-text";

const jar = require("../../../assets/paper-v3/wallet/save-jar-v1.webp");

const copy = {
  vi: { remaining: "Còn có thể chi", daysLeft: (days: number) => `${days} ngày nữa`, spent: "Đã chi", over: "Vượt hạn mức" },
  en: { remaining: "Left to spend", daysLeft: (days: number) => `${days} days left`, spent: "Spent", over: "Over budget" },
};

/** Figma E1 plum summary pouch: remaining amount, progress and spent/planned. */
export function PlanningHero({ language, remaining, planned, spent, daysLeft, formatMoney }: {
  language: string; remaining: number | null; planned: number; spent: number | null; daysLeft: number | null; formatMoney(amount: number): string;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const text = language.startsWith("vi") ? copy.vi : copy.en;
  const ratio = planned > 0 && spent !== null ? Math.min(1, spent / planned) : 0;
  return (
    <View style={styles.hero} accessible accessibilityLabel={`${text.remaining} ${remaining === null ? "" : formatMoney(remaining)}`}>
      <View pointerEvents="none" style={styles.stitch} />
      <Image accessible={false} source={jar} resizeMode="contain" style={styles.art} />
      <Text style={[figmaType.bodySmall, { color: colors.onPrimary, opacity: 0.85 }]}>
        {remaining !== null && remaining < 0 ? text.over : text.remaining}{daysLeft !== null ? ` · ${text.daysLeft(daysLeft)}` : ""}
      </Text>
      <Text style={[figmaType.amountHero, { color: colors.onPrimary }]}>{remaining === null ? "—" : formatMoney(remaining)}</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} /></View>
      <Text style={[figmaType.bodySmall, { color: colors.onPrimary, opacity: 0.85 }]}>
        {text.spent} {spent === null ? "—" : formatMoney(spent)} / {formatMoney(planned)}
      </Text>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  hero: { backgroundColor: colors.camera, borderRadius: 28, borderBottomLeftRadius: 14, padding: 24, gap: 8, overflow: "hidden" },
  stitch: { position: "absolute", top: 7, left: 7, right: 7, bottom: 7, borderRadius: 22, borderBottomLeftRadius: 9, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.5)" },
  art: { position: "absolute", right: 10, bottom: 10, width: 72, height: 72 },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", marginRight: 76 },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.pocketCoral },
});
