import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
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
    <View style={[styles.preview, { backgroundColor: c[value.tone] }]}><View style={{ flex: 1 }}><Text style={styles.name}>{name}</Text><Text style={styles.amount}>{amount}</Text><Text style={styles.caption}>{t("pocketMonthly")}</Text></View><PaperArt id={resolvePaperAsset(value.assetId)} style={{ width: 72, height: 72 }} /></View>
    <Text style={styles.label}>{t("pocketArt")}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}><View accessibilityRole="radiogroup" accessibilityLabel={t("pocketArt")} style={styles.options}>{paperArtOptions.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={t(option.label, { defaultValue: option.id })} accessibilityState={{ checked: value.assetId === option.id, disabled }} disabled={disabled} onPress={() => onChange({ ...value, assetId: option.id })} style={[styles.option, value.assetId === option.id && styles.active]}><PaperArt id={option.id} style={{ width: 40, height: 40 }} /><Text style={styles.optionLabel}>{t(option.label, { defaultValue: option.id })}</Text>{value.assetId === option.id && <View style={styles.check}><AppIcon name="check-circle" size={18} color={c.primary} /></View>}</Pressable>)}</View></ScrollView>
    <Text style={styles.label}>{t("pocketColor")}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("pocketColor")} style={styles.options}>{pocketTones.map((tone, index) => <Pressable key={tone} accessibilityRole="radio" accessibilityLabel={t(["paperCoral", "paperMint", "paperBlue", "paperLilac"][index])} accessibilityState={{ checked: value.tone === tone, disabled }} disabled={disabled} onPress={() => onChange({ ...value, tone })} style={[styles.swatch, value.tone === tone && styles.active]}><View style={[styles.color, { backgroundColor: c[tone] }]}>{value.tone === tone && <AppIcon name="check" color={c.text} size={20} />}</View></Pressable>)}</View>
    <Text style={styles.caption}>{t("pocketDeviceOnly")}</Text>
  </View>;
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  stack: { gap: 10 }, preview: { padding: 16, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: c.text, fontSize: 15, lineHeight: 22, fontWeight: "600" }, amount: { color: c.text, fontSize: 24, fontWeight: "800", marginVertical: 4 },
  caption: { color: c.text, fontSize: 12, lineHeight: 18 }, label: { color: c.muted, fontSize: 13, fontWeight: "600" }, options: { flexDirection: "row", gap: 8, flexWrap: "nowrap" },
  option: { position: "relative", width: 72, padding: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.canvas, borderRadius: 14, alignItems: "center", gap: 4 },
  optionLabel: { color: c.text, fontSize: 11, textAlign: "center" }, active: { borderColor: c.primaryOutline, borderWidth: 2 }, check: { position: "absolute", top: 3, right: 3 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: c.border, justifyContent: "center", alignItems: "center" }, color: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
