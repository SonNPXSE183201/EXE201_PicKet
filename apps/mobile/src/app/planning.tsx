import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { withLocalOwnerAccess } from "@/core/sync/offline-cache";
import { useTranslation } from "react-i18next";
import { formatMoney, localeFor, normalizeLanguage } from "@/core/i18n/formatters";
import { parsePaymentAmount } from "@/core/forms/payment-form";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { type BudgetMethod, type PlanningResponse } from "@picket/domain";
import { Redirect } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { picketApi } from "@/core/api/client";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { guestBudgetSpent } from "@/core/local/guest-finance";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, ChoiceChip, EmptyState, PicketScreen, PrimaryAction, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useSpendingSplits } from "@/features/transactions/use-spending-splits";
import { budgetOverview } from "@/core/local/budget-overview";

const methods: [BudgetMethod,string][] = [["simple","simple"],["envelope","envelope"],["zero_based","zero_based"],["fifty_thirty_twenty","fifty_thirty_twenty"],["event","event"]];
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

type ReviewSnapshot = { scope: string; transactions: unknown; allocations: unknown; budgets: unknown; limits: unknown };

export default function PlanningScreen() {
  const {t,i18n}=useTranslation("planning");
  const language=normalizeLanguage(i18n.resolvedLanguage??i18n.language);
  const money=(amount:number)=>formatMoney(amount,language,"VND");
  const { colors, styles } = useMobileStyles(createStyles);
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
  const [reviewedFor, setReviewedFor] = useState<ReviewSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedMonth = monthKey(month);
  const scope=(session?.user.id??(localMode?"device-guest":"anonymous"))+":"+selectedMonth;
  const currentScope=useRef<string|null>(scope),alive=useRef(true),operationBusy=useRef(false),readGeneration=useRef(0),closeAllowed=useRef<{allowed:boolean;snapshot:ReviewSnapshot|null}>({allowed:false,snapshot:null});
  useLayoutEffect(()=>{currentScope.current=scope;alive.current=true;return()=>{currentScope.current=null;alive.current=false;};},[scope]);
  const isCurrent=()=>alive.current&&currentScope.current===scope;
  const { splits, loading: splitLoading, error: splitError } = useSpendingSplits(transactions, selectedMonth);
  const planning: PlanningResponse | null = localMode ? {
    method: guest.data.planningMethod,
    periods: budgets.map((budget) => ({ budgetId: budget.id, month: selectedMonth, limit: guest.data.planningPeriods[`${selectedMonth}:${budget.id}`] ?? budget.defaultLimit, carriedAmount: 0 })),
    close: guest.data.planningCloses[selectedMonth] ?? null,
  } : cloudPlanning;
  const limits=localMode?guest.data.planningPeriods:cloudPlanning?.periods;
  const reviewMatches=reviewedFor!==null&&reviewedFor.scope===scope&&reviewedFor.transactions===transactions&&reviewedFor.allocations===splits&&reviewedFor.budgets===budgets&&reviewedFor.limits===limits;
  const canClose=Boolean(planning&&!planning.close&&selectedMonth<monthKey(new Date())&&checked&&reviewMatches&&!historyLoading&&!historyError&&!splitLoading&&!splitError);
  useLayoutEffect(()=>{closeAllowed.current={allowed:canClose,snapshot:reviewedFor};},[canClose,reviewedFor]);
  const monthly = transactions.filter((item) => !item.deletedAt && item.occurredAt.slice(0, 7) === selectedMonth);
  const income = monthly.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const grossExpense = monthly.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const refunds = monthly.filter((item) => item.kind === "refund").reduce((sum, item) => sum + item.amount, 0);
  const expense = grossExpense - refunds;
  useEffect(() => {
    if (!session || !picketApi || operationBusy.current) return;
    let active = true;
    const generation=++readGeneration.current;
    void picketApi.getPlanning(session.access_token, selectedMonth)
      .then((value) => { if (active&&generation===readGeneration.current&&currentScope.current===scope) { setPlanning(value); setMessage(null); } })
      .catch(() => { if (active&&generation===readGeneration.current&&currentScope.current===scope) setMessage("loadFailed"); });
    return () => { active = false; };
  }, [session, selectedMonth, scope]);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const limitOf = (id: string) => planning?.periods.find((item) => item.budgetId === id)?.limit ?? budgets.find((item) => item.id === id)?.defaultLimit ?? 0;
  async function writeCloud<T>(write:()=>Promise<T>):Promise<T>{
    if(!session)throw new Error("Missing planning owner");
    return withLocalOwnerAccess(session.user.id,()=>{if(!isCurrent())throw new Error("Stale planning operation");return write();});
  }
  async function changeMethod(method: BudgetMethod) {
    if(operationBusy.current||!isCurrent())return;
    if ((!localMode && !picketApi) || !planning || busy) return;
    operationBusy.current=true;readGeneration.current++;setBusy(true);setMessage(null);
    try { if (localMode) await guest.commit({ type: "planning.method", value: method });
      else { await writeCloud(()=>picketApi!.setBudgetMethod(session!.access_token, method)); if(!isCurrent())return; setPlanning((current) => current ? { ...current, method } : current); } }
    catch { if(isCurrent())setMessage("methodFailed"); }
    finally { operationBusy.current=false;if(isCurrent())setBusy(false); }
  }
  async function transfer() {
    if(operationBusy.current||!isCurrent())return;
    if(!planning||planning.close||(localMode&&guest.loading))return;
    const parsedAmount=parsePaymentAmount(amount);
    if ((!localMode && !picketApi) || !source || !destination || source === destination || parsedAmount===null) { setMessage("invalidTransfer"); return; }
    operationBusy.current=true;readGeneration.current++;setBusy(true);setMessage(null);
    try { if (localMode) await guest.commit({ type: "planning.transfer", sourceBudgetId:source, destinationBudgetId:destination, month:selectedMonth, amount:parsedAmount });
      else { await writeCloud(()=>picketApi!.transferBudgetLimit(session!.access_token, { sourceBudgetId:source, destinationBudgetId:destination, month:selectedMonth, amount:parsedAmount })); if(!isCurrent())return; const next=await picketApi!.getPlanning(session!.access_token, selectedMonth);if(!isCurrent())return;setPlanning(next); }
      if(!isCurrent())return;
      setAmount(""); setMessage(localMode ? "deviceTransferSaved" : "transferSaved"); }
    catch { if(isCurrent())setMessage("transferFailed"); }
    finally { operationBusy.current=false;if(isCurrent())setBusy(false); }
  }
  function confirmClose() {
    if (operationBusy.current||!isCurrent()||!planning||planning.close || selectedMonth >= monthKey(new Date()) || !checked || !reviewMatches || historyLoading || historyError || splitLoading || splitError) return;
    Alert.alert(t("closeTitle"), t("closeDescription"), [
      { text:t("cancel"), style:"cancel" },
      { text:t("close"), onPress:() => void closeMonth(reviewedFor) },
    ]);
  }
  async function closeMonth(review: ReviewSnapshot | null) {
    if(operationBusy.current||!isCurrent())return;
    if ((!localMode && !picketApi) || !review || !closeAllowed.current.allowed || closeAllowed.current.snapshot!==review || selectedMonth>=monthKey(new Date())) return;
    operationBusy.current=true;readGeneration.current++;setBusy(true);setMessage(null);
    try { if (localMode) await guest.commit({ type: "planning.close", value: { month:selectedMonth, closedAt:new Date().toISOString(), income, expense, note:note.trim(), rollover } });
      else { await writeCloud(()=>picketApi!.closeBudgetMonth(session!.access_token, { month:selectedMonth, rollover, note:note.trim() })); if(!isCurrent())return; const next=await picketApi!.getPlanning(session!.access_token, selectedMonth);if(!isCurrent())return;setPlanning(next); }
      if(!isCurrent())return;
      setMessage(localMode ? "deviceClosed" : "monthClosed"); }
    catch { if(isCurrent())setMessage("closeFailed"); }
    finally { operationBusy.current=false;if(isCurrent())setBusy(false); }
  }
  async function changeThreshold(id: string, percent: number) {
    if(operationBusy.current||!isCurrent())return;
    const budget = budgets.find((item) => item.id === id);
    if (!budget || busy) return;
    operationBusy.current=true;readGeneration.current++;setBusy(true);setMessage(null);
    try { await updateBudget(id, { expectedVersion: budget.version, alertPercent: percent }); }
    catch { if(isCurrent())setMessage("thresholdFailed"); }
    finally { operationBusy.current=false;if(isCurrent())setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title={t("title")} back={false} />
    <Text style={styles.subtitle}>{localMode ? t("deviceSubtitle") : t("cloudSubtitle")}</Text>
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{t(message)}</Text>}
    <SectionTitle title={t("method")} />
    <View style={styles.chips}>{methods.map(([value,label]) => <ChoiceChip checked={planning?.method === value} key={value} label={t(label)} disabled={busy||!planning} onPress={() => void changeMethod(value)} />)}</View>
    <Text style={styles.hint}>{t("methodHelp")}</Text>
    <SectionTitle title={t("viewingMonth")} />
    <Surface><View style={styles.monthRow}><Pressable accessibilityLabel={t("previousMonth")} accessibilityRole="button" disabled={busy} onPress={() => { if(operationBusy.current||!isCurrent())return;setPlanning(null); setChecked(false); setMonth((current) => new Date(current.getFullYear(), current.getMonth()-1,1)); }}><AppIcon name="chevron-left" size={20} color={colors.ink} /></Pressable><Text style={styles.month}>{month.toLocaleDateString(localeFor(language),{month:"long",year:"numeric"})}</Text><Pressable accessibilityLabel={t("nextMonth")} accessibilityRole="button" disabled={busy} onPress={() => { if(operationBusy.current||!isCurrent())return;setPlanning(null); setChecked(false); setMonth((current) => new Date(current.getFullYear(), current.getMonth()+1,1)); }}><AppIcon name="chevron-right" size={20} color={colors.ink} /></Pressable></View></Surface>
    <SectionTitle title={t("overview")} />
    <Surface><Text style={styles.title}>{t("incomeExpense",{income:historyLoading||historyError?"—":money(income),expense:historyLoading||historyError?"—":money(expense)})}</Text>
      {historyError && <Text style={styles.message}>{t("historyUnavailable")}</Text>}
      {splitError && <Text style={styles.message}>{t("splitsUnavailable")}</Text>}
      {budgets.map((budget) => { const spent = localMode ? guestBudgetSpent(guest.data, budget, selectedMonth) : budgetOverview(budget, selectedMonth, transactions, null, splits).spent;
        return <View key={budget.id}><Text style={styles.label}>{budget.name}</Text><Text style={styles.hint}>{t("budgetSummary",{planned:money(limitOf(budget.id)),actual:splitLoading || splitError ? "—" : money(spent)})}</Text>
          <Text style={styles.hint}>{t("threshold",{percent:budget.alertPercent})}</Text><View style={styles.chips}>{[50,80,90,100].map((percent) => <ChoiceChip disabled={busy} checked={budget.alertPercent === percent} key={percent} label={`${percent}%`} onPress={() => void changeThreshold(budget.id,percent)} />)}</View></View>; })}
    </Surface>
    {planning?.close && <Surface peach><Text style={styles.title}>{t("closed")}</Text><Text style={styles.hint}>{t("incomeExpense",{income:money(planning.close.income),expense:money(planning.close.expense)})}</Text></Surface>}
    <SectionTitle title={t("transfer")} />
    {budgets.length < 2 ? <EmptyState title={t("needBudgets")} description={t("needBudgetsHelp")} /> : <Surface>
      <Text style={styles.label}>{t("fromBudget")}</Text><View style={styles.chips}>{budgets.map((item) => <ChoiceChip disabled={busy} checked={source===item.id} key={item.id} label={`${item.name} · ${money(limitOf(item.id))}`} onPress={() => setSource(item.id)} />)}</View>
      <Text style={styles.label}>{t("toBudget")}</Text><View style={styles.chips}>{budgets.map((item) => <ChoiceChip disabled={busy} checked={destination===item.id} key={item.id} label={item.name} onPress={() => setDestination(item.id)} />)}</View>
      <Text style={styles.label}>{t("transferAmount")}</Text><TextInput money accessibilityLabel={t("transferAmountLabel")} keyboardType="number-pad" editable={!busy} onChangeText={setAmount} style={styles.input} value={amount} />
      <PrimaryAction busy={busy} disabled={guest.loading && localMode || Boolean(planning?.close) || !planning} label={t("transfer")} onPress={() => void transfer()} />
    </Surface>}
    <SectionTitle title={t("closeSection")} />
    <Surface>{checked && !reviewMatches ? <Text accessibilityLiveRegion="polite" style={styles.message}>{t("reviewChanged")}</Text> : null}<View style={styles.monthRow}><Text style={styles.title}>{t("reviewed")}</Text><Switch thumbColor={checked && reviewMatches ? colors.onPrimary : colors.muted} trackColor={{ false: colors.border, true: colors.primary }} accessibilityLabel={t("reviewed")} hitSlop={12} disabled={busy} onValueChange={value => { setChecked(value); setReviewedFor(value ? {scope,transactions,allocations:splits,budgets,limits} : null); }} value={checked && reviewMatches} /></View><View style={styles.monthRow}><Text style={styles.title}>{t("rollover")}</Text><Switch thumbColor={rollover ? colors.onPrimary : colors.muted} trackColor={{ false: colors.border, true: colors.primary }} accessibilityLabel={t("rollover")} hitSlop={12} disabled={busy} onValueChange={setRollover} value={rollover} /></View><Text style={styles.label}>{t("note")}</Text><TextInput accessibilityLabel={t("note")} editable={!busy} onChangeText={setNote} style={styles.input} value={note} /><PrimaryAction busy={busy} disabled={!planning || Boolean(planning.close) || selectedMonth >= monthKey(new Date()) || !checked || !reviewMatches || historyLoading || Boolean(historyError) || splitLoading || Boolean(splitError)} label={t("close")} onPress={confirmClose} /></Surface>
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({back:{color:colors.link,fontSize:15,fontWeight:"700",marginBottom:18},heading:{color:colors.ink,fontSize:26,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:7},message:{color:colors.expense,fontSize:13,marginTop:15},chips:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:8},hint:{color:colors.muted,fontSize:13,lineHeight:19,marginTop:8},monthRow:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",gap:8},arrow:{color:colors.link,fontSize:30},month:{color:colors.ink,fontSize:16,fontWeight:"700",flex:1,textAlign:"center"},title:{color:colors.ink,fontSize:15,fontWeight:"700",flexShrink:1},label:{color:colors.ink,fontSize:13,fontWeight:"700",marginTop:12},input:{backgroundColor:colors.cream,borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,marginVertical:10,minHeight:paperControl.height,paddingHorizontal:14}});
