import { useTranslation } from "react-i18next";
import { defaultPocketAppearance } from "./pocket-appearance";
import { usePocketAppearance } from "./use-pocket-appearance";
import { PicketText as Text } from "@/core/ui/picket-text";
import { router } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useBudgets } from "./budgets-context";
import { useAppTheme } from "../settings/appearance-provider";
import { formatMoney } from "../../core/i18n/formatters";
import { useMobileStyles } from "../../core/theme/use-mobile-styles";
import type { MobileThemeColors } from "../../core/theme/mobile-theme-adapter";
import { resolvePaperAsset } from "../../core/theme/paper-assets";
import { PaperArt } from "../../core/ui/paper-art";
import { AccessiblePressable as Pressable } from "../../core/ui/accessible-pressable";
import { AppIcon } from "../../core/ui/app-icon";

/** Budget limits only: spent/remaining still use the authoritative budget screen. */
export function HomeBudgetPockets() {
  const { t } = useTranslation("overview");
  const { appearances } = usePocketAppearance();
  const { budgets, loading, error } = useBudgets();
  const { language } = useAppTheme();
  const { colors, styles } = useMobileStyles(createStyles);
  const { width, fontScale } = useWindowDimensions();
  const vi = language === "vi";
  const items = budgets.filter(budget => budget.active && !budget.deletedAt).slice(0, 3);
  return <View style={styles.section}>
    <Text style={{ color: colors.link, fontSize: 11, letterSpacing: 1.1, fontWeight: "800", marginBottom: 4 }}>{t("pocketLabel")}</Text>
    <View style={styles.headingRow}><Text accessibilityRole="header" style={styles.heading}>{t("pocketTitle")}</Text><Pressable accessibilityRole="button" accessibilityLabel={vi ? "Xem ngân sách" : "View budgets"} onPress={() => router.push({ pathname: "/budgets", params: { create: "1" } })}><AppIcon name="plus" color={colors.link} /></Pressable></View>
    {loading && !items.length ? <Text style={styles.caption}>{vi ? "Đang tải ngân sách…" : "Loading budgets…"}</Text> : error && !items.length ? <Text accessibilityRole="alert" style={styles.caption}>{vi ? "Chưa tải được ngân sách. Mở để thử lại." : "Budgets unavailable. Open to retry."}</Text> : null}
    <View style={styles.grid}>{items.map((budget, index) => {
      const appearance = appearances[budget.id] ?? defaultPocketAppearance(budget.id, budget.name);
      return <Pressable key={budget.id} accessibilityRole="button" onPress={() => router.push("/budgets")} style={[styles.pocket, { backgroundColor: colors[appearance.tone], width: width < 360 || fontScale > 1.3 ? "100%" : "48%", minHeight: 112 }]}>
        <Text style={styles.name}>{budget.name}</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>{formatMoney(budget.defaultLimit, language, "VND")}</Text>
        <Text style={styles.caption}>{vi ? "mỗi tháng" : "per month"}</Text>
        <PaperArt id={resolvePaperAsset(appearance.assetId)} style={styles.art} />
      </Pressable>;
    })}</View>
    {!loading && !error && !items.length && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/budgets", params: { create: "1" } })} style={styles.empty}><Text style={styles.name}>{vi ? "+ Thêm chiếc túi đầu tiên" : "+ Add your first pocket"}</Text><Text style={styles.caption}>{vi ? "Đặt ngân sách cho điều bạn quan tâm." : "Make room for what matters to you."}</Text></Pressable>}
  </View>;
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  section: { marginTop: 20, marginBottom: 12 }, headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  heading: { color: c.text, fontSize: 20, fontWeight: "800", flexShrink: 1 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  pocket: { minHeight: 126, padding: 14, paddingBottom: 32, borderTopLeftRadius: 32, borderTopRightRadius: 30, borderBottomRightRadius: 30, borderBottomLeftRadius: 14, overflow: "hidden" },
  name: { color: c.text, fontSize: 14, fontWeight: "600" }, amount: { color: c.text, fontSize: 24, fontWeight: "800", marginVertical: 6 }, caption: { color: c.text, fontSize: 12, lineHeight: 18 },
  art: { position: "absolute", bottom: 4, right: 4, width: 72, height: 48 }, empty: { padding: 20, gap: 8, borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: c.controlBorder },
});
