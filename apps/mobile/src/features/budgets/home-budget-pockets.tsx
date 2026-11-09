import { useTranslation } from "react-i18next";
import { defaultPocketAppearance } from "./pocket-appearance";
import { usePocketAppearance } from "./use-pocket-appearance";
import { PicketText as Text } from "@/core/ui/picket-text";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { useBudgets } from "./budgets-context";
import { useAppTheme } from "../settings/appearance-provider";
import { formatMoney } from "../../core/i18n/formatters";
import { useMobileStyles } from "../../core/theme/use-mobile-styles";
import type { MobileThemeColors } from "../../core/theme/mobile-theme-adapter";
import { resolvePaperAsset } from "../../core/theme/paper-assets";
import { PaperArt } from "../../core/ui/paper-art";
import { AccessiblePressable as Pressable } from "../../core/ui/accessible-pressable";
import { Chip, DashedAddCard, SectionHeader, Skeleton, figmaShadow } from "../../core/ui/figma-ui";
import { budgetOverview } from "../../core/local/budget-overview";
import { guestBudgetSpent } from "../../core/local/guest-finance";
import { useGuestFinance } from "../../core/local/guest-finance-context";
import { useAuth } from "../auth/auth-context";
import { useTransactions } from "../transactions/transactions-context";

const create = () => router.push({ pathname: "/budgets", params: { create: "1" } });

/** Pocket/Folder scroller. Spent comes from the same budget overview helpers as the budget screen. */
export function HomeBudgetPockets() {
  const { t } = useTranslation("overview");
  const { appearances } = usePocketAppearance();
  const { budgets, loading, error } = useBudgets();
  const { transactions } = useTransactions();
  const guest = useGuestFinance();
  const { localMode } = useAuth();
  const { language } = useAppTheme();
  const { colors, styles } = useMobileStyles(createStyles);
  const vi = language === "vi";
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const items = budgets.filter(budget => budget.active && !budget.deletedAt).slice(0, 6);
  const header = <SectionHeader overline={t("pocketLabel")} title={t("pocketTitle")} action={items.length ? "add" : "none"} actionLabel={t("homeBudgetAdd")} actionAccessibilityLabel={vi ? "Thêm ngân sách" : "Add budget"} onAction={create} />;
  if (loading && !items.length) return <View style={styles.section}>{header}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{[0, 1, 2].map(i => <View key={i} accessible={false} style={styles.skeletonCard}><Skeleton width={32} height={32} radius={11} /><Skeleton width={64} height={8} /><Skeleton width={92} height={14} /><Skeleton width={116} height={4} /></View>)}</ScrollView></View>;
  if (error && !items.length) return <View style={styles.section}>{header}<Pressable accessibilityRole="alert" onPress={() => router.push("/budgets")}><Text style={styles.caption}>{vi ? "Chưa tải được ngân sách. Mở để thử lại." : "Budgets unavailable. Open to retry."}</Text></Pressable></View>;
  if (!items.length) return <View style={styles.section}>{header}<DashedAddCard label={t("homeFirstPocket")} description={t("homeFirstPocketBody")} onPress={create} /></View>;
  return <View style={styles.section}>{header}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroller} style={{ marginHorizontal: -20 }}>
      {items.map(budget => {
        const appearance = appearances[budget.id] ?? defaultPocketAppearance(budget.id, budget.name);
        const tone = colors[appearance.tone];
        const limit = budgetOverview(budget, month, transactions, null, []).limit || budget.defaultLimit;
        const spent = localMode ? guestBudgetSpent(guest.data, budget, month) : budgetOverview(budget, month, transactions, null, []).spent;
        const percent = limit > 0 ? Math.round(spent / limit * 100) : 0;
        const near = percent >= 80;
        const fill = Math.max(0, Math.min(100, percent));
        return <Pressable key={budget.id} accessibilityRole="button" accessibilityLabel={`${budget.name}, ${formatMoney(Math.max(0, limit - spent), language, "VND")} ${t("homeBudgetLeft")}`} onPress={() => router.push("/budgets")} hitSlop={0} style={styles.folder}>
          <View style={[styles.tab, { backgroundColor: tone }]}><Text numberOfLines={1} style={[figmaType.captionStrong, { color: colors.text }]}>{budget.name}</Text></View>
          <View style={[styles.body, { backgroundColor: tone, borderColor: tone }, figmaShadow("paper")]} />
          <View pointerEvents="none" style={styles.sticker}><PaperArt id={resolvePaperAsset(appearance.assetId)} style={{ width: 60, height: 60 }} /></View>
          <Text style={[figmaType.bodySmall, styles.left, { color: colors.text }]}>{t("homeBudgetLeft")}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[figmaType.amountPocket, styles.remain, { color: colors.text }]}>{formatMoney(Math.max(0, limit - spent), language, "VND")}</Text>
          <View style={styles.progress}><View style={{ width: `${fill}%`, backgroundColor: near ? colors.warning : colors.text }} /><View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.6)" }} /></View>
          <Text numberOfLines={1} style={[figmaType.bodySmall, styles.used, { color: colors.text }]}>{t("homeBudgetUsed", { percent, limit: formatMoney(limit, language, "VND") })}</Text>
          {near && <View style={styles.near}><Chip tone="warning" size="small" label={t("homeBudgetNear")} /></View>}
        </Pressable>;
      })}
      <DashedAddCard layout="card" label={t("homeBudgetAdd")} onPress={create} />
    </ScrollView>
  </View>;
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  section: { gap: 12 }, caption: { color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  scroller: { paddingHorizontal: 20, gap: 12, alignItems: "flex-end" },
  skeletonCard: { width: 148, height: 188, padding: 16, gap: 10, justifyContent: "flex-end", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 12 },
  folder: { width: 148, height: 188, minHeight: 188, minWidth: 148, overflow: "visible" },
  tab: { position: "absolute", top: 0, left: 0, height: 28, maxWidth: 148, justifyContent: "center", paddingLeft: 12, paddingRight: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  body: { position: "absolute", top: 26, left: 0, width: 148, height: 162, borderWidth: 1.5, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderTopRightRadius: 24 },
  sticker: { position: "absolute", left: 78, top: 6, transform: [{ rotate: "8deg" }] },
  left: { position: "absolute", left: 14, top: 70 }, remain: { position: "absolute", left: 14, right: 12, top: 86 },
  progress: { position: "absolute", left: 14, top: 120, width: 120, height: 6, borderRadius: 3, overflow: "hidden", flexDirection: "row" },
  used: { position: "absolute", left: 14, right: 8, top: 132 }, near: { position: "absolute", left: 14, top: 158 },
});
