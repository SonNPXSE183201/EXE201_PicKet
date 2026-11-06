import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useEffect,useRef,useState } from "react";
import { AppState, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { picketApi } from "@/core/api/client";
import { listPendingMutations,subscribeToMutationQueue } from "@/core/sync/mutation-queue";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { localeFor } from "@/core/i18n/formatters";
import { ledgerOpening,parseLedgerSnapshot,type LedgerSnapshot } from "./ledger-snapshot";
import { SettlementReview } from "./settlement-review";
import type { CashflowSchedule } from "./schedules";
import { WeeklyStoryCard } from "./weekly-story-card";

type Props={storyOnly?:boolean;owner:string;currency:string;schedules:CashflowSchedule[];days:number;onInvalidate:()=>void;onUse:(balance:number,day:string,settledIds:string[],accounts:string[])=>void};
export function LedgerFactsCard(props:Props){
 const {session,localMode}=useAuth();
 if(!session||localMode||session.user.id!==props.owner)return null;
 return <LedgerFactsSession key={session.access_token} {...props}/>;
}
function LedgerFactsSession({storyOnly=false,owner,currency,schedules,days,onInvalidate,onUse}:Props){
 const {session,localMode}=useAuth();
 const {colors:c,language}=useAppTheme();const {t}=useTranslation("cashflow");
 const [snapshot,setSnapshot]=useState<LedgerSnapshot|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[pending,setPending]=useState(0);
 const [showEntries,setShowEntries]=useState(false);
 const requests=useRef(new AbortController());
 const generation=useRef(0);
 useEffect(()=>{
  if(requests.current.signal.aborted)requests.current=new AbortController();

  const epoch=generation;
  const invalidate=()=>{epoch.current++;setSnapshot(null);onInvalidate();};
  const listener=AppState.addEventListener("change",state=>{if(state!=="active")invalidate();});
  const stop=subscribeToMutationQueue(invalidate);
  const timer=setInterval(invalidate,60000);
  return()=>{epoch.current++;requests.current.abort();listener.remove();stop();clearInterval(timer);onInvalidate();};
 },[owner,session?.access_token,onInvalidate]);
 async function load(){
  const api=picketApi;if(!session||session.user.id!==owner||localMode||!api||busy)return;
  const controller=requests.current;
  const origin=generation.current;
  setBusy(true);setFailed(false);setSnapshot(null);onInvalidate();
  try{
   const before=await listPendingMutations(owner);
   if(before.length){setPending(before.length);throw new Error("Pending changes");}
   const result=parseLedgerSnapshot(await api.cashflowLedger(session.access_token,controller.signal));
   const after=await listPendingMutations(owner);
   if(controller.signal.aborted||origin!==generation.current)return;
   setPending(after.length);if(after.length)throw new Error("Changes made while loading");
   setSnapshot(result);setSelected([]);
  }catch{if(!controller.signal.aborted)setFailed(true);}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 let facts:ReturnType<typeof ledgerOpening>|null=null;
 try{if(snapshot&&selected.length)facts=ledgerOpening(snapshot,selected,currency,pending);}catch{/* Incomplete facts cannot become an opening assumption. */}
 const money=(amount:number)=>{
  const formatter=new Intl.NumberFormat(localeFor(language),{style:"currency",currency});
  return formatter.format(amount/10**(formatter.resolvedOptions().maximumFractionDigits??2));
 };
 if(!session||localMode||session.user.id!==owner)return null;
 return <View style={{padding:16,gap:12,borderRadius:14,borderWidth:1,borderColor:c.border}}>
  <Text accessibilityRole="header" style={{color:c.text,fontSize:21,fontWeight:"700"}}>{t("ledgerTitle")}</Text>
  <Text style={{color:c.muted,lineHeight:22}}>{t("ledgerNotice")}</Text>
  <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} onPress={()=>void load()} style={{minHeight:48,padding:14,backgroundColor:c.surface}}><Text style={{color:c.link}}>{t(busy?"ledgerLoading":"ledgerLoad")}</Text></Pressable>
  {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t(pending?"ledgerPending":"ledgerError")}</Text>}
  {snapshot&&<>
   <Text style={{color:c.muted}}>{t("ledgerOrigin",{time:new Intl.DateTimeFormat(localeFor(language),{dateStyle:"medium",timeStyle:"short"}).format(new Date(snapshot.asOf))})}</Text>
   {snapshot.wallets.filter(row=>!row.archived&&!row.deletedAt&&row.currencyCode===currency).map(row=><Pressable key={row.id} accessibilityRole="checkbox" accessibilityLabel={row.name} accessibilityState={{checked:selected.includes(row.id)}} onPress={()=>{onInvalidate();setSelected(old=>old.includes(row.id)?old.filter(id=>id!==row.id):[...old,row.id]);}} style={{minHeight:48,padding:12,borderWidth:1,borderColor:selected.includes(row.id)?c.primary:c.border,borderRadius:paperShape.button}}><Text style={{color:c.text}}>{selected.includes(row.id)?"☑":"☐"} {row.name}</Text></Pressable>)}
   {selected.length>0&&!facts&&<Text style={{color:c.expense}}>{t("ledgerError")}</Text>}
   {facts&&(storyOnly?<WeeklyStoryCard key={JSON.stringify([selected,currency,snapshot.asOf])} snapshot={snapshot} accounts={selected} currency={currency}/>:<>
    <Text accessibilityLiveRegion="polite" style={{color:c.text,fontWeight:"700"}}>{t("ledgerBalance")}: {money(facts.balance)}</Text>
    <Pressable accessibilityRole="button" onPress={()=>setShowEntries(value=>!value)} style={{minHeight:48,padding:12}}><Text style={{color:c.link}}>{t("ledgerRecords",{count:facts.includedTransactionIds.length})}</Text></Pressable>
    {showEntries&&facts.includedTransactionIds.map((id,index)=><Pressable key={id} accessibilityRole="button" onPress={()=>router.push({pathname:"/transactions/[id]",params:{id}})} style={{minHeight:48,padding:12}}><Text style={{color:c.link}}>{t("ledgerRecord",{count:index+1})}</Text></Pressable>)}
    <Text style={{color:c.muted,lineHeight:22}}>{t("ledgerUseHint")}</Text>
    <SettlementReview key={JSON.stringify([selected,currency,schedules,days])} owner={owner} snapshot={snapshot} accounts={selected} currency={currency} schedules={schedules} days={days} onChange={onInvalidate} onUse={ids=>{if(facts&&snapshot)onUse(facts.balance,new Date(snapshot.asOf).toISOString().slice(0,10),ids,[...selected]);}}/>
   </>)}
  </>}
 </View>;
}
