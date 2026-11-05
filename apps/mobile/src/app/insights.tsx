import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatVnd } from "@picket/domain";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { figmaType } from "@picket/design-tokens";
import { ReceiptDivider, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { FieldOverline, ManagementEmpty } from "@/features/management/management-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useSpendingSplits } from "@/features/transactions/use-spending-splits";
import { categorySpending } from "@/core/ui/category-spending";

export default function InsightsScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { profile } = useProfile();
  const { categories } = useTransactions();
  const { error, refresh, transactions } = useTransactionHistory();
  const [monthOffset, setMonthOffset] = useState(0);

  const month = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const selectedMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const { splits, loading: splitLoading, error: splitError } = useSpendingSplits(transactions, selectedMonth);

  const summary = useMemo(() => {
    const selected = transactions.filter((item) => {
      const date = new Date(item.occurredAt);
      return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
    });
    const income = selected.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = selected.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
    const refunds = selected.filter((item) => item.kind === "refund").reduce((sum, item) => sum + item.amount, 0);
    const categoryMap = new Map(categories.map((item) => [item.id, item]));
    const breakdown = categorySpending(transactions, selectedMonth, splits).map(({ id, amount }) => {
      const cat = categoryMap.get(id);
      return {
        id,
        amount,
        name: cat?.name ?? "Chưa phân loại",
        icon: cat?.icon ?? null,
      };
    });
    const weeks = [0, 0, 0, 0];
    for (const item of selected) if (item.kind === "expense") weeks[Math.min(3, Math.floor((new Date(item.occurredAt).getDate() - 1) / 7))] += item.amount;
    return { income, expense: Math.max(0, expense - refunds), breakdown, weeks, hasData: selected.length > 0 };
  }, [categories, month, transactions, selectedMonth, splits]);

  const prevKey = `${new Date(month.getFullYear(), month.getMonth() - 1, 1).getFullYear()}-${String(new Date(month.getFullYear(), month.getMonth() - 1, 1).getMonth() + 1).padStart(2, "0")}`;
  const previous = useMemo(() => new Map(categorySpending(transactions, prevKey, []).map((row) => [row.id, row.amount])), [transactions, prevKey]);

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const hidden = Boolean(profile?.hideBalance);
  const money = (value: number) => (hidden ? "••••••" : formatVnd(value));
  const tones = [colors.pocketCoral, colors.pocketLilac, colors.pocketMint, colors.pocketBlue];
  const top = summary.breakdown.slice(0, 4);
  const restAmount = summary.breakdown.slice(4).reduce((sum, item) => sum + item.amount, 0);
  const rows = [...top.map((item, index) => ({ key: item.id, name: item.name, amount: item.amount, color: tones[index % tones.length] })), ...(restAmount > 0 ? [{ key: "rest", name: "Khác", amount: restAmount, color: colors.elevated }] : [])];
  const percentOf = (amount: number) => (summary.expense > 0 ? Math.round((amount / summary.expense) * 100) : 0);
  const maxRow = Math.max(1, ...rows.map((row) => row.amount));
  const maxWeek = Math.max(1, ...summary.weeks);
  const shortTr = (value: number) => `${(value / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")}tr`;
  const today = new Date();
  const currentWeek = monthOffset === 0 ? Math.min(3, Math.floor((today.getDate() - 1) / 7)) : -1;
  const lead = summary.breakdown.map((item) => ({ item, before: previous.get(item.id) ?? 0 })).filter((row) => row.before > 0).map((row) => ({ ...row, change: Math.round(((row.item.amount - row.before) / row.before) * 100) })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const title = `Tháng ${month.getMonth() + 1}, ${month.getFullYear()}`;

  const switcher = <View style={styles.switcher}>
    <Pressable accessibilityLabel="Tháng trước" accessibilityRole="button" onPress={() => setMonthOffset((value) => value - 1)} style={styles.monthBtn}><AppIcon name="chevron-left" size={16} color={colors.text} /></Pressable>
    <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>
    <Pressable accessibilityLabel="Tháng sau" accessibilityRole="button" disabled={monthOffset >= 0} onPress={() => setMonthOffset((value) => Math.min(0, value + 1))} style={[styles.monthBtn, monthOffset >= 0 && { opacity: 0.4 }]}><AppIcon name="chevron-right" size={16} color={colors.text} /></Pressable>
  </View>;

  return (
    <PicketScreen>
      <TopAppBar title="Thống kê" />
      <View style={styles.block}>{switcher}</View>
      {error && (
        <Pressable accessibilityRole="button" onPress={() => void refresh()}>
          <Text accessibilityLiveRegion="polite" style={styles.warning}>{error} Chạm để tải lại.</Text>
        </Pressable>
      )}
      {splitError ? <Text accessibilityLiveRegion="polite" style={styles.warning}>{splitError}</Text> : null}
      {!summary.hasData && !splitLoading ? (
        <ManagementEmpty art="bloom" title={`Tháng ${month.getMonth() + 1} chưa có số liệu`} body={"Ghi vài khoản chi để thấy tiền\nđang đi về đâu."} />
      ) : (
        <>
          <View style={[styles.block, styles.summary]}>
            <View style={{ gap: 2 }}>
              <Text style={[figmaType.bodySmall, { color: colors.muted }]}>Đã chi</Text>
              <Text style={[figmaType.titleSection, styles.large]}>{money(summary.expense)}</Text>
            </View>
            <View style={{ gap: 2, alignItems: "flex-end" }}>
              <Text style={[figmaType.bodySmall, { color: colors.muted }]}>Đã thu</Text>
              <Text style={[figmaType.bodyStrong, { color: colors.income }]}>{hidden ? "••••••" : `+${formatVnd(summary.income)}`}</Text>
            </View>
          </View>

          {rows.length > 0 && <View style={[styles.block, figmaShadow("paper")]}>
            <View style={styles.paper}>
              <FieldOverline>Theo danh mục</FieldOverline>
              <View style={styles.bars}>
                {rows.map((row) => <View key={row.key} style={styles.barCol}>
                  <Text style={[figmaType.captionStrong, { color: colors.text }]}>{percentOf(row.amount)}%</Text>
                  <View style={[styles.bar, { height: Math.max(24, Math.round((row.amount / maxRow) * 118)), backgroundColor: row.color }]} />
                  <Text numberOfLines={1} style={[figmaType.micro, { color: colors.muted, maxWidth: 56 }]}>{row.name}</Text>
                </View>)}
              </View>
              <ReceiptDivider />
              {rows.map((row) => <View key={row.key} style={styles.legend}>
                <View style={[styles.swatch, { backgroundColor: row.color }]} />
                <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>{row.name}</Text>
                <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{percentOf(row.amount)}%</Text>
                <Text style={[figmaType.amountRow, { color: colors.text, width: 100, textAlign: "right" }]}>{money(row.amount)}</Text>
              </View>)}
            </View>
            <ReceiptEdge direction="bottom" />
          </View>}

          <View style={[styles.block, { gap: 10 }]}>
            <FieldOverline>Nhịp 4 tuần</FieldOverline>
            <View style={styles.weeks}>
              {summary.weeks.map((value, index) => { const now = index === currentWeek; const fill = Math.round((value / maxWeek) * 52);
                return <View key={index} style={styles.weekCol}>
                  <Text style={[figmaType.micro, { color: now ? colors.primary : colors.muted }]}>{hidden ? "••" : shortTr(value)}</Text>
                  <View style={[styles.track, { backgroundColor: now ? colors.selectedSurface : colors.border }]}><View style={{ position: "absolute", bottom: 0, width: 26, height: Math.max(value > 0 ? 13 : 0, fill), borderRadius: 13, backgroundColor: now ? colors.primary : colors.pocketLilac }} /></View>
                  <Text style={[now ? figmaType.tabActive : figmaType.tab, { color: now ? colors.primary : colors.muted }]}>{`Tuần ${index + 1}`}</Text>
                </View>; })}
            </View>
          </View>

          {lead && <View style={styles.insight}>
            <View style={styles.insightTile}><AppIcon name="star-four-points-outline" size={18} color={colors.text} /></View>
            <Text style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>{lead.change <= 0 ? `${lead.item.name} giảm ${Math.abs(lead.change)}% so với tháng ${new Date(month.getFullYear(), month.getMonth() - 1, 1).getMonth() + 1}. Bạn đang đi đúng hướng.` : `${lead.item.name} tăng ${lead.change}% so với tháng ${new Date(month.getFullYear(), month.getMonth() - 1, 1).getMonth() + 1}. Hãy để mắt tới khoản này.`}</Text>
          </View>}
        </>
      )}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    block: { marginTop: 20 },
    switcher: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    monthBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    summary: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    large: { fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.text },
    warning: { color: colors.warning, fontSize: 13, marginTop: 12 },
    paper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16, gap: 10 },
    bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 6 },
    barCol: { alignItems: "center", gap: 6 },
    bar: { width: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
    legend: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    weeks: { flexDirection: "row", justifyContent: "space-between" },
    weekCol: { width: 44, alignItems: "center", gap: 6 },
    track: { width: 26, height: 52, borderRadius: 13, overflow: "hidden" },
    insight: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, paddingLeft: 12, paddingRight: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
    insightTile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.pocketMint, alignItems: "center", justifyContent: "center" },
  });
