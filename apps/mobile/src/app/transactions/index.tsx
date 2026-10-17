import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { filterTransactions } from "@/core/sync/filter-transactions";
import { AppIcon } from "@/core/ui/app-icon";
import { MonthCalendar } from "@/core/ui/month-calendar";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, ConnectionNotice, EmptyState, FloatingAction, IconButton, MenuRow, PicketScreen, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{ accountId?: string; categoryId?: string; month?: string }>();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [accountId, setAccountId] = useState(params.accountId ?? "");
  const [categoryId, setCategoryId] = useState(params.categoryId ?? "");
  const [month, setMonth] = useState(params.month ?? "");
  const [showFilters, setShowFilters] = useState(Boolean(params.categoryId || params.accountId));
  const [showTools, setShowTools] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { session, localMode } = useAuth();
  const { accounts } = useAccounts();
  const { categories, error, loading, refresh, transactions } = useTransactions();
  const { flush, lastSyncedAt, pendingCount, syncing } = useSync();
  useEffect(() => { if (lastSyncedAt !== null) void refresh(); }, [lastSyncedAt, refresh]);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const accountNames = new Map(accounts.map((item) => [item.id, item.name]));
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
  const filtered = filterTransactions(transactions, { query, kind, accountId, categoryId, month }, Object.fromEntries(categoryNames));
  const visible = calendar && month && selectedDay ? filtered.filter((item) => new Date(item.occurredAt).getDate() === selectedDay) : filtered;
  const changeMonth = (offset: number) => { const value = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T12:00:00`) : new Date(); value.setMonth(value.getMonth() + offset); setMonth(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`); setSelectedDay(null); };
  return <View style={styles.root}><PicketScreen>
    <TopAppBar title="Giao dịch" back={false} action={<IconButton icon="dots-horizontal" label="Công cụ giao dịch" onPress={() => setShowTools(!showTools)} />} />
    {showTools && <Surface style={styles.tools}><MenuRow icon="inbox-arrow-down-outline" title="Giao dịch cần kiểm tra" onPress={() => router.push(routes.reviewInbox)} /><MenuRow icon="checkbox-multiple-outline" title="Chỉnh sửa nhiều giao dịch" onPress={() => router.push(routes.bulkTransactions)} /><MenuRow icon="scale-balance" title="Đối soát ví" onPress={() => router.push(routes.reconcile)} /><MenuRow icon="swap-horizontal" title="Chuyển tiền" onPress={() => router.push(routes.newTransfer)} /></Surface>}
    <View style={styles.searchRow}><View style={styles.searchBox}><AppIcon name="magnify" color={colors.muted} /><TextInput accessibilityLabel="Tìm giao dịch, danh mục hoặc ghi chú" onChangeText={setQuery} placeholder="Tìm giao dịch" placeholderTextColor={colors.muted} style={styles.search} value={query} />{query.length > 0 && <IconButton icon="close" label="Xóa tìm kiếm" onPress={() => setQuery("")} />}</View><IconButton icon={showFilters ? "filter-check-outline" : "filter-variant"} label={showFilters ? "Ẩn bộ lọc" : "Mở bộ lọc"} onPress={() => setShowFilters(!showFilters)} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{[["", "Tất cả"], ["expense", "Chi tiêu"], ["income", "Thu nhập"], ["transfer", "Chuyển ví"], ["refund", "Hoàn tiền"]].map(([value, label]) => <ChoiceChip checked={kind === value} key={value} label={label} onPress={() => setKind(value)} />)}</ScrollView>
    <View style={styles.period}><IconButton icon="chevron-left" label="Tháng trước" onPress={() => changeMonth(-1)} /><Pressable onPress={() => { if (month) setMonth(""); else changeMonth(0); }} style={styles.periodButton}><AppIcon name="calendar-month-outline" size={18} /><Text style={styles.periodText}>{month ? `Tháng ${month.slice(5)}/${month.slice(0, 4)}` : "Tất cả thời gian"}</Text><AppIcon name="chevron-down" size={18} /></Pressable><IconButton icon="chevron-right" label="Tháng sau" onPress={() => changeMonth(1)} /></View>
    {showFilters && <Surface style={styles.filterPanel}><Text style={styles.filterLabel}>Ví</Text><View style={styles.filters}><ChoiceChip checked={!accountId} label="Mọi ví" onPress={() => setAccountId("")} />{accounts.map((item) => <ChoiceChip checked={accountId === item.id} key={item.id} label={item.name} onPress={() => setAccountId(item.id)} />)}</View><Text style={styles.filterLabel}>Danh mục</Text><View style={styles.filters}><ChoiceChip checked={!categoryId} label="Mọi danh mục" onPress={() => setCategoryId("")} />{categories.map((item) => <ChoiceChip checked={categoryId === item.id} key={item.id} label={item.name} onPress={() => setCategoryId(item.id)} />)}</View><Text style={styles.filterLabel}>Tháng cụ thể</Text><TextInput accessibilityLabel="Lọc tháng YYYY-MM" onChangeText={setMonth} placeholder="YYYY-MM hoặc để trống" placeholderTextColor={colors.muted} style={styles.monthInput} value={month} /><Pressable onPress={() => { setKind(""); setAccountId(""); setCategoryId(""); setMonth(""); setQuery(""); }}><Text style={styles.reset}>Đặt lại bộ lọc</Text></Pressable></Surface>}
    {pendingCount > 0 && <Pressable accessibilityState={{ busy: syncing }} onPress={() => void flush()} style={styles.sync}><AppIcon name="cloud-sync-outline" size={18} /><Text style={styles.hint}>{syncing ? "Đang đồng bộ…" : `${pendingCount} thay đổi đã lưu trên thiết bị`}</Text></Pressable>}
    {error && <ConnectionNotice hasData={transactions.length > 0} onRetry={() => void refresh()} />}
    <View style={styles.listHeader}><Text style={styles.filterLabel}>{visible.length} giao dịch</Text><View style={{ flexDirection: "row" }}><IconButton icon={calendar ? "format-list-bulleted" : "calendar-month-outline"} label={calendar ? "Xem danh sách" : "Xem lịch tháng"} onPress={() => { if (!month) changeMonth(0); setCalendar(!calendar); setSelectedDay(null); }} /><IconButton icon="line-scan" label="Quét hóa đơn" onPress={() => router.push(routes.capture)} /></View></View>
    {calendar && month && <MonthCalendar month={month} activeDays={new Set(filtered.map((item) => new Date(item.occurredAt).getDate()))} selected={selectedDay} onSelect={setSelectedDay} />}
    {loading && transactions.length === 0 ? <ActivityIndicator accessibilityLabel="Đang tải giao dịch" color={colors.mauve} style={styles.loader} /> : visible.length === 0 ? <EmptyState action="Thêm giao dịch" description="Thử thay đổi bộ lọc hoặc ghi một khoản thu, chi mới." onAction={() => router.push(routes.newTransaction)} title="Chưa có giao dịch phù hợp" /> : <Surface style={styles.list}>{visible.map((item, index) => <Pressable key={item.id} onPress={() => router.push(routes.transaction(item.id))} style={[styles.row, index > 0 && styles.border]}><View style={styles.badge}><AppIcon name={item.kind === "transfer" ? "swap-horizontal" : item.kind === "expense" ? "arrow-top-right" : "arrow-bottom-left"} size={22} color={item.kind === "expense" ? colors.expense : item.kind === "transfer" ? colors.mauve : colors.income} /></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.hint}>{categoryNames.get(item.categoryId ?? "") ?? "Chưa phân loại"} · {accountNames.get(item.accountId) ?? "Tài khoản"}</Text><Text style={styles.date}>{new Date(item.occurredAt).toLocaleDateString("vi-VN")}</Text></View><Text style={[styles.amount, { color: item.kind === "expense" ? colors.expense : item.kind === "transfer" ? colors.mauve : colors.income }]}>{item.kind === "expense" ? "−" : item.kind === "transfer" ? "" : "+"}{formatVnd(item.amount)}</Text></Pressable>)}</Surface>}
  </PicketScreen><FloatingAction iconOnly label="Thêm giao dịch" onPress={() => router.push(routes.newTransaction)} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.cream }, tools: { paddingVertical: 4, marginBottom: 16 }, searchRow: { flexDirection: "row", alignItems: "center", gap: 8 }, searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 28, paddingLeft: 16 }, search: { flex: 1, minHeight: 56, color: colors.ink, fontSize: 15, paddingHorizontal: 10 }, chips: { gap: 8, paddingVertical: 16 }, period: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, periodButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }, periodText: { color: colors.ink, fontWeight: "600", fontSize: 14 }, filterPanel: { gap: 12, marginBottom: 16 }, filterLabel: { color: colors.ink, fontSize: 14, fontWeight: "600" }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, monthInput: { color: colors.ink, backgroundColor: colors.cream, minHeight: 52, borderRadius: 12, paddingHorizontal: 16 }, reset: { color: colors.mauve, fontWeight: "700", paddingVertical: 14 }, sync: { flexDirection: "row", gap: 8, alignItems: "center" }, hint: { color: colors.muted, fontSize: 12, lineHeight: 18 }, listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, loader: { marginTop: 48 }, list: { padding: 8 }, row: { alignItems: "center", flexDirection: "row", minHeight: 86, padding: 8, gap: 12 }, border: { borderTopColor: colors.line, borderTopWidth: 1 }, badge: { alignItems: "center", backgroundColor: colors.cream, borderRadius: 16, height: 42, justifyContent: "center", width: 42 }, copy: { flex: 1, gap: 3 }, title: { color: colors.ink, fontSize: 14, fontWeight: "600", lineHeight: 20 }, date: { color: colors.muted, fontSize: 11, lineHeight: 16 }, amount: { maxWidth: "38%", fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] } });
