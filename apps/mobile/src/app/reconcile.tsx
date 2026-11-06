import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { formatMoney,localeFor } from "@/core/i18n/formatters";
import { reconciliationNoticeCopy,type ReconciliationNotice } from "@/features/transactions/reconciliation-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { Transaction } from "@picket/domain";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";

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
  const {t:tx}=useTranslation("reconciliation");
  const {language}=useAppTheme();
  const money=(value:number)=>formatMoney(value,language,"VND");
  const { styles } = useMobileStyles(createStyles);
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
  const [messageState, setMessageState] = useState<{ owner: string; text: string | ReconciliationNotice | null }>({ owner: "", text: null });
  const message = messageState.owner === owner ? messageState.text : null;
  function setMessage(text: string | ReconciliationNotice | null) { setMessageState({ owner, text }); }
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
      setMessage("invalidStatement"); return;
    }
    if (difference !== 0 && !reason.trim()) { setMessage("reasonRequired"); return; }
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
        const saved = localMode
          ? await guest.commit({ type: "reconcile.apply", id: requestId, ...request, occurredAt: `${request.statementDate}T12:00:00.000Z` }).then(state => {
              const receipt=state.reconciliationReceipts?.find(row=>row.id===requestId);
              if(!receipt)throw new Error("Missing saved reconciliation result");
              return {difference:receipt.difference};
            })
          : await picketApi!.reconcileWallet(session!.access_token, { ...request, requestId });
        // A cleanup error cannot undo a confirmed server write. Keeping its ID
        // lets an identical retry retrieve that result instead of writing twice.
        await reconciliationJournal.complete(owner, serialized, requestId).catch(() => undefined);
        if (activeOwner.current === owner) setSelectedByAccount({});
        return saved;
      }, () => Promise.all([refresh(), refreshRecent(), refreshAccounts()]));
      if (activeOwner.current === owner) setMessage({difference:result.difference,local:localMode,refreshFailed});
    } catch { if (activeOwner.current === owner) setMessage("unconfirmed"); }
    finally { await reloadPending(owner); submitting.current = false; setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title={tx("title")} />
    <Text style={styles.subtitle}>{localMode ? tx("localSubtitle") : tx("cloudSubtitle")}</Text>
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.error}>{tx("historyError")}</Text></Pressable>}
    {loading && <Text style={styles.hint}>{tx("loading")}</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{typeof message === "string" ? tx(message) : reconciliationNoticeCopy(message,language)}</Text>}
    {pendingState.owner === owner && pendingState.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{tx("pendingError")}</Text>}
    {pendingState.owner === owner && pendingState.rows.length > 0 && <Surface peach>
      <SectionTitle title={tx("pendingTitle")} />
      <Text style={styles.hint}>{tx("pendingBody")}</Text>
      {pendingState.rows.map((entry) => {
        const saved = decodeReconciliationRequest(entry.payload);
        if (!saved) return <Text key={entry.id} style={styles.error}>{tx("damagedRequest")}</Text>;
        const walletName = accounts.find((item) => item.id === saved.accountId)?.name ?? tx("savedWallet");
        return <View key={entry.id} style={{ marginTop: 16 }}>
          <Text style={styles.title}>{walletName} · {saved.statementDate}</Text>
          <Text style={styles.hint}>{tx("savedSummary",{amount:money(saved.statementBalance),count:saved.selectedTransactionIds.length})}</Text>
          {Boolean(saved.reason) && <Text style={styles.hint}>{tx("savedReason",{reason:saved.reason})}</Text>}
          <PrimaryAction disabled={busy || (localMode && (guest.loading || Boolean(guest.error)))} label={tx("retryRequest",{date:saved.statementDate})} onPress={() => void sendRequest(saved, entry.payload, entry.id)} />
        </View>;
      })}
    </Surface>}
    {accounts.length === 0 ? <EmptyState title={tx("noWallet")} description={tx("noWalletBody")} /> : <>
      <SectionTitle title={tx("wallet")} /><View style={styles.chips}>{accounts.map((item) => <ChoiceChip checked={item.id===currentAccount?.id} key={item.id} label={item.name} onPress={() => setAccountId(item.id)} />)}</View>
      <Text style={styles.label}>{tx("statementDate")}</Text><TextInput date accessibilityLabel={tx("statementDate")} onChangeText={setStatementDate} style={styles.input} value={statementDate} />
      <Text style={styles.label}>{tx("statementBalanceVnd")}</Text><TextInput money accessibilityLabel={tx("statementBalance")} keyboardType="numbers-and-punctuation" onChangeText={setStatementBalance} style={styles.input} value={statementBalance} />
      <Surface peach><Text style={styles.title}>{tx("cleared",{amount:money(clearedBalance)})}</Text>{difference !== null && <Text style={styles.hint}>{tx("difference",{amount:money(difference)})}</Text>}</Surface>
      <SectionTitle title={tx("selection",{selected:eligibleSelected.length,total:eligible.length})} />
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => setSelected(eligible.map((item) => item.id))}><Text style={styles.link}>{tx("selectAll")}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelected([])}><Text style={styles.link}>{tx("deselect")}</Text></Pressable></View>
      <Surface>{eligible.map((item) => <Pressable accessibilityLabel={tx("selectTransaction",{action:tx(selected.includes(item.id) ? "deselect" : "select"),title:item.title,amount:money(item.amount)})} accessibilityRole="checkbox" accessibilityState={{ checked:selected.includes(item.id) }} key={item.id} onPress={() => toggle(item.id)} style={styles.row}><Text style={styles.check}>{selected.includes(item.id) ? "☑" : "□"}</Text><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.hint}>{new Date(item.occurredAt).toLocaleDateString(localeFor(language))}</Text></View><Text style={styles.value}>{money(effect(item,currentAccount!.id))}</Text></Pressable>)}</Surface>
      <Text style={styles.label}>{tx("reasonLabel")}</Text><TextInput accessibilityLabel={tx("reason")} onChangeText={setReason} style={styles.input} value={reason} />
      <PrimaryAction busy={busy} disabled={loading || Boolean(error) || difference === null} label={difference === 0 ? tx("confirm") : tx("confirmAdjustment")} onPress={() => void submit()} />
    </>}
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({back:{color:colors.link,fontSize:15,fontWeight:"700",marginBottom:18},heading:{color:colors.ink,fontSize:26,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:16,marginTop:7},error:{color:colors.danger,fontSize:13,marginBottom:10},message:{color:colors.ink,fontSize:14,marginVertical:12},hint:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:5},chips:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:12},label:{color:colors.ink,fontSize:14,fontWeight:"700",marginBottom:8,marginTop:14},input:{backgroundColor:colors.white,borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,minHeight:paperControl.height,paddingHorizontal:14,marginBottom:14},title:{color:colors.ink,fontSize:15,fontWeight:"700"},actions:{flexDirection:"row",gap:20,marginBottom:12},link:{color:colors.link,fontWeight:"700"},row:{alignItems:"center",borderBottomColor:colors.line,borderBottomWidth:1,flexDirection:"row",minHeight:65},check:{color:colors.link,fontSize:23,width:38},copy:{flex:1},value:{color:colors.ink,fontSize:13,fontWeight:"700"}});
