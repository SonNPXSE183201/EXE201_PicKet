import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { formatCalendarDate, localeFor } from "@/core/i18n/formatters";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { cashflowSchedules } from "./schedule-storage";
import type { ScheduleConflictReview } from "./schedule-sync-store";
import type { CashflowSchedule, CashflowScheduleDocument } from "@picket/domain";
import { useAccounts } from "@/features/accounts/accounts-context";

function ConflictButton({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
  const {colors:c}=useAppTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={{minHeight:48,padding:14,borderWidth:1,borderColor:c.border,borderRadius:paperShape.button,backgroundColor:disabled?c.disabledSurface:c.surface}}><Text style={{color:disabled?c.disabledText:c.primary}}>{label}</Text></Pressable>;
}

export function ScheduleConflictCard({owner}:{owner:string}){
  const {accounts}=useAccounts();
  const {session,localMode}=useAuth();
  const {colors:c,language}=useAppTheme();
  const {t}=useTranslation("cashflow");
  const [review,setReview]=useState<ScheduleConflictReview|null>(null);
  const [choices,setChoices]=useState<Record<string,"local"|"cloud"|"omit">>({});
  const [recovery,setRecovery]=useState<CashflowScheduleDocument|null>(null);
  const [showRecovery,setShowRecovery]=useState(false);
  const [busy,setBusy]=useState(false);
  const [failed,setFailed]=useState(false);
  const [saved,setSaved]=useState(false);
  const requests=useRef(new AbortController());
  useEffect(()=>{
    if(requests.current.signal.aborted)requests.current=new AbortController();
    return()=>requests.current.abort();
  },[owner,session?.access_token]);
  async function reconcile(apply:boolean){
    if(!session||session.user.id!==owner||!picketApi||busy)return;
    const controller=requests.current;
    const current=()=>!controller.signal.aborted;
    const fetch=()=>picketApi!.cashflowSchedules(session.access_token,controller.signal);
    setBusy(true);setFailed(false);setSaved(false);
    try{
      if(apply&&review){
        await cashflowSchedules.resolveConflict(owner,review,choices,fetch,current);
        if(current()){setReview(null);setChoices({});setSaved(true);}
      }else{
        const result=await cashflowSchedules.reviewConflict(owner,fetch,current);
        if(current()){setReview(result);setChoices({});}
      }
      const copy=await cashflowSchedules.recovery(owner);
      if(current())setRecovery(copy);
    }catch{if(current())setFailed(true);}
    finally{if(current())setBusy(false);}
  }
  const rows=review?[...new Set([...review.local.schedules,...review.remote.schedules].map(row=>row.id))]:[];
  const describe=(row:CashflowSchedule|undefined)=>{
    if(!row)return t("missingCopy");
    const format=new Intl.NumberFormat(localeFor(language),{style:"currency",currency:row.currency});
    const money=format.format(row.amount/10**(format.resolvedOptions().maximumFractionDigits??2));
    const wallet=row.walletId?(accounts.find(account=>account.id===row.walletId)?.name??t("walletUnavailable")):t("walletUnassigned");
    return `${money} · ${formatCalendarDate(row.startDay,language)} · ${t(row.frequency)}${row.endDay?` · ${formatCalendarDate(row.endDay,language)}`:""} · ${t(row.active?"active":"inactive")} · ${wallet}`;
  };
  if(localMode||session?.user.id!==owner)return null;
  return <View style={{gap:12}}>
    <ConflictButton label={t("reviewCopies")} onPress={()=>void reconcile(false)} disabled={busy}/>
    {review&&<View style={{gap:14,padding:14,borderWidth:1,borderColor:c.border,borderRadius:14}}>
      <Text accessibilityRole="header" style={{fontSize:20,color:c.text,fontWeight:"700"}}>{t("conflictTitle")}</Text>
      <Text style={{color:c.muted}}>{t("conflictHint")}</Text>
      {rows.map((id,index)=>{
        const local=review.local.schedules.find(row=>row.id===id),cloud=review.remote.schedules.find(row=>row.id===id);
        return <View key={id} style={{gap:8}}><Text style={{color:c.text,fontWeight:"600"}}>{t("scheduleNumber",{count:index+1})}</Text>
          <Text style={{color:c.text}}>{t("deviceCopy")}: {describe(local)}</Text>
          <Text style={{color:c.text}}>{t("cloudCopy")}: {describe(cloud)}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t("scheduleNumber",{count:index+1})} style={{gap:6}}>
            {(["local","cloud","omit"] as const).filter(choice=>choice==="omit"||(choice==="local"?local:cloud)).map(choice=><Pressable key={choice} accessibilityRole="radio" accessibilityState={{checked:choices[id]===choice,disabled:busy}} disabled={busy} onPress={()=>setChoices(old=>({...old,[id]:choice}))} style={{minHeight:48,padding:12,borderWidth:1,borderColor:choices[id]===choice?c.primary:c.border,borderRadius:paperShape.button}}><Text style={{color:c.text}}>{t(choice==="local"?"keepDevice":choice==="cloud"?"keepCloud":"omitSchedule")}</Text></Pressable>)}
          </View></View>;
      })}
      <ConflictButton label={t("applyChoices")} onPress={()=>void reconcile(true)} disabled={busy||rows.some(id=>!choices[id])}/>
      <ConflictButton label={t("cancelReview")} onPress={()=>setReview(null)} disabled={busy}/>
    </View>}
    {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("conflictChanged")}</Text>}
    {saved&&<Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t("conflictSaved")}</Text>}
    {recovery&&<View style={{gap:8}}><ConflictButton label={t("showRecovery")} onPress={()=>setShowRecovery(value=>!value)}/>{showRecovery&&recovery.schedules.map(row=><Text key={row.id} style={{color:c.text}}>{describe(row)}</Text>)}</View>}
  </View>;
}
