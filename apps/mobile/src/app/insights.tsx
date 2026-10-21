import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, EmptyState, PicketScreen, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useSpendingSplits } from "@/features/transactions/use-spending-splits";
import { categorySpending } from "@/core/ui/category-spending";

export default function InsightsScreen() {
  const { session, localMode } = useAuth();
  const { profile } = useProfile();
  const { categories } = useTransactions();
  const { error, loading, refresh, transactions } = useTransactionHistory();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const selectedMonth = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
  const { splits, loading: splitLoading, error: splitError } = useSpendingSplits(transactions, selectedMonth);
  const summary = useMemo(() => {
    const selected = transactions.filter((item) => {
      const date = new Date(item.occurredAt);
      return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
    });
    const income = selected.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = selected.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
    const refunds = selected.filter((item) => item.kind === "refund").reduce((sum, item) => sum + item.amount, 0);
    const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
    const breakdown = categorySpending(transactions, selectedMonth, splits).map(({id,amount}) => ({id,amount,name:categoryNames.get(id) ?? "Chưa phân loại"}));
    return { income, expense: Math.max(0, expense - refunds), breakdown };
  }, [categories, month, transactions, selectedMonth, splits]);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const changeMonth = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  return <PicketScreen>
    <TopAppBar title="Thống kê" />
    <Text style={styles.subtitle}>Hiểu dòng tiền theo từng tháng và danh mục.</Text>
    <Surface><View style={styles.monthRow}>
      <Pressable accessibilityLabel="Tháng trước" accessibilityRole="button" onPress={() => changeMonth(-1)}><Text style={styles.arrow}>‹</Text></Pressable>
      <Text style={styles.month}>Tháng {month.getMonth() + 1}/{month.getFullYear()}</Text>
      <Pressable accessibilityLabel="Tháng sau" accessibilityRole="button" onPress={() => changeMonth(1)}><Text style={styles.arrow}>›</Text></Pressable>
    </View></Surface>
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()}><Text accessibilityLiveRegion="polite" style={styles.warning}>{error} Chạm để tải lại.</Text></Pressable>}
    {loading && <Text style={styles.warning}>Đang tải toàn bộ lịch sử để tính thống kê…</Text>}
    {(!loading || transactions.length > 0) && <>
      <SectionTitle title="Chênh lệch thu − chi" />
      <Surface peach><Text style={styles.total}>{profile?.hideBalance ? "••••••" : formatVnd(summary.income - summary.expense)}</Text>
        <View style={styles.totals}><Text style={styles.label}>Thu nhập: {profile?.hideBalance ? "••••••" : formatVnd(summary.income)}</Text><Text style={styles.label}>Chi tiêu ròng: {profile?.hideBalance ? "••••••" : formatVnd(summary.expense)}</Text></View>
      </Surface>
      <SectionTitle title="Bạn đã chi cho điều gì?" />
      {splitError ? <Text accessibilityLiveRegion="polite" style={styles.warning}>{splitError}</Text> : splitLoading ? null : summary.breakdown.length === 0 ? <EmptyState title="Chưa có chi tiêu trong tháng" description="Phân bổ sẽ xuất hiện khi bạn ghi giao dịch." symbol="▥" /> :
        <View style={styles.stack}>{summary.breakdown.map((item) => { const percent = summary.expense > 0 ? Math.round(item.amount / summary.expense * 100) : 0; return <Surface key={item.id}><View style={styles.categoryRow}><Text style={styles.categoryName}>{item.name}</Text><Text style={styles.categoryAmount}>{profile?.hideBalance ? "••••••" : formatVnd(item.amount)} · {percent}%</Text></View><View accessibilityLabel={`${item.name}: ${percent}% chi tiêu`} style={styles.progressTrack}><View style={[styles.progressFill,{width:`${Math.min(100,percent)}%`}]} /></View></Surface>; })}</View>}
    </>}
  </PicketScreen>;
}

const styles = StyleSheet.create({
  back:{color:colors.mauve,fontSize:15,fontWeight:"800",marginBottom:18},heading:{color:colors.ink,fontSize:29,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,marginBottom:22,marginTop:7},monthRow:{alignItems:"center",flexDirection:"row",justifyContent:"space-between"},arrow:{color:colors.mauve,fontSize:30},month:{color:colors.ink,fontSize:16,fontWeight:"800"},warning:{color:colors.expense,fontSize:13,lineHeight:20,marginTop:16},total:{color:colors.ink,fontSize:32,fontWeight:"800"},totals:{gap:8,marginTop:16},label:{color:colors.ink,fontSize:14},stack:{gap:10},categoryRow:{alignItems:"center",flexDirection:"row",gap:12,justifyContent:"space-between"},categoryName:{color:colors.ink,flex:1,fontSize:15,fontWeight:"700"},categoryAmount:{color:colors.expense,fontSize:15,fontWeight:"800"},progressTrack:{backgroundColor:colors.cream,borderRadius:4,height:7,marginTop:12,overflow:"hidden"},progressFill:{backgroundColor:colors.coral,borderRadius:4,height:7},
});
