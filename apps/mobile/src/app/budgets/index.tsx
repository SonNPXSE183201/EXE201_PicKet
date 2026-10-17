import { colors, radii } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { budgetOverview } from "@/core/local/budget-overview";
import { loadBudgetSplits } from "@/core/local/load-budget-splits";
import { guestBudgetSpent } from "@/core/local/guest-finance";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ActionSheet, ConnectionNotice, DangerAction, EmptyState, IconButton, MenuRow, PicketScreen, PrimaryAction, SectionTitle, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function BudgetsScreen() {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const { categories, transactions } = useTransactions();
  const { budgets, loading, error, create, update, archive, refresh } = useBudgets();
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("1000000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedLimit, setEditedLimit] = useState("");
  const [periodLimits, setPeriodLimits] = useState<{ month: string; limits: Record<string, number> } | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [cloudSplits, setCloudSplits] = useState<{ month: string; splits: Awaited<ReturnType<typeof loadBudgetSplits>> } | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const { fontScale } = useWindowDimensions();
  const monthText = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  useFocusEffect(useCallback(() => {
    if (localMode || !session || !picketApi) return;
    let active = true;
    void picketApi.getPlanning(session.access_token, monthText)
      .then((planning) => { if (active) { setPeriodLimits({ month: monthText, limits: Object.fromEntries(planning.periods.map((period) => [period.budgetId, period.limit])) }); setPeriodError(null); } })
      .catch(() => { if (active) { setPeriodLimits(null); setPeriodError("Không tải được hạn mức của tháng; đang hiển thị hạn mức mặc định."); } });
    return () => { active = false; };
  }, [localMode, monthText, session]));
  useFocusEffect(useCallback(() => {
    if (localMode || !session || !picketApi) return;
    const api = picketApi;
    let active = true;
    setCloudSplits(null);
    setSplitError(null);
    void loadBudgetSplits(transactions, monthText, async (ids) => (await api.listTransactionSplitsByIds(session.access_token, ids)).splits)
      .then((splits) => { if (active) setCloudSplits({ month: monthText, splits }); })
      .catch(() => { if (active) setSplitError("Không tải được phân bổ danh mục; chưa thể tính chính xác số đã chi."); });
    return () => { active = false; };
  }, [localMode, monthText, session, transactions]));
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const expenseCategories = categories.filter((item) => item.kind === "expense" || item.kind === "both");
  const managing = budgets.find((item) => item.id === managingId);
  const editing = budgets.find((item) => item.id === editingId);
  const selected = expenseCategories.find((item) => item.id === categoryId) ?? expenseCategories[0];
  async function add() {
    if (!selected || !/^\d+$/.test(limit) || Number(limit) <= 0) { setMessage("Chọn danh mục và nhập hạn mức hợp lệ."); return; }
    setBusy(true); setMessage(null);
    try { await create({ categoryId: selected.id, name: selected.name, defaultLimit: Number(limit), alertPercent: 80 }); setLimit("1000000"); setShowCreate(false); }
    catch (caught) { if (!isOfflineQueuedError(caught)) setMessage("Không tạo được ngân sách. Một danh mục chỉ có một ngân sách đang hoạt động."); }
    finally { setBusy(false); }
  }
  async function archiveBudget(id: string, version: number) {
    setBusy(true); setMessage(null);
    try { await archive(id, version); }
    catch (caught) { if (!isOfflineQueuedError(caught)) setMessage("Không lưu trữ được ngân sách."); }
    finally { setBusy(false); }
  }
  async function saveLimit(id: string, version: number) {
    const amount = Number(editedLimit);
    if (!/^\d+$/.test(editedLimit) || !Number.isSafeInteger(amount) || amount <= 0) { setMessage("Nhập hạn mức hợp lệ."); return; }
    setBusy(true); setMessage(null);
    try { await update(id, { expectedVersion: version, defaultLimit: amount }); setEditingId(null); }
    catch (caught) { if (isOfflineQueuedError(caught)) { setEditingId(null); setMessage("Đã lưu trên máy, chờ đồng bộ."); } else setMessage("Không cập nhật được hạn mức."); }
    finally { setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title="Ngân sách" subtitle="Chi tiêu trong tầm tay, từng tháng một." back={false} action={<IconButton icon={showCreate ? "close" : "plus"} label={showCreate ? "Đóng tạo ngân sách" : "Thêm ngân sách"} onPress={() => setShowCreate(!showCreate)} />} />
    <MenuRow icon="calendar-check-outline" title="Kế hoạch tháng" description="Điều chuyển hạn mức, chốt tháng và chuyển dư" onPress={() => router.push(routes.planning)} />
    <Surface><View style={styles.monthRow}><Pressable accessibilityLabel="Tháng trước" accessibilityRole="button" onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth()-1, 1))}><Text style={styles.monthArrow}>‹</Text></Pressable><Text style={styles.name}>Tháng {month.getMonth()+1}/{month.getFullYear()}</Text><Pressable accessibilityLabel="Tháng sau" accessibilityRole="button" onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth()+1, 1))}><Text style={styles.monthArrow}>›</Text></Pressable></View></Surface>
    {loading && budgets.length === 0 ? <ActivityIndicator accessibilityLabel="Đang tải ngân sách" color={colors.mauve} style={styles.loader} /> : null}
    {error ? <ConnectionNotice hasData={budgets.length > 0} onRetry={() => void refresh()} /> : null}
    {periodError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{periodError}</Text> : null}
    {splitError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{splitError}</Text> : null}
    {budgets.length === 0 && !loading ? <EmptyState description="Chọn một danh mục và đặt hạn mức đầu tiên." title="Chưa có ngân sách" /> : <View style={styles.stack}>{budgets.map((budget) => {
      const periodLimit = localMode ? guest.data.planningPeriods[`${monthText}:${budget.id}`] ?? null : periodLimits?.month === monthText ? periodLimits.limits[budget.id] ?? null : null;
      const ready = localMode || cloudSplits?.month === monthText;
      const base = budgetOverview(budget, monthText, transactions, periodLimit, !localMode && cloudSplits?.month === monthText ? cloudSplits.splits : []);
      const spent = localMode ? guestBudgetSpent(guest.data, budget, monthText) : base.spent;
      const { limit: monthlyLimit } = base;
      const percent = monthlyLimit > 0 ? Math.round(spent / monthlyLimit * 100) : 0;
      return <Surface key={budget.id} style={styles.budgetCard}>
        <View style={cardStyles.header}><View style={cardStyles.icon}><AppIcon name="chart-donut" color={colors.mauve} size={24} /></View><View style={styles.budgetCopy}><Text style={styles.name}>{budget.name}</Text><Text style={styles.hint}>Ngân sách hàng tháng</Text></View><IconButton icon="dots-vertical" label={`Quản lý ngân sách ${budget.name}`} onPress={() => { setMessage(null); setManagingId(budget.id); }} /></View>
        {ready ? <><View accessibilityRole="progressbar" accessibilityLabel={`Chi tiêu ngân sách ${budget.name}`} accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.max(0, percent)), text: `${percent}% hạn mức` }} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: spent > monthlyLimit ? colors.expense : colors.mauve }]} /></View><Text style={styles.hint}>{spent > monthlyLimit ? "Đã vượt hạn mức tháng này" : `Đã dùng ${percent}% hạn mức`}</Text></> : <Text style={styles.hint}>{splitError ? "Chưa thể tính số đã chi." : "Đang tải phân bổ danh mục..."}</Text>}
        <View style={cardStyles.stats}>{[{ label: "Đã chi", value: ready ? formatVnd(spent) : "—" }, { label: spent > monthlyLimit ? "Vượt hạn mức" : "Còn lại", value: ready ? formatVnd(Math.abs(monthlyLimit - spent)) : "—" }, { label: "Hạn mức", value: formatVnd(monthlyLimit) }].map((stat) => <View key={stat.label} style={[cardStyles.stat, { minWidth: 86 * fontScale }]}><Text style={styles.hint}>{stat.label}</Text><Text style={cardStyles.value}>{stat.value}</Text></View>)}</View>
      </Surface>;
    })}</View>}
    {message && !showCreate && !editing ? <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null}
    <ActionSheet title={managing?.name ?? "Ngân sách"} visible={Boolean(managing)} onClose={() => setManagingId(null)}>
      {managing ? <View style={styles.stack}><MenuRow icon="pencil-outline" title="Sửa hạn mức mặc định" onPress={() => { setEditedLimit(String(managing.defaultLimit)); setEditingId(managing.id); setManagingId(null); }} /><MenuRow icon="receipt-text-outline" title="Xem giao dịch tháng này" onPress={() => { setManagingId(null); router.push({ pathname: routes.transactions, params: { categoryId: managing.categoryId, month: monthText } }); }} /><DangerAction label="Lưu trữ ngân sách" disabled={busy} onPress={() => Alert.alert("Lưu trữ ngân sách?", "Ngân sách sẽ không còn trong danh sách đang hoạt động.", [{ text: "Hủy", style: "cancel" }, { text: "Lưu trữ", style: "destructive", onPress: () => { setManagingId(null); void archiveBudget(managing.id, managing.version); } }])} /></View> : null}
    </ActionSheet>
    <ActionSheet title="Sửa hạn mức" visible={Boolean(editing)} onClose={() => setEditingId(null)}>
      {editing ? <View style={styles.stack}><Text style={styles.name}>{editing.name}</Text><TextInput money accessibilityLabel={`Sửa hạn mức ${editing.name}`} keyboardType="number-pad" onChangeText={setEditedLimit} value={editedLimit} />{message ? <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null}<PrimaryAction label="Lưu hạn mức" busy={busy} onPress={() => void saveLimit(editing.id, editing.version)} /></View> : null}
    </ActionSheet>
    <SectionTitle title="Tạo ngân sách" action={showCreate ? "Thu gọn" : "Thêm mới"} onAction={() => setShowCreate(!showCreate)} />
    <ActionSheet title="Tạo ngân sách" visible={showCreate} onClose={() => setShowCreate(false)}><Surface style={{ padding: 0 }}><Text style={styles.fieldLabel}>Danh mục chi tiêu</Text><View accessibilityRole="radiogroup" style={styles.choices}>{expenseCategories.map((category) => { const active=selected?.id===category.id; return <Pressable accessibilityRole="radio" accessibilityState={{checked:active}} key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.choice,active&&styles.choiceActive]}><Text style={[styles.choiceText,active&&styles.choiceTextActive]}>{category.name}</Text></Pressable>; })}</View>
      <Text style={styles.fieldLabel}>Hạn mức tháng</Text><TextInput money accessibilityLabel="Hạn mức ngân sách tháng" keyboardType="number-pad" onChangeText={setLimit} placeholder="Ví dụ: 1.000.000" placeholderTextColor={colors.muted} style={styles.input} value={limit} />
      <Text style={styles.fieldHelp}>Picket sẽ nhắc khi chi tiêu đạt 80% hạn mức.</Text>{message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{busy}} disabled={busy} onPress={() => void add()} style={({pressed})=>[styles.primary,pressed&&styles.pressed]}>{busy?<ActivityIndicator accessibilityLabel="Đang tạo ngân sách" color={colors.white}/>:<Text style={styles.primaryText}>Tạo ngân sách</Text>}</Pressable>
    </Surface></ActionSheet>
  </PicketScreen>;
}

