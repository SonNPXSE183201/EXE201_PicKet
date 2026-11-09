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
import { figmaType } from "@picket/design-tokens";
import { FigmaButton, ReceiptDivider, ReceiptEdge, TransactionRow, figmaShadow } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { FieldOverline, PaperCard } from "@/features/management/management-ui";
import { categoryTile } from "@/features/home/home-recent";
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
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const owner = localMode ? guestOwnerId : session?.user.id ?? "";
  const guest = useGuestFinance();
  const { accounts, refresh: refreshAccounts } = useAccounts();
  const { categories, refresh: refreshRecent } = useTransactions();
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
      <View style={styles.chips}>{accounts.map((item) => <ChoiceChip checked={item.id===currentAccount?.id} key={item.id} label={item.name} onPress={() => setAccountId(item.id)} />)}</View>
      <View style={[styles.sheet, figmaShadow("paper")]}>
        <View style={styles.sheetBody}>
          <FieldOverline>{tx("statementBalanceVnd")}</FieldOverline>
          <TextInput money accessibilityLabel={tx("statementBalance")} keyboardType="numbers-and-punctuation" onChangeText={setStatementBalance} placeholder="0" placeholderTextColor={colors.muted} style={styles.amount} value={statementBalance} />
          <ReceiptDivider />
          <View style={styles.compare}>
            <View style={styles.compareRow}><Text style={[figmaType.bodySmall, { color: colors.muted }]}>{tx("cleared",{amount:""}).replace(/[:\s]+$/, "")}</Text><Text style={[figmaType.bodyStrong, { color: colors.text }]}>{money(clearedBalance)}</Text></View>
            {difference !== null && <View style={styles.compareRow}><Text style={[figmaType.bodySmall, { color: colors.muted }]}>{tx("difference",{amount:""}).replace(/[:\s]+$/, "")}</Text><Text style={[figmaType.amountRow, { color: difference === 0 ? colors.success : colors.warning }]}>{difference > 0 ? "+" : difference < 0 ? "−" : ""}{money(Math.abs(difference))}</Text></View>}
          </View>
        </View>
        <ReceiptEdge direction="bottom" />
      </View>
      <View style={styles.block}><FieldOverline>{tx("statementDate")}</FieldOverline><TextInput date accessibilityLabel={tx("statementDate")} onChangeText={setStatementDate} style={styles.input} value={statementDate} /></View>
      <View style={styles.block}>
        <View style={styles.selectHeader}><FieldOverline>{tx("selection",{selected:eligibleSelected.length,total:eligible.length})}</FieldOverline>
          <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => setSelected(eligible.map((item) => item.id))}><Text style={styles.link}>{tx("selectAll")}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSelected([])}><Text style={styles.link}>{tx("deselect")}</Text></Pressable></View></View>
        <PaperCard>{eligible.map((item, index) => { const on = selected.includes(item.id); const value = effect(item,currentAccount!.id); const category = categories.find((entry) => entry.id === item.categoryId); const tile = categoryTile(category?.icon ?? null, category?.name ?? item.title, value > 0, colors);
          return <View key={item.id}>{index > 0 && <ReceiptDivider />}
            <Pressable accessibilityLabel={tx("selectTransaction",{action:tx(on ? "deselect" : "select"),title:item.title,amount:money(item.amount)})} accessibilityRole="checkbox" accessibilityState={{ checked:on }} onPress={() => toggle(item.id)} style={styles.row}>
              <View style={[styles.select, on ? styles.selectOn : null]}>{on ? <AppIcon name="check" size={13} color={colors.onPrimary} /> : null}</View>
              <View style={styles.copy}><TransactionRow tileColor={tile.color} tile={<AppIcon name={tile.name} size={18} color={colors.text} />} title={item.title} meta={new Date(item.occurredAt).toLocaleDateString(localeFor(language))} amount={`${value > 0 ? "+" : value < 0 ? "−" : ""}${money(Math.abs(value))}`} amountColor={value < 0 ? colors.expense : colors.income} /></View>
            </Pressable></View>; })}</PaperCard>
      </View>
      {difference !== null && <View style={styles.notice}><View style={styles.noticeTile}><AppIcon name="check" size={18} color={colors.success} /></View><Text style={[figmaType.bodySmall, { color: colors.muted, flex: 1 }]}>{difference === 0 ? tx("confirm") : tx("difference",{amount:money(difference)})}</Text></View>}
      {difference !== null && difference !== 0 && <View style={styles.block}><FieldOverline>{tx("reasonLabel")}</FieldOverline><TextInput accessibilityLabel={tx("reason")} onChangeText={setReason} style={styles.input} value={reason} /></View>}
      <View style={styles.block}><FigmaButton fullWidth icon="check" busy={busy} disabled={busy || loading || Boolean(error) || difference === null} label={difference === 0 ? tx("confirm") : tx("confirmAdjustment")} onPress={() => void submit()} /></View>
    </>}
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({block:{marginTop:20,gap:8},sheet:{alignSelf:"stretch",marginTop:8},sheetBody:{backgroundColor:colors.paper,borderTopLeftRadius:18,borderTopRightRadius:18,paddingTop:18,paddingBottom:12,paddingHorizontal:16,gap:8,alignItems:"center"},amount:{...figmaType.amountHero,color:colors.text,textAlign:"center",alignSelf:"stretch",padding:0,minHeight:42},compare:{alignSelf:"stretch",gap:6},compareRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},selectHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},select:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:colors.border,alignItems:"center",justifyContent:"center"},selectOn:{backgroundColor:colors.primary,borderColor:colors.primary},notice:{flexDirection:"row",alignItems:"center",gap:12,marginTop:20,paddingLeft:12,paddingRight:14,paddingVertical:12,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},noticeTile:{width:36,height:36,borderRadius:12,backgroundColor:colors.successSurface,alignItems:"center",justifyContent:"center"},back:{color:colors.link,fontSize:15,fontWeight:"700",marginBottom:18},heading:{color:colors.ink,fontSize:26,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:16,marginTop:7},error:{color:colors.danger,fontSize:13,marginBottom:10},message:{color:colors.ink,fontSize:14,marginVertical:12},hint:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:5},chips:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:12},label:{color:colors.ink,fontSize:14,fontWeight:"700",marginBottom:8,marginTop:14},input:{backgroundColor:colors.white,borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,minHeight:paperControl.height,paddingHorizontal:14,marginBottom:14},title:{color:colors.ink,fontSize:15,fontWeight:"700"},actions:{flexDirection:"row",gap:16},link:{color:colors.link,fontWeight:"700"},row:{alignItems:"center",flexDirection:"row",gap:12,paddingHorizontal:8,minHeight:56},check:{color:colors.link,fontSize:23,width:38},copy:{flex:1,minWidth:0},value:{color:colors.ink,fontSize:13,fontWeight:"700"}});
