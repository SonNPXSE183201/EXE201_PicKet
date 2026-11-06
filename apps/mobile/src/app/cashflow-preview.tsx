import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { Redirect, router } from "expo-router";
import * as Crypto from "expo-crypto";
import { useCallback,useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { formatCalendarDate, localCalendarDay, localeFor } from "@/core/i18n/formatters";
import { guestOwnerId } from "@/core/local/guest-finance";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { cashflowSchedules } from "@/features/cashflow/schedule-storage";
import type { ScheduleDocument } from "@/features/cashflow/schedule-store";
import { expandSchedules, type CashflowSchedule } from "@/features/cashflow/schedules";
import { calculateCashflow } from "@/features/cashflow/forecast";
import { parseScenarioMoney } from "@/features/cashflow/scenario-form";
import { syncCashflowSchedules } from "@/features/cashflow/schedule-sync";
import { ScheduleConflictCard } from "@/features/cashflow/schedule-conflict-card";
import { LedgerFactsCard } from "@/features/cashflow/ledger-card";
import { scopeSchedules } from "@/features/cashflow/schedule-scope";
import { useAccounts } from "@/features/accounts/accounts-context";

export default function CashflowPreview(){
  const {session,localMode}=useAuth();
  const owner=localMode?guestOwnerId:session?.user.id;
  if(!__DEV__||!owner)return <Redirect href="/"/>;
  return <Scenario key={owner} owner={owner}/>;
}

function Scenario({owner}:{owner:string}){
  const {session,localMode}=useAuth();
  const {accounts}=useAccounts();
  const cloudEnabled=!!session&&!localMode&&session.user.id===owner&&process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED==="true";
  const {colors:c,language,theme}=useAppTheme();
  const {t}=useTranslation("cashflow");
  const {t:observationCopy}=useTranslation("forecastObservations");
  const [doc,setDoc]=useState<ScheduleDocument|null>(null);
  const [revision,setRevision]=useState(0);
  const [failed,setFailed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [editingRevision,setEditingRevision]=useState<number|null>(null);
  const [syncBusy,setSyncBusy]=useState(false);
  const [syncFailed,setSyncFailed]=useState(false);
  const [syncStatus,setSyncStatus]=useState({linked:false,pending:0});
  const manualSyncRequests=useRef(new AbortController());
  useEffect(()=>{
    if(manualSyncRequests.current.signal.aborted)manualSyncRequests.current=new AbortController();
    return()=>manualSyncRequests.current.abort();
  },[]);
  const [start,setStart]=useState(()=>localCalendarDay());
  const [scheduleDay,setScheduleDay]=useState(start);
  const [endDay,setEndDay]=useState("");
  const [enabled,setEnabled]=useState(true);
  const [currency,setCurrency]=useState("VND");
  const [openingState,setOpeningState]=useState<{value:string;ledgerSource:{signature:string;settledIds:string[];accounts:string[]}|null}>({value:"",ledgerSource:null});
  const [walletId,setWalletId]=useState<string|undefined>();
  const opening=openingState.value,ledgerSource=openingState.ledgerSource;
  const setOpening=(value:string)=>setOpeningState({value,ledgerSource:null});
  const [amount,setAmount]=useState("");
  const [frequency,setFrequency]=useState<CashflowSchedule["frequency"]>("once");
  const [days,setDays]=useState(7);
  const [purchaseDay,setPurchaseDay]=useState("");
  const [purchaseAmount,setPurchaseAmount]=useState("");
  const [result,setResult]=useState<ReturnType<typeof calculateCashflow>|null>(null);
  const invalidateLedger=useCallback(()=>{
    setOpeningState(current=>current.ledgerSource?{value:"",ledgerSource:null}:current);setResult(null);
  },[]);
  const ledgerSignature=JSON.stringify([doc?.revision,currency,days]);
  useEffect(()=>{
    let active=true;
    const refresh=()=>{void Promise.all([cashflowSchedules.load(owner),cashflowSchedules.status(owner)]).then(([value,status])=>{if(active){setDoc(value);setSyncStatus(status);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});};
    refresh();
    const unsubscribe=cashflowSchedules.subscribe(owner,refresh);
    return()=>{active=false;unsubscribe();};
  },[owner,revision]);
  // Clear displayed calculations when any assumption or persisted schedule changes.
  const signature=JSON.stringify([doc?.revision,start,currency,opening,days,purchaseDay,purchaseAmount,ledgerSource]);
  const [calculatedSignature,setCalculatedSignature]=useState("");
  const visible=result&&calculatedSignature===signature?result:null;
  const money=(value:number,code:string)=>{
    const formatter=new Intl.NumberFormat(localeFor(language),{style:"currency",currency:code});
    return formatter.format(value/10**(formatter.resolvedOptions().maximumFractionDigits??2));
  };
  const button=(label:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={{minHeight:48,padding:14,borderRadius:paperShape.button,backgroundColor:disabled?c.disabledSurface:c.surface}}><Text style={{color:disabled?c.disabledText:c.primary}}>{label}</Text></Pressable>;
  const field=(label:string,value:string,onChange:(value:string)=>void)=><View style={{gap:6}}><Text style={{color:c.text}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} keyboardAppearance={theme} selectionColor={c.primary} style={{minHeight:48,color:c.text,borderColor:c.border,borderWidth:1,borderRadius:12,padding:12}}/></View>;
  const [mutate]=useState(()=>{
    let inFlight=false;
    return async(change:()=>Promise<ScheduleDocument>)=>{
      if(inFlight)return;
      inFlight=true;
      setBusy(true);setSaved(false);
      try{setDoc(await change());setFailed(false);setSaved(true);setEditing(null);setEditingRevision(null);setWalletId(undefined);setAmount("");setEndDay("");setEnabled(true);}
      catch{setFailed(true);}finally{inFlight=false;setBusy(false);}
    };
  });
  function startSync(){
    if(!session)return;
    const controller=manualSyncRequests.current;
    setSyncBusy(true);setSyncFailed(false);
    void syncCashflowSchedules(session,controller.signal).then(value=>{if(!controller.signal.aborted)setDoc(value);}).catch(()=>{if(!controller.signal.aborted)setSyncFailed(true);}).finally(()=>{if(!controller.signal.aborted)setSyncBusy(false);});
  }
  function calculate(){
    try{
      if(!doc)throw new Error("Schedules unavailable");
      if(ledgerSource&&ledgerSource.signature!==ledgerSignature)throw new Error("Recheck settlement evidence after schedules change");
      formatCalendarDate(start,language);
      const through=new Date(Date.parse(`${start}T00:00:00Z`)+(days-1)*86400000).toISOString().slice(0,10);
      const scoped=ledgerSource?scopeSchedules(doc.schedules,ledgerSource.accounts,currency):doc.schedules.filter(row=>row.currency===currency);
      const occurrences=expandSchedules(scoped,start,through,ledgerSource?.settledIds??[]);
      const purchase=purchaseDay||purchaseAmount?{day:purchaseDay,amount:parseScenarioMoney(purchaseAmount)}:undefined;
      setResult(calculateCashflow({startDay:start,days,currency,openingBalance:parseScenarioMoney(opening),occurrences},purchase));
      setCalculatedSignature(signature);setFailed(false);
    }catch{setResult(null);setFailed(true);}
  }
  return <SafeAreaView style={{flex:1,backgroundColor:c.canvas}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:16,paddingBottom:60}}>
    {button(t("back"),()=>router.back())}
    <Text accessibilityRole="header" style={{color:c.text,fontSize:26,fontWeight:"800"}}>{t("title")}</Text>
    <Text style={{color:c.muted}}>{t("notice")}</Text>
    <Text style={{color:c.muted}}>{t("units")}</Text>
    <Text accessibilityLiveRegion="polite" style={{color:failed?c.expense:c.muted}}>{failed?t("error"):saved?t("saved"):!doc?t("loading"):""}</Text>
    {failed&&button(t("reload"),()=>setRevision(value=>value+1),busy)}
    {cloudEnabled&&<View style={{gap:10}}><Text accessibilityLiveRegion="polite" style={{color:syncFailed?c.expense:c.muted}}>{syncFailed?t("syncError"):syncStatus.pending?t("syncPending",{count:syncStatus.pending}):syncStatus.linked?t("syncReady"):""}</Text><Pressable accessibilityRole="button" accessibilityState={{disabled:busy||syncBusy}} disabled={busy||syncBusy} onPress={startSync} style={{minHeight:48,padding:14,borderRadius:paperShape.button,backgroundColor:c.surface}}><Text style={{color:c.link}}>{t("sync")}</Text></Pressable></View>}
    {field(t("currency"),currency,value=>{invalidateLedger();setCurrency(value.toUpperCase());setWalletId(undefined);})}
    {cloudEnabled&&<ScheduleConflictCard owner={owner}/>}
    {cloudEnabled&&button(observationCopy("open"),()=>router.push("/forecast-observations-preview"))}
    {field(t("start"),start,value=>{invalidateLedger();setStart(value);})}
    {field(t("opening"),opening,setOpening)}
    {ledgerSource&&ledgerSource.signature!==ledgerSignature&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("settlementChanged")}</Text>}
    {cloudEnabled&&<LedgerFactsCard owner={owner} currency={currency} schedules={doc?.schedules??[]} days={days} onInvalidate={invalidateLedger} onUse={(balance,day,settledIds,selectedAccounts)=>{setOpeningState({value:String(balance),ledgerSource:{signature:ledgerSignature,settledIds,accounts:selectedAccounts}});setStart(day);setResult(null);}}/>}
    <View accessibilityRole="radiogroup" accessibilityLabel={t("title")} style={{gap:8}}>{[7,30].map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:days===value}} onPress={()=>setDays(value)} style={{padding:14,minHeight:48,backgroundColor:days===value?c.elevated:c.surface}}><Text style={{color:c.text}}>{t(value===7?"seven":"thirty")}</Text></Pressable>)}</View>
    <Text accessibilityRole="header" style={{color:c.text,fontSize:22,fontWeight:"700"}}>{t("schedules")}</Text>
    {doc?.schedules.length===0&&<Text style={{color:c.muted}}>{t("empty")}</Text>}
    {doc?.schedules.map(row=><View key={row.id} style={{padding:14,gap:8,backgroundColor:c.elevated,borderRadius:paperShape.card}}><Text style={{color:c.text}}>{formatCalendarDate(row.startDay,language)} · {t(row.frequency)} · {money(row.amount,row.currency)} · {row.walletId?(accounts.find(account=>account.id===row.walletId)?.name??t("walletUnavailable")):t("walletUnassigned")}</Text>{button(t("edit"),()=>{setEditing(row.id);setEditingRevision(doc.revision);setWalletId(row.walletId);setScheduleDay(row.startDay);setEndDay(row.endDay??"");setEnabled(row.active);setCurrency(row.currency);setAmount(String(row.amount));setFrequency(row.frequency);},busy)}{button(t("remove"),()=>void mutate(()=>cashflowSchedules.remove(owner,doc.revision,row.id)),busy)}</View>)}
    {field(t("start"),scheduleDay,setScheduleDay)}
    {field(t("end"),endDay,setEndDay)}
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:enabled}} onPress={()=>setEnabled(value=>!value)} style={{padding:14,minHeight:48,backgroundColor:c.surface}}><Text style={{color:c.text}}>{enabled?"☑":"☐"} {t("active")}</Text></Pressable>
    <Text style={{color:c.muted}}>{t("walletScopeHint")}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("walletScope")} style={{gap:8}}>
      <Pressable accessibilityRole="radio" accessibilityState={{checked:!walletId}} onPress={()=>setWalletId(undefined)} style={{minHeight:48,padding:12,backgroundColor:c.surface}}><Text style={{color:c.text}}>{t("walletUnassigned")}</Text></Pressable>
      {accounts.filter(account=>!account.archived&&!account.deletedAt&&account.currencyCode===currency).map(account=><Pressable key={account.id} accessibilityRole="radio" accessibilityState={{checked:walletId===account.id}} onPress={()=>setWalletId(account.id)} style={{minHeight:48,padding:12,backgroundColor:c.surface}}><Text style={{color:c.text}}>{walletId===account.id?"●":"○"} {account.name}</Text></Pressable>)}
    </View>
    {field(t("amount"),amount,setAmount)}
    <View accessibilityRole="radiogroup" accessibilityLabel={t("schedules")} style={{gap:8}}>{(["once","weekly","monthly"] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:frequency===value}} onPress={()=>setFrequency(value)} style={{padding:14,minHeight:48,backgroundColor:frequency===value?c.elevated:c.surface}}><Text style={{color:c.text}}>{t(value)}</Text></Pressable>)}</View>
    {button(t("save"),()=>void mutate(async()=>{
      if(!doc)throw new Error("Schedules unavailable");
      return cashflowSchedules.save(owner,editingRevision??doc.revision,{id:editing??Crypto.randomUUID(),startDay:scheduleDay,frequency,amount:parseScenarioMoney(amount),currency,active:enabled,...(walletId?{walletId}:{}),...(endDay?{endDay}:{})});
    }),!doc||busy)}
    {editing&&button(t("cancel"),()=>{setEditing(null);setEditingRevision(null);setWalletId(undefined);setAmount("");setEndDay("");setEnabled(true);},busy)}
    {field(t("purchaseDay"),purchaseDay,setPurchaseDay)}
    {field(t("purchaseAmount"),purchaseAmount,setPurchaseAmount)}
    <Text style={{color:c.muted}}>{t("purchaseHint")}</Text>
    {button(t("calculate"),calculate,!doc||busy)}
    {visible&&<View style={{gap:12}}><Text style={{color:c.text,fontWeight:"700"}}>{t("minimum")}: {money(visible.minimum,visible.currency)}</Text>{visible.scenario&&<Text style={{color:c.text,fontWeight:"700"}}>{t("scenarioMinimum")}: {money(Math.min(parseScenarioMoney(opening),...visible.scenario.map(row=>row.balance)),visible.currency)}</Text>}<Text style={{color:c.muted}}>{t("unknown")}</Text>{visible.baseline.map((row,index)=><View key={row.day} style={{padding:12,backgroundColor:c.surface,gap:6}}><Text style={{color:c.text}}>{formatCalendarDate(row.day,language)}</Text><Text style={{color:c.text}}>{t("baseline")}: {money(row.balance,visible.currency)}</Text>{visible.scenario&&<Text style={{color:c.text}}>{t("scenario")}: {money(visible.scenario[index].balance,visible.currency)}</Text>}</View>)}</View>}
  </ScrollView></SafeAreaView>;
}
