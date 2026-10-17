import { colors } from "@picket/design-tokens";
import { formatVnd, type BudgetMethod, type PlanningResponse } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import { picketApi } from "@/core/api/client";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { guestBudgetSpent } from "@/core/local/guest-finance";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, ChoiceChip, EmptyState, PicketScreen, PrimaryAction, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";

const methods: [BudgetMethod, string][] = [["simple","Đơn giản"],["envelope","Phong bì"],["zero_based","Zero-based"],["fifty_thirty_twenty","50/30/20"],["event","Sự kiện"]];
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function PlanningScreen() {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const { budgets, update: updateBudget } = useBudgets();
  const { transactions, loading: historyLoading, error: historyError } = useTransactionHistory();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [cloudPlanning, setPlanning] = useState<PlanningResponse | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [rollover, setRollover] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedMonth = monthKey(month);
  const planning: PlanningResponse | null = localMode ? {
    method: guest.data.planningMethod,
    periods: budgets.map((budget) => ({ budgetId: budget.id, month: selectedMonth, limit: guest.data.planningPeriods[`${selectedMonth}:${budget.id}`] ?? budget.defaultLimit, carriedAmount: 0 })),
    close: guest.data.planningCloses[selectedMonth] ?? null,
  } : cloudPlanning;
  const monthly = transactions.filter((item) => item.occurredAt.slice(0, 7) === selectedMonth);
  const income = monthly.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = monthly.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi.getPlanning(session.access_token, selectedMonth)
      .then((value) => { if (active) { setPlanning(value); setMessage(null); } })
      .catch(() => { if (active) setMessage("Chưa tải được kế hoạch tháng. Hãy thử lại khi có kết nối."); });
    return () => { active = false; };
  }, [session, selectedMonth]);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const limitOf = (id: string) => planning?.periods.find((item) => item.budgetId === id)?.limit ?? budgets.find((item) => item.id === id)?.defaultLimit ?? 0;
  async function changeMethod(method: BudgetMethod) {
    if ((!localMode && !picketApi) || busy) return;
    setBusy(true); setMessage(null);
    try { if (localMode) await guest.commit({ type: "planning.method", value: method });
      else { await picketApi!.setBudgetMethod(session!.access_token, method); setPlanning((current) => current ? { ...current, method } : current); } }
    catch { setMessage("Không lưu được phương pháp lập kế hoạch."); }
    finally { setBusy(false); }
  }
  async function transfer() {
    if ((!localMode && !picketApi) || !source || !destination || source === destination || !/^\d+$/.test(amount) || Number(amount) <= 0 || !Number.isSafeInteger(Number(amount))) { setMessage("Chọn hai ngân sách khác nhau và nhập hạn mức hợp lệ."); return; }
    setBusy(true); setMessage(null);
    try { if (localMode) await guest.commit({ type: "planning.transfer", sourceBudgetId:source, destinationBudgetId:destination, month:selectedMonth, amount:Number(amount) });
      else { await picketApi!.transferBudgetLimit(session!.access_token, { sourceBudgetId:source, destinationBudgetId:destination, month:selectedMonth, amount:Number(amount) }); setPlanning(await picketApi!.getPlanning(session!.access_token, selectedMonth)); }
      setAmount(""); setMessage(localMode ? "Đã lưu hạn mức trên thiết bị." : "Đã chuyển hạn mức tháng này."); }
    catch { setMessage("Không chuyển được hạn mức. Kiểm tra phần còn lại hoặc tháng đã chốt."); }
    finally { setBusy(false); }
  }
  function confirmClose() {
    if (planning?.close || selectedMonth >= monthKey(new Date()) || !checked || historyLoading || historyError) return;
    Alert.alert("Chốt tháng?", "Sau khi chốt, giao dịch của tháng này không thể thay đổi. Hãy kiểm tra kỹ trước khi xác nhận.", [
      { text:"Hủy", style:"cancel" },
      { text:"Chốt tháng", onPress:() => void closeMonth() },
    ]);
  }
  async function closeMonth() {
    if (!localMode && !picketApi) return;
    setBusy(true); setMessage(null);
    try { if (localMode) await guest.commit({ type: "planning.close", value: { month:selectedMonth, closedAt:new Date().toISOString(), income, expense, note:note.trim(), rollover } });
      else { await picketApi!.closeBudgetMonth(session!.access_token, { month:selectedMonth, rollover, note:note.trim() }); setPlanning(await picketApi!.getPlanning(session!.access_token, selectedMonth)); }
      setMessage(localMode ? "Đã chốt tháng trên thiết bị." : "Đã chốt tháng."); }
    catch { setMessage("Không chốt được tháng. Có thể tháng đã được chốt hoặc dữ liệu vừa thay đổi."); }
    finally { setBusy(false); }
  }
  async function changeThreshold(id: string, percent: number) {
    const budget = budgets.find((item) => item.id === id);
    if (!budget || busy) return;
    setBusy(true); setMessage(null);
    try { await updateBudget(id, { expectedVersion: budget.version, alertPercent: percent }); }
    catch { setMessage("Không lưu được ngưỡng cảnh báo ngân sách."); }
    finally { setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title="Kế hoạch ngân sách" />
    <Text style={styles.subtitle}>{localMode ? "Kế hoạch chỉ lưu trên thiết bị này, không đồng bộ cloud." : "Tổ chức hạn mức, điều chuyển và chốt tháng."}</Text>
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    <SectionTitle title="Phương pháp lập kế hoạch" />
    <View style={styles.chips}>{methods.map(([value,label]) => <ChoiceChip checked={planning?.method === value} key={value} label={label} onPress={() => void changeMethod(value)} />)}</View>
    <Text style={styles.hint}>Phương pháp giúp bạn tổ chức ngân sách; hạn mức và chi tiêu vẫn lấy từ giao dịch thực tế.</Text>
    <SectionTitle title="Tháng đang xem" />
    <Surface><View style={styles.monthRow}><Pressable accessibilityLabel="Tháng trước" accessibilityRole="button" onPress={() => { setPlanning(null); setChecked(false); setMonth((current) => new Date(current.getFullYear(), current.getMonth()-1,1)); }}><Text style={styles.arrow}>‹</Text></Pressable><Text style={styles.month}>Tháng {month.getMonth()+1}/{month.getFullYear()}</Text><Pressable accessibilityLabel="Tháng sau" accessibilityRole="button" onPress={() => { setPlanning(null); setChecked(false); setMonth((current) => new Date(current.getFullYear(), current.getMonth()+1,1)); }}><Text style={styles.arrow}>›</Text></Pressable></View></Surface>
    <SectionTitle title="Thu chi và ngân sách tháng" />
    <Surface><Text style={styles.title}>Thu {formatVnd(income)} · Chi {formatVnd(expense)}</Text>
      {historyLoading && <Text style={styles.hint}>Đang tải toàn bộ giao dịch để tính chi tiêu…</Text>}
      {historyError && <Text style={styles.message}>{historyError}</Text>}
      {budgets.map((budget) => { const spent = localMode ? guestBudgetSpent(guest.data, budget, selectedMonth) : monthly.filter((item) => item.kind === "expense" && item.categoryId === budget.categoryId).reduce((sum, item) => sum + item.amount, 0);
        return <View key={budget.id}><Text style={styles.label}>{budget.name}</Text><Text style={styles.hint}>Kế hoạch {formatVnd(limitOf(budget.id))} · Thực tế {formatVnd(spent)}</Text>
          <Text style={styles.hint}>Nhắc khi đã dùng {budget.alertPercent}%</Text><View style={styles.chips}>{[50,80,90,100].map((percent) => <ChoiceChip checked={budget.alertPercent === percent} key={percent} label={`${percent}%`} onPress={() => void changeThreshold(budget.id,percent)} />)}</View></View>; })}
    </Surface>
    {planning?.close && <Surface peach><Text style={styles.title}>Tháng đã chốt</Text><Text style={styles.hint}>Thu {formatVnd(planning.close.income)} · Chi {formatVnd(planning.close.expense)}</Text></Surface>}
    <SectionTitle title="Chuyển hạn mức" />
    {budgets.length < 2 ? <EmptyState title="Cần ít nhất hai ngân sách" description="Tạo thêm ngân sách để điều chuyển hạn mức." /> : <Surface>
      <Text style={styles.label}>Từ ngân sách</Text><View style={styles.chips}>{budgets.map((item) => <ChoiceChip checked={source===item.id} key={item.id} label={`${item.name} · ${formatVnd(limitOf(item.id))}`} onPress={() => setSource(item.id)} />)}</View>
      <Text style={styles.label}>Sang ngân sách</Text><View style={styles.chips}>{budgets.map((item) => <ChoiceChip checked={destination===item.id} key={item.id} label={item.name} onPress={() => setDestination(item.id)} />)}</View>
      <Text style={styles.label}>Hạn mức chuyển (VND)</Text><TextInput money accessibilityLabel="Hạn mức chuyển" keyboardType="number-pad" onChangeText={setAmount} style={styles.input} value={amount} />
      <PrimaryAction busy={busy} disabled={guest.loading && localMode || Boolean(planning?.close) || !planning} label="Chuyển hạn mức" onPress={() => void transfer()} />
    </Surface>}
    <SectionTitle title="Chốt tháng và chuyển phần dư" />
    <Surface><View style={styles.monthRow}><Text style={styles.title}>Đã kiểm tra phân loại, giao dịch nghi trùng và đối soát ví</Text><Switch accessibilityLabel="Đã kiểm tra phân loại, giao dịch nghi trùng và đối soát ví" hitSlop={12} onValueChange={setChecked} value={checked} /></View><View style={styles.monthRow}><Text style={styles.title}>Chuyển dư sang tháng sau</Text><Switch accessibilityLabel="Chuyển dư sang tháng sau" hitSlop={12} onValueChange={setRollover} value={rollover} /></View><Text style={styles.label}>Ghi chú chốt tháng</Text><TextInput accessibilityLabel="Ghi chú chốt tháng" onChangeText={setNote} style={styles.input} value={note} /><PrimaryAction busy={busy} disabled={!planning || Boolean(planning.close) || selectedMonth >= monthKey(new Date()) || !checked || historyLoading || Boolean(historyError)} label="Chốt tháng" onPress={confirmClose} /></Surface>
  </PicketScreen>;
}

const styles = StyleSheet.create({back:{color:colors.mauve,fontSize:15,fontWeight:"800",marginBottom:18},heading:{color:colors.ink,fontSize:29,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:7},message:{color:colors.expense,fontSize:13,marginTop:15},chips:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:8},hint:{color:colors.muted,fontSize:13,lineHeight:19,marginTop:8},monthRow:{alignItems:"center",flexDirection:"row",justifyContent:"space-between"},arrow:{color:colors.mauve,fontSize:30},month:{color:colors.ink,fontSize:16,fontWeight:"800"},title:{color:colors.ink,fontSize:15,fontWeight:"800"},label:{color:colors.ink,fontSize:13,fontWeight:"800",marginTop:12},input:{backgroundColor:colors.cream,borderColor:colors.peach,borderRadius:12,borderWidth:1,color:colors.ink,fontSize:16,marginVertical:10,minHeight:50,paddingHorizontal:14}});
