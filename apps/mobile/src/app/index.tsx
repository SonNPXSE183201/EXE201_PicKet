import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { BrandLogo } from "@/core/ui/brand-logo";
import { HomeReceiptCalendar } from "@/core/ui/home-receipt-calendar";
import { AppIcon } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, EmptyState, FloatingAction, IconButton, MenuRow, PicketScreen, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { PartnerNotice } from "@/features/partners/partner-notice";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function HomeScreen() {
  const { receiptMonth } = useLocalSearchParams<{ receiptMonth?: string }>();
  const initialMonth = typeof receiptMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(receiptMonth) ? receiptMonth : undefined;
  return <HomeContent key={initialMonth ?? "current"} initialMonth={initialMonth} />;
}

function HomeContent({ initialMonth }: { initialMonth?: string }) {
  const { configured, loading: authLoading, localMode, session } = useAuth();
  const { error: profileError, loading: profileLoading, profile, refresh, updatePreferences } = useProfile();
  const { accounts, error: accountsError, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { error: transactionsError, refresh: refreshTransactions, transactions } = useTransactions();
  const { conflictCount, flush, pendingCount, syncing } = useSync();
  const [month, setMonth] = useState(() => initialMonth ? new Date(Number(initialMonth.slice(0, 4)), Number(initialMonth.slice(5)) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthly = transactions.filter((item) => { const date = new Date(item.occurredAt); return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth(); });
  const visible = [...monthly].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const balance = accounts.reduce((sum, item) => sum + item.openingBalance, 0) + transactions.reduce((sum, item) => sum + (item.kind === "expense" ? -item.amount : item.kind === "income" || item.kind === "refund" ? item.amount : 0), 0);
  const income = monthly.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = Math.max(0, monthly.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0) - monthly.filter((item) => item.kind === "refund").reduce((sum, item) => sum + item.amount, 0));
  const money = (value: number) => profile?.hideBalance ? "••••••" : formatVnd(value);
  if (authLoading || ((session || localMode) && !profile && (profileLoading || accountsLoading))) return <View style={styles.loading}><ActivityIndicator accessibilityLabel="Đang tải tổng quan tài chính" color={colors.mauve} /></View>;
  if ((!configured || !session) && !localMode) return <Redirect href={routes.login} />;
  if (!profileError && !profile?.onboardingCompleted) return <Redirect href={routes.onboarding} />;
  return <View style={styles.root}><PicketScreen>
    <View style={styles.header}><BrandLogo size={48} /><View style={{ flex: 1 }}><Text style={styles.greeting}>Chào {profile?.displayName || "bạn"}</Text><Text accessibilityRole="header" style={styles.heading}>Tài chính của bạn</Text></View><IconButton icon="bell-outline" label="Thông báo" onPress={() => router.push(routes.notifications)} /><Pressable accessibilityLabel="Hồ sơ của bạn" onPress={() => router.push(routes.profile)} style={styles.avatar}><Text style={styles.avatarText}>{(profile?.displayName || "P").slice(0, 1).toUpperCase()}</Text></Pressable></View>
    <Surface peach style={styles.balanceCard}><View style={styles.between}><Text style={styles.balanceLabel}>Tổng số dư</Text><IconButton icon={profile?.hideBalance ? "eye-off-outline" : "eye-outline"} label={profile?.hideBalance ? "Hiện số dư" : "Ẩn số dư"} onPress={() => void updatePreferences({ hide_balance: !profile?.hideBalance })} /></View><Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>{money(balance)}</Text><Pressable onPress={() => router.navigate(routes.accounts)} style={styles.walletLink}><AppIcon name="wallet-outline" size={18} color={colors.ink} /><Text style={styles.walletLinkText}>{accounts.length} ví của bạn</Text><AppIcon name="chevron-right" size={18} color={colors.ink} /></Pressable></Surface>
    <View style={styles.period}><IconButton icon="chevron-left" label="Tháng trước" onPress={() => setMonth((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))} /><Text style={styles.periodText}>Tháng {month.getMonth() + 1}, {month.getFullYear()}</Text><IconButton icon="chevron-right" label="Tháng sau" onPress={() => setMonth((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))} /></View>
    <View style={styles.summary}><Surface style={styles.summaryCard}><AppIcon name="arrow-bottom-left" size={22} color={colors.income} /><Text style={styles.meta}>Thu nhập</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.summaryAmount, { color: colors.income }]}>{money(income)}</Text></Surface><Surface style={styles.summaryCard}><AppIcon name="arrow-top-right" size={22} color={colors.expense} /><Text style={styles.meta}>Chi tiêu</Text><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.summaryAmount, { color: colors.expense }]}>{money(expense)}</Text></Surface></View>
    <View style={styles.quickActions}><Pressable accessibilityLabel="Thêm giao dịch" onPress={() => router.push(routes.newTransaction)} style={[styles.primary, { flex: 0, width: 56, height: 56 }]}><AppIcon name="plus" color={colors.white} size={22} /></Pressable><Pressable onPress={() => router.push(routes.newTransfer)} style={styles.secondary}><AppIcon name="swap-horizontal" size={22} /><Text style={styles.secondaryText}>Chuyển tiền</Text></Pressable></View>
    {(profileError || accountsError || transactionsError) && <ConnectionNotice hasData={Boolean(profile || accounts.length || transactions.length)} onRetry={() => void Promise.all([refresh(), refreshAccounts(), refreshTransactions()])} />}
    {(localMode || pendingCount > 0) && <Pressable onPress={() => { if (!localMode) void flush(); }} accessibilityState={{ busy: syncing }} style={styles.status}><AppIcon name={syncing ? "sync" : localMode ? "cellphone-check" : "cloud-sync-outline"} size={17} color={colors.muted} /><Text style={styles.statusText}>{localMode ? "Lưu riêng trên thiết bị" : syncing ? "Đang đồng bộ…" : `${pendingCount} thay đổi đã lưu, chờ đồng bộ`}</Text></Pressable>}
    {conflictCount > 0 && <MenuRow icon="alert-circle-outline" title={`${conflictCount} thay đổi cần kiểm tra`} onPress={() => router.push(routes.syncConflicts)} />}
    <HomeReceiptCalendar month={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`} transactions={transactions} />
    <SectionTitle title="Giao dịch gần đây" action="Xem tất cả" onAction={() => router.push(routes.transactions)} />
    {visible.length === 0 ? <EmptyState action="Thêm giao dịch" description="Ghi lại khoản thu hoặc chi đầu tiên trong tháng." onAction={() => router.push(routes.newTransaction)} title="Chưa có giao dịch" /> : <Surface style={styles.list}>{visible.slice(0, 5).map((item, index) => <Pressable key={item.id} onPress={() => router.push(routes.transaction(item.id))} style={[styles.row, index > 0 && styles.divider]}><View style={styles.transactionIcon}><AppIcon name={item.kind === "transfer" ? "swap-horizontal" : item.kind === "expense" ? "arrow-top-right" : "arrow-bottom-left"} size={22} color={item.kind === "expense" ? colors.expense : item.kind === "transfer" ? colors.mauve : colors.income} /></View><View style={styles.copy}><Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text><Text style={styles.meta}>{new Date(item.occurredAt).toLocaleDateString("vi-VN")}</Text></View><Text style={[styles.rowAmount, { color: item.kind === "expense" ? colors.expense : item.kind === "transfer" ? colors.mauve : colors.income }]}>{money(item.amount)}</Text></Pressable>)}</Surface>}
    <SectionTitle title="Theo dõi và nhắc việc" /><Surface style={styles.tools}><MenuRow icon="chart-donut" title="Ngân sách" description="Theo dõi hạn mức chi tiêu trong tháng" onPress={() => router.push(routes.budgets)} /><MenuRow icon="calendar-check-outline" title="Hóa đơn sắp đến hạn" onPress={() => router.push(routes.bills)} /><MenuRow icon="chart-box-outline" title="Thống kê thu chi" onPress={() => router.push(routes.insights)} /></Surface>
    {!localMode && <PartnerNotice />}
  </PicketScreen><FloatingAction label="Quét hóa đơn" icon="line-scan" onPress={() => router.push(routes.capture)} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 16, marginBottom: 8 }, greeting: { color: colors.muted, fontSize: 14, lineHeight: 22 }, heading: { color: colors.ink, fontSize: 25, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  avatar: { alignItems: "center", justifyContent: "center", backgroundColor: colors.peach, borderRadius: 24 }, avatarText: { fontSize: 20, fontWeight: "700", color: colors.ink },
  balanceCard: { padding: 24 }, between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, balanceLabel: { fontSize: 15, color: colors.ink }, balance: { fontSize: 38, lineHeight: 48, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: -1, color: colors.ink }, walletLink: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, marginTop: 8 }, walletLinkText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  period: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8 }, periodText: { color: colors.ink, fontSize: 14, fontWeight: "600", paddingHorizontal: 12 }, summary: { flexDirection: "row", gap: 12 }, summaryCard: { flex: 1, gap: 6, padding: 16 }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, summaryAmount: { fontSize: 20, lineHeight: 28, fontWeight: "700", fontVariant: ["tabular-nums"] },
  quickActions: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 8 }, primary: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.mauve, paddingVertical: 14, borderRadius: 28 }, primaryText: { color: colors.white, fontSize: 14, fontWeight: "700" }, secondary: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderColor: colors.mauve, borderWidth: 1, borderRadius: 28 }, secondaryText: { color: colors.mauve, fontSize: 14, fontWeight: "700" },
  status: { flexDirection: "row", alignItems: "center", gap: 8 }, statusText: { color: colors.muted, fontSize: 12, flex: 1 }, list: { padding: 8 }, row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, padding: 8 }, divider: { borderTopWidth: 1, borderTopColor: colors.line }, transactionIcon: { backgroundColor: colors.cream, width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, gap: 4 }, rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "600", lineHeight: 20 }, rowAmount: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"], maxWidth: "40%" }, tools: { paddingVertical: 4 },
});
