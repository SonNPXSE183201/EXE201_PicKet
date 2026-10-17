import { colors } from "@picket/design-tokens";
import { formatVnd, type Transaction } from "@picket/domain";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, Text, View } from "react-native";

import { picketApi } from "@/core/api/client";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { guestOwnerId } from "@/core/local/guest-finance";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, ChoiceChip, EmptyState, PicketScreen, PrimaryAction, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useTransactions } from "@/features/transactions/transactions-context";
import { decodeReconciliationRequest, isValidStatementDate, runReconciliationAttempt, type ReconciliationRequest } from "@/features/transactions/reconciliation-attempt";
import { reconciliationJournal } from "@/features/transactions/reconciliation-storage";
import type { PendingReconciliation } from "@/features/transactions/reconciliation-journal";

function effect(item: Transaction, accountId: string) {
  if (item.accountId === accountId) return item.kind === "income" || item.kind === "refund" ? item.amount : -item.amount;
  return item.kind === "transfer" && item.destinationAccountId === accountId ? item.amount : 0;
}
const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};

export default function ReconcileScreen() {
  const { session, localMode } = useAuth();
  const owner = localMode ? guestOwnerId : session?.user.id ?? "";
  const guest = useGuestFinance();
  const { accounts, refresh: refreshAccounts } = useAccounts();
  const { refresh: refreshRecent } = useTransactions();
  const { transactions, loading, error, refresh } = useTransactionHistory();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [statementDate, setStatementDate] = useState(localToday);
  const [statementBalance, setStatementBalance] = useState("");
  const [selectedByAccount, setSelectedByAccount] = useState<Record<string, string[]>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [messageState, setMessageState] = useState<{ owner: string; text: string | null }>({ owner: "", text: null });
  const message = messageState.owner === owner ? messageState.text : null;
  function setMessage(text: string | null) { setMessageState({ owner, text }); }
  const submitting = useRef(false);
  const activeOwner = useRef(owner);
  const [pendingState, setPendingState] = useState<{ owner: string; rows: PendingReconciliation[]; error: boolean }>({ owner: "", rows: [], error: false });
  useEffect(() => {
    activeOwner.current = owner;
    if (!owner) return;
    let active = true;
    void reconciliationJournal.list(owner).then((rows) => {
      if (active) setPendingState({ owner, rows, error: false });
    }).catch(() => { if (active) setPendingState({ owner, rows: [], error: true }); });
    return () => { active = false; if (activeOwner.current === owner) activeOwner.current = ""; };
  }, [owner]);
  async function reloadPending(requestOwner: string) {
    try {
      const rows = await reconciliationJournal.list(requestOwner);
      if (activeOwner.current === requestOwner) setPendingState({ owner: requestOwner, rows, error: false });
    } catch { if (activeOwner.current === requestOwner) setPendingState({ owner: requestOwner, rows: [], error: true }); }
  }
  const currentAccount = accounts.find((item) => item.id === accountId) ?? accounts[0];
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const selected = currentAccount ? selectedByAccount[currentAccount.id] ?? transactions.filter((item) => item.reconciledAccountIds?.includes(currentAccount.id)).map((item) => item.id) : [];
  const end = new Date(`${statementDate}T23:59:59.999`).getTime();
  const eligible = transactions.filter((item) => currentAccount && (item.accountId === currentAccount.id || item.destinationAccountId === currentAccount.id) && new Date(item.occurredAt).getTime() <= end);
  const eligibleSelected = eligible.filter((item) => selected.includes(item.id));
  const clearedBalance = (currentAccount?.openingBalance ?? 0) + eligibleSelected.reduce((sum,item) => sum + effect(item,currentAccount!.id),0);
  const target = /^-?\d+$/.test(statementBalance) ? Number(statementBalance) : null;
  const difference = target !== null && Number.isSafeInteger(target) ? target - clearedBalance : null;
  function setSelected(next: string[]) { if (currentAccount) setSelectedByAccount((current) => ({ ...current, [currentAccount.id]:next })); }
  function toggle(id: string) { setSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected,id]); }
  async function submit() {
    if (submitting.current) return;
    if ((!localMode && (!session || !picketApi)) || !currentAccount || difference === null || !Number.isSafeInteger(difference) ||
        Math.abs(target!) > 9_000_000_000_000 || !isValidStatementDate(statementDate, localToday()) || Number.isNaN(end)) {
      setMessage("Nhập ngày và số dư sao kê hợp lệ."); return;
    }
    if (difference !== 0 && !reason.trim()) { setMessage("Nhập lý do trước khi tạo điều chỉnh."); return; }
    const request = { accountId:currentAccount.id, statementDate, statementBalance:target!, selectedTransactionIds:eligibleSelected.map((item) => item.id).sort(), reason:reason.trim() };
    const serialized = JSON.stringify(request);
    await sendRequest(request, serialized);
  }
  async function sendRequest(request: ReconciliationRequest, serialized: string, expectedId?: string) {
    if (submitting.current || !owner || (!localMode && (!session || !picketApi))) return;
    submitting.current = true;
    setBusy(true); setMessage(null);
    try {
      // Do not send if the durable request ID cannot be saved locally.
      const requestId = await reconciliationJournal.reserve(owner, serialized, expectedId);
      if (activeOwner.current !== owner) return;
      const { result, refreshFailed } = await runReconciliationAttempt(async () => {
        const savedAccount = accounts.find((item) => item.id === request.accountId);
        const savedCleared = (savedAccount?.openingBalance ?? 0) + transactions.filter((item) => request.selectedTransactionIds.includes(item.id)).reduce((sum, item) => sum + effect(item, request.accountId), 0);
        const saved = localMode
          ? (await guest.commit({ type: "reconcile.apply", id: requestId, ...request, occurredAt: `${request.statementDate}T12:00:00.000Z` }), { difference: request.statementBalance - savedCleared })
          : await picketApi!.reconcileWallet(session!.access_token, { ...request, requestId });
        // A cleanup error cannot undo a confirmed server write. Keeping its ID
        // lets an identical retry retrieve that result instead of writing twice.
        await reconciliationJournal.complete(owner, serialized, requestId).catch(() => undefined);
        if (activeOwner.current === owner) setSelectedByAccount({});
        return saved;
      }, () => Promise.all([refresh(), refreshRecent(), refreshAccounts()]));
      const success = result.difference === 0 ? "Đã đối soát ví." : `Đã đối soát và tạo điều chỉnh ${formatVnd(Math.abs(result.difference))}${localMode ? " trên thiết bị" : ""}.`;
      if (activeOwner.current === owner) setMessage(success + (refreshFailed ? " Chưa tải lại được số liệu. Kết nối mạng rồi tải lại, không cần gửi lại thao tác đã thành công." : ""));
    } catch { if (activeOwner.current === owner) setMessage("Chưa xác nhận được kết quả đối soát. Kiểm tra kết nối và bộ nhớ thiết bị, rồi thử lại với đúng thông tin trước đó. Mã yêu cầu đã lưu sẽ được dùng lại để tránh tạo trùng."); }
    finally { await reloadPending(owner); submitting.current = false; setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title="Đối soát ví" />
    <Text style={styles.subtitle}>{localMode ? "Đối soát chỉ lưu trên thiết bị này." : "So khớp các giao dịch đã chọn với số dư trên sao kê."}</Text>
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.error}>{error} Chạm để thử lại.</Text></Pressable>}
    {loading && <Text style={styles.hint}>Đang tải lịch sử giao dịch…</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    {pendingState.owner === owner && pendingState.error && <Text accessibilityLiveRegion="polite" style={styles.error}>Chưa đọc được yêu cầu đã lưu. Dữ liệu chưa bị xóa. Mở lại màn hình để thử lại.</Text>}
    {pendingState.owner === owner && pendingState.rows.length > 0 && <Surface peach>
      <SectionTitle title="Đối soát chưa xác nhận" />
      <Text style={styles.hint}>Không tự gửi lại. Thử lại sẽ dùng nguyên thông tin và mã đã lưu; có thể hoàn tất đối soát nếu lần trước chưa được ghi.</Text>
      {pendingState.rows.map((entry) => {
        const saved = decodeReconciliationRequest(entry.payload);
        if (!saved) return <Text key={entry.id} style={styles.error}>Không đọc được một yêu cầu đã lưu. Giữ nguyên dữ liệu để kiểm tra, chưa thể thử lại.</Text>;
        const walletName = accounts.find((item) => item.id === saved.accountId)?.name ?? "Ví trong yêu cầu đã lưu";
        return <View key={entry.id} style={{ marginTop: 16 }}>
          <Text style={styles.title}>{walletName} · {saved.statementDate}</Text>
          <Text style={styles.hint}>Số dư sao kê: {formatVnd(saved.statementBalance)} · {saved.selectedTransactionIds.length} giao dịch</Text>
          {Boolean(saved.reason) && <Text style={styles.hint}>Lý do: {saved.reason}</Text>}
          <PrimaryAction disabled={busy || (localMode && (guest.loading || Boolean(guest.error)))} label={`Thử lại yêu cầu ${saved.statementDate}`} onPress={() => void sendRequest(saved, entry.payload, entry.id)} />
        </View>;
      })}
    </Surface>}
    {accounts.length === 0 ? <EmptyState title="Chưa có ví" description="Tạo ví trước khi đối soát." /> : <>
      <SectionTitle title="Ví cần đối soát" /><View style={styles.chips}>{accounts.map((item) => <ChoiceChip checked={item.id===currentAccount?.id} key={item.id} label={item.name} onPress={() => setAccountId(item.id)} />)}</View>
      <Text style={styles.label}>Ngày sao kê (YYYY-MM-DD)</Text><TextInput accessibilityLabel="Ngày sao kê" onChangeText={setStatementDate} style={styles.input} value={statementDate} />
      <Text style={styles.label}>Số dư trên sao kê (VND)</Text><TextInput money accessibilityLabel="Số dư trên sao kê" keyboardType="numbers-and-punctuation" onChangeText={setStatementBalance} style={styles.input} value={statementBalance} />
      <Surface peach><Text style={styles.title}>Số dư từ giao dịch đã chọn: {formatVnd(clearedBalance)}</Text>{difference !== null && <Text style={styles.hint}>Chênh lệch: {formatVnd(difference)}</Text>}</Surface>
      <SectionTitle title={`Giao dịch · đã chọn ${eligibleSelected.length}/${eligible.length}`} />
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => setSelected(eligible.map((item) => item.id))}><Text style={styles.link}>Chọn tất cả</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelected([])}><Text style={styles.link}>Bỏ chọn</Text></Pressable></View>
      <Surface>{eligible.map((item) => <Pressable accessibilityLabel={`${selected.includes(item.id) ? "Bỏ chọn" : "Chọn"} ${item.title}, ${formatVnd(item.amount)}`} accessibilityRole="checkbox" accessibilityState={{ checked:selected.includes(item.id) }} key={item.id} onPress={() => toggle(item.id)} style={styles.row}><Text style={styles.check}>{selected.includes(item.id) ? "☑" : "□"}</Text><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.hint}>{new Date(item.occurredAt).toLocaleDateString("vi-VN")}</Text></View><Text style={styles.value}>{formatVnd(effect(item,currentAccount!.id))}</Text></Pressable>)}</Surface>
      <Text style={styles.label}>Lý do điều chỉnh nếu có chênh lệch</Text><TextInput accessibilityLabel="Lý do điều chỉnh" onChangeText={setReason} style={styles.input} value={reason} />
      <PrimaryAction busy={busy} disabled={loading || Boolean(error) || difference === null} label={difference === 0 ? "Xác nhận đối soát" : "Xác nhận và tạo điều chỉnh"} onPress={() => void submit()} />
    </>}
  </PicketScreen>;
}

const styles = StyleSheet.create({back:{color:colors.mauve,fontSize:15,fontWeight:"800",marginBottom:18},heading:{color:colors.ink,fontSize:29,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:16,marginTop:7},error:{color:colors.expense,fontSize:13,marginBottom:10},message:{color:colors.ink,fontSize:14,marginVertical:12},hint:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:5},chips:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:12},label:{color:colors.ink,fontSize:14,fontWeight:"800",marginBottom:8,marginTop:14},input:{backgroundColor:colors.white,borderColor:colors.peach,borderRadius:12,borderWidth:1,color:colors.ink,fontSize:16,minHeight:50,paddingHorizontal:14,marginBottom:14},title:{color:colors.ink,fontSize:15,fontWeight:"800"},actions:{flexDirection:"row",gap:20,marginBottom:12},link:{color:colors.mauve,fontWeight:"800"},row:{alignItems:"center",borderBottomColor:colors.line,borderBottomWidth:1,flexDirection:"row",minHeight:65},check:{color:colors.mauve,fontSize:23,width:38},copy:{flex:1},value:{color:colors.ink,fontSize:13,fontWeight:"800"}});
