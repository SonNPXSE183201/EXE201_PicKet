import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PaperArt } from "@/core/ui/paper-art";
import { AppIcon } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { paperArtOptions, resolvePaperAsset } from "@/core/theme/paper-assets";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { pocketTones, type PocketAppearance } from "./pocket-appearance";

export function PocketAppearancePicker({ value, onChange, name, amount, disabled = false }: { value: PocketAppearance; onChange(value: PocketAppearance): void; name: string; amount: string; disabled?: boolean }) {
  const { t } = useTranslation("overview");
  const { colors: c, styles } = useMobileStyles(createStyles);
  return <View style={styles.stack}>
    <View style={styles.previewWrap}>
      <View style={styles.previewCard}>
        <View style={[styles.previewTab, { backgroundColor: c[value.tone] }]}><Text numberOfLines={1} style={styles.previewTabText}>{name}</Text></View>
        <View style={[styles.previewBody, { backgroundColor: c[value.tone] }]}>
          <View style={styles.previewArt}><PaperArt id={resolvePaperAsset(value.assetId)} style={{ width: 64, height: 64 }} /></View>
          <Text style={styles.caption}>{t("pocketMonthly")}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>{amount}</Text>
        </View>
      </View>
    </View>
    <Text style={styles.label}>{t("pocketArt").toUpperCase()}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}><View accessibilityRole="radiogroup" accessibilityLabel={t("pocketArt")} style={styles.options}>{paperArtOptions.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={t(option.label, { defaultValue: option.id })} accessibilityState={{ checked: value.assetId === option.id, disabled }} disabled={disabled} onPress={() => onChange({ ...value, assetId: option.id })} style={[styles.option, value.assetId === option.id && styles.active]}><PaperArt id={option.id} style={{ width: 44, height: 44 }} /></Pressable>)}</View></ScrollView>
    <Text style={styles.label}>{t("pocketColor").toUpperCase()}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("pocketColor")} style={styles.options}>{pocketTones.map((tone, index) => <Pressable key={tone} accessibilityRole="radio" accessibilityLabel={t(["paperCoral", "paperMint", "paperBlue", "paperLilac"][index])} accessibilityState={{ checked: value.tone === tone, disabled }} disabled={disabled} onPress={() => onChange({ ...value, tone })} style={[styles.swatch, value.tone === tone && styles.active]}><View style={[styles.color, { backgroundColor: c[tone] }]}>{value.tone === tone && <AppIcon name="check" color={c.text} size={18} />}</View></Pressable>)}</View>
    <Text style={styles.caption}>{t("pocketDeviceOnly")}</Text>
  </View>;
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  stack: { gap: 12 },
  previewWrap: { alignItems: "center", paddingVertical: 12 },
  previewCard: { width: 148, height: 188, transform: [{ rotate: "-6deg" }] },
  previewTab: { position: "absolute", top: 0, left: 0, height: 28, maxWidth: 140, justifyContent: "center", paddingLeft: 12, paddingRight: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  previewTabText: { ...figmaType.captionStrong, color: c.text },
  previewBody: { position: "absolute", top: 26, left: 0, right: 0, bottom: 0, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: 14, justifyContent: "flex-end", gap: 2 },
  previewArt: { position: "absolute", right: 6, top: -16, transform: [{ rotate: "8deg" }] },
  amount: { ...figmaType.amountPocket, color: c.text },
  caption: { ...figmaType.bodySmall, color: c.text },
  label: { ...figmaType.overline, color: c.primary, marginTop: 4 },
  options: { flexDirection: "row", gap: 8, flexWrap: "nowrap", alignItems: "center", paddingVertical: 2 },
  option: { width: 60, height: 60, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  active: { borderColor: c.primary, borderWidth: 2 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: "transparent", justifyContent: "center", alignItems: "center" },
  color: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