const cardStyles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", gap: 12 }, icon: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" }, stats: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }, stat: { flex: 1, flexGrow: 1 }, value: { color: colors.ink, fontSize: 15, fontWeight: "700", marginTop: 4 } });
const styles=StyleSheet.create({appBar:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",minHeight:52},monthRow:{alignItems:"center",flexDirection:"row",justifyContent:"space-between"},monthArrow:{color:colors.mauve,fontSize:30},back:{color:colors.mauve,fontSize:15,fontWeight:"800"},link:{color:colors.mauve,fontSize:13,fontWeight:"800",marginTop:12},heading:{color:colors.ink,fontSize:29,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:22,marginTop:7},loader:{marginVertical:38},errorCard:{backgroundColor:colors.dangerSurface,borderRadius:radii.medium,marginBottom:14,padding:16},error:{color:colors.expense,fontSize:13,fontWeight:"700",lineHeight:19},hint:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:4},stack:{gap:12},budgetCard:{padding:18},budgetHead:{alignItems:"flex-start",flexDirection:"row",gap:14,justifyContent:"space-between"},budgetCopy:{flex:1},name:{color:colors.ink,fontSize:17,fontWeight:"800"},amount:{color:colors.ink,fontSize:16,fontWeight:"800"},progressTrack:{backgroundColor:colors.cream,borderRadius:4,height:7,marginTop:18,overflow:"hidden"},progressFill:{backgroundColor:colors.coral,borderRadius:4,height:7},archive:{color:colors.expense,fontSize:12,fontWeight:"800",marginTop:15},fieldLabel:{color:colors.ink,fontSize:13,fontWeight:"800",marginBottom:9,marginTop:4},choices:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:18},choice:{backgroundColor:colors.cream,borderColor:colors.peach,borderRadius:radii.pill,borderWidth:1,paddingHorizontal:13,paddingVertical:10},choiceActive:{backgroundColor:colors.mauve,borderColor:colors.mauve},choiceText:{color:colors.ink,fontSize:13,fontWeight:"700"},choiceTextActive:{color:colors.white},input:{backgroundColor:colors.white,borderColor:colors.peach,borderRadius:radii.medium,borderWidth:1,color:colors.ink,fontSize:16,minHeight:54,paddingHorizontal:16},fieldHelp:{color:colors.muted,fontSize:12,lineHeight:18,marginBottom:18,marginTop:8},primary:{alignItems:"center",backgroundColor:colors.mauve,borderRadius:radii.medium,justifyContent:"center",minHeight:52},primaryText:{color:colors.white,fontSize:16,fontWeight:"800"},pressed:{opacity:.72}});
