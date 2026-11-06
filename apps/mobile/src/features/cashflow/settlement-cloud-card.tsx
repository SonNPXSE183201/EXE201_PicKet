import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import {useEffect,useRef,useState} from "react";
import { AppState, View } from "react-native";
import * as Crypto from "expo-crypto";
import {router} from "expo-router";
import {useTranslation} from "react-i18next";
import {ApiError} from "@picket/api-client";
import {picketApi} from "@/core/api/client";
import {AccessiblePressable as Pressable} from "@/core/ui/accessible-pressable";
import {formatCalendarDate,localeFor} from "@/core/i18n/formatters";
import {useAuth} from "@/features/auth/auth-context";
import {useAppTheme} from "@/features/settings/appearance-provider";
import {cashflowSettlements} from "./settlement-storage";
import {SettlementMutationRejected,type SettlementReview,type SettlementDocument} from "./settlement-store";
import type {SettlementLink} from "./settlements";

function SettlementButton({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
 const {colors:c}=useAppTheme();
 return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={{minHeight:48,padding:12,borderWidth:1,borderColor:c.border,borderRadius:paperShape.button}}><Text style={{color:disabled?c.muted:c.primary}}>{label}</Text></Pressable>;
}
export function SettlementCloudCard({owner,onChange,onBusyChange}:{owner:string;onChange:()=>void;onBusyChange:(busy:boolean)=>void}){
 const {session,localMode}=useAuth(),{colors:c,language}=useAppTheme(),{t}=useTranslation("cashflow");
 const [review,setReview]=useState<SettlementReview|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[saved,setSaved]=useState(false);
 const [status,setStatus]=useState<{pending:boolean;recovery?:SettlementDocument}>({pending:false}),[recovery,setRecovery]=useState(false),[page,setPage]=useState(0);
 const scope=useRef({active:true,controller:new AbortController(),epoch:0});
 useEffect(()=>{
  const run={active:true,controller:new AbortController(),epoch:0};scope.current=run;
  void cashflowSettlements.status(owner).then(value=>{if(run.active)setStatus(value);}).catch(()=>{if(run.active)setFailed(true);});
  const listener=AppState.addEventListener("change",state=>{if(state!=="active"){run.epoch++;setReview(null);setRecovery(false);}});
  return()=>{run.active=false;run.controller.abort();listener.remove();};
 },[owner,session?.access_token]);
 if(localMode||session?.user.id!==owner||process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED!=="true")return null;
 async function run(action:"review"|"publish"|"adopt"){
  if(busy||!session||session.user.id!==owner||!picketApi)return;
  const operation=scope.current,epoch=operation.epoch,current=()=>operation.active&&scope.current===operation&&epoch===operation.epoch;
  const token=session.access_token,api=picketApi,fetch=()=>api.cashflowSettlements(token,operation.controller.signal);
  setBusy(true);onBusyChange(true);setFailed(false);setSaved(false);
  try{
   if(action==="review"){const value=await cashflowSettlements.review(owner,fetch,current);if(current()){setReview(value);setPage(0);}}
   else{
    onChange();
    if(action==="adopt"){if(!review)return;await cashflowSettlements.adopt(owner,review,fetch,current);}
    else await cashflowSettlements.publish(owner,review,fetch,async(revision,links,key)=>{
     try{return await api.saveCashflowSettlements(token,revision,links,key,operation.controller.signal);}
     catch(error){if(error instanceof ApiError&&[400,401,403,404,409,413,422].includes(error.status))throw new SettlementMutationRejected();throw error;}
    },()=>Crypto.randomUUID(),current);
    if(current()){setReview(null);setSaved(true);onChange();}
   }
  }catch{if(current())setFailed(true);}
  finally{
   try{const value=await cashflowSettlements.status(owner);if(operation.active&&scope.current===operation)setStatus(value);}catch{if(current())setFailed(true);}
   if(operation.active&&scope.current===operation){setBusy(false);onBusyChange(false);}
  }
 }
 function describe(link:SettlementLink){
  const formatter=new Intl.NumberFormat(localeFor(language),{style:"currency",currency:link.currency});
  return `${formatCalendarDate(link.day,language)} · ${formatter.format(link.amount/10**(formatter.resolvedOptions().maximumFractionDigits??2))}`;
 }
 const rows=review?[...new Set([...review.local.links,...review.remote.links].map(link=>link.occurrenceId))].sort():[];
 return <View style={{gap:10,padding:12,borderWidth:1,borderColor:c.border,borderRadius:12}}>
  <Text accessibilityRole="header" style={{color:c.text,fontWeight:"700"}}>{t("settlementCloudTitle")}</Text>
  <Text style={{color:c.muted,lineHeight:22}}>{t("settlementCloudNotice")}</Text>
  {status.pending?<><Text style={{color:c.muted}}>{t("settlementCloudPending")}</Text>{<SettlementButton label={t("settlementCloudRetry")} onPress={()=>void run("publish")} disabled={busy}/>}</>:<SettlementButton label={t("settlementCloudReview")} onPress={()=>void run("review")} disabled={busy}/>}
  {review&&!status.pending&&<View style={{gap:10}}>
   <Text style={{color:c.text}}>{t("settlementCloudVersions",{local:review.local.links.length,remote:review.remote.links.length,revision:review.remote.revision})}</Text>
   {rows.slice(page*20,(page+1)*20).map((id,index)=><View key={id} style={{gap:6}}>
    <Text style={{color:c.text,fontWeight:"600"}}>{t("settlementCloudNumber",{count:page*20+index+1})}</Text>
    {(["local","remote"] as const).map(side=>{const link=review[side].links.find(value=>value.occurrenceId===id);return <View key={side}>
     <Text style={{color:c.muted}}>{t(side==="local"?"deviceCopy":"cloudCopy")}: {link?describe(link):t("settlementCloudMissing")}</Text>
     {link&&<SettlementButton label={t("settlementCloudSource")} onPress={()=>router.push({pathname:"/transactions/[id]",params:{id:link.transactionId}})} disabled={busy}/>}
    </View>;})}
   </View>)}
   {rows.length>20&&<>{<SettlementButton label={t("settlementPrevious")} onPress={()=>setPage(value=>value-1)} disabled={busy||page===0}/>}{<SettlementButton label={t("settlementNext")} onPress={()=>setPage(value=>value+1)} disabled={busy||(page+1)*20>=rows.length}/>}</>}
   {<SettlementButton label={t("settlementCloudPublish")} onPress={()=>void run("publish")} disabled={busy}/>}
   {<SettlementButton label={t("settlementCloudAdopt")} onPress={()=>void run("adopt")} disabled={busy}/>}
   {<SettlementButton label={t("cancelReview")} onPress={()=>setReview(null)} disabled={busy}/>}
  </View>}
  {status.recovery&&<>{<SettlementButton label={t("settlementCloudRecovery")} onPress={()=>setRecovery(value=>!value)} disabled={busy}/>}{recovery&&status.recovery.links.map((link,index)=><View key={link.occurrenceId}><Text style={{color:c.muted}}>{index+1}. {describe(link)}</Text><SettlementButton label={t("settlementCloudSource")} onPress={()=>router.push({pathname:"/transactions/[id]",params:{id:link.transactionId}})} disabled={busy}/></View>)}</>}
  {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("settlementCloudError")}</Text>}
  {saved&&<Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t("settlementCloudSaved")}</Text>}
 </View>;
}
