import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import {ForecastCaptureCard} from "./forecast-capture-card";
import {SettlementCloudCard} from "./settlement-cloud-card";
import { useEffect,useRef,useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { formatCalendarDate } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { cashflowSettlements } from "./settlement-storage";
import type { SettlementDocument } from "./settlement-store";
import { resolveSettlements,type SettlementLink } from "./settlements";
import { expandSchedules,type CashflowSchedule } from "./schedules";
import { ledgerOpening,type LedgerSnapshot } from "./ledger-snapshot";
import { scopeSchedules } from "./schedule-scope";

function SettlementButton({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
 const {colors:c}=useAppTheme();
 return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={{minHeight:48,padding:12,borderWidth:1,borderColor:c.border,borderRadius:paperShape.button}}><Text style={{color:disabled?c.muted:c.primary}}>{label}</Text></Pressable>;
}
type Props={owner:string;snapshot:LedgerSnapshot;accounts:string[];currency:string;schedules:CashflowSchedule[];days:number;onChange:()=>void;onUse:(ids:string[])=>void};
export function SettlementReview(props:Props){return <SettlementReviewSession key={props.owner} {...props}/>;}
function SettlementReviewSession({owner,snapshot,accounts,currency,schedules,days,onChange,onUse}:Props){
 const {colors:c,language}=useAppTheme(),{t}=useTranslation("cashflow");
 const [doc,setDoc]=useState<SettlementDocument|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[expanded,setExpanded]=useState<string|null>(null);
 const [page,setPage]=useState(0),[cloudBusy,setCloudBusy]=useState(false);
 const epoch=useRef(0);
 function reload(){const generation=epoch.current;setDoc(null);void cashflowSettlements.load(owner).then(value=>{if(generation===epoch.current)setDoc(value);}).catch(()=>{if(generation===epoch.current)setFailed(true);});}
 useEffect(()=>{const generationRef=epoch;generationRef.current++;const generation=generationRef.current;void cashflowSettlements.load(owner).then(value=>{if(generation===epoch.current)setDoc(value);}).catch(()=>{if(generation===epoch.current)setFailed(true);});return()=>{generationRef.current++;};},[owner]);
 let occurrences:ReturnType<typeof expandSchedules>=[],ids:string[]|null=null,included:string[]=[];
 try{
  const start=new Date(snapshot.asOf).toISOString().slice(0,10),through=new Date(Date.parse(start+"T00:00:00Z")+(days-1)*86400000).toISOString().slice(0,10);
  occurrences=expandSchedules(scopeSchedules(schedules,accounts,currency),start,through);
  included=ledgerOpening(snapshot,accounts,currency,0).includedTransactionIds;
  const occurrenceIds=new Set(occurrences.map(row=>row.id));
  if(doc)ids=resolveSettlements(snapshot,accounts,currency,occurrences,doc.links.filter(link=>occurrenceIds.has(link.occurrenceId)));
 }catch{/* Invalidated evidence requires an explicit unlink before use. */}
 async function save(links:SettlementLink[]){
  if(!doc||busy||cloudBusy)return;const generation=epoch.current;setBusy(true);setFailed(false);onChange();
  try{const next=await cashflowSettlements.save(owner,doc.revision,links);if(generation===epoch.current){setDoc(next);setExpanded(null);}}
  catch{if(generation===epoch.current)setFailed(true);}finally{if(generation===epoch.current)setBusy(false);}
 }
 const includedSet=new Set(included),used=new Set(doc?.links.map(link=>link.transactionId));
 return <View style={{gap:10}}>
  <SettlementCloudCard owner={owner} onBusyChange={setCloudBusy} onChange={()=>{onChange();reload();}}/>
  {doc&&(days===7||days===30)&&<ForecastCaptureCard owner={owner} input={{snapshot,accounts,currency,schedules,days,links:doc.links,pendingCount:0}} disabled={busy||cloudBusy||ids===null}/>}
  <Text accessibilityRole="header" style={{color:c.text,fontWeight:"700"}}>{t("settlementTitle")}</Text>
  <Text style={{color:c.muted,lineHeight:22}}>{t("settlementNotice")}</Text>
  {doc&&doc.links.length>0&&<SettlementButton label={t("settlementClear",{count:doc.links.length})} onPress={()=>void save([])} disabled={(busy)||cloudBusy}/>}
  {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("settlementSaveError")}</Text>}
  {doc&&occurrences.slice(page*20,(page+1)*20).map(row=>{
   const link=doc.links.find(value=>value.occurrenceId===row.id);
   const candidates=expanded===row.id?snapshot.entries.filter(entry=>includedSet.has(entry.id)&&accounts.includes(entry.accountId)&&(!row.walletId||row.walletId===entry.accountId)&&entry.kind!=="transfer"&&entry.amount*(entry.kind==="expense"?-1:1)===row.amount&&!used.has(entry.id)):[];
   return <View key={row.id} style={{padding:10,gap:8,borderWidth:1,borderColor:c.border,borderRadius:10}}>
    <Text style={{color:c.text}}>{formatCalendarDate(row.day,language)} · {row.amount} {row.currency}</Text>
    {link?<>
     <Text style={{color:c.muted}}>{t(ids?.includes(row.id)?"settlementVerified":"settlementChanged")}</Text>
     {<SettlementButton label={t("settlementOpen")} onPress={()=>router.push({pathname:"/transactions/[id]",params:{id:link.transactionId}})} disabled={(false)||cloudBusy}/>}
     {<SettlementButton label={t("settlementUnlink")} onPress={()=>void save(doc.links.filter(value=>value.occurrenceId!==row.id))} disabled={(busy)||cloudBusy}/>}
    </>:<>
     {<SettlementButton label={t("settlementChoose")} onPress={()=>setExpanded(expanded===row.id?null:row.id)} disabled={(busy)||cloudBusy}/>}
     {expanded===row.id&&<>
      <Text style={{color:c.muted}}>{t("settlementCandidates")}</Text>
      {candidates.length===0&&<Text style={{color:c.muted}}>{t("settlementEmpty")}</Text>}
      {candidates.slice(0,20).map((entry,index)=><View key={entry.id} style={{gap:4}}>
       {<SettlementButton label={t("settlementInspect",{count:index+1,day:formatCalendarDate(new Date(entry.occurredAt).toISOString().slice(0,10),language)})} onPress={()=>router.push({pathname:"/transactions/[id]",params:{id:entry.id}})} disabled={(false)||cloudBusy}/>}
       {<SettlementButton label={t("settlementLink",{count:index+1})} onPress={()=>void save([...doc.links,{occurrenceId:row.id,day:row.day,amount:row.amount,currency:row.currency,transactionId:entry.id,transactionUpdatedAt:entry.updatedAt}])} disabled={(busy)||cloudBusy}/>}
      </View>)}
     </>}
    </>}
   </View>;
  })}
  {occurrences.length>20&&<View style={{gap:8}}>
   <Text style={{color:c.muted}}>{t("settlementPage",{page:page+1,count:Math.ceil(occurrences.length/20)})}</Text>
   {<SettlementButton label={t("settlementPrevious")} onPress={()=>{setExpanded(null);setPage(value=>value-1);}} disabled={(page===0)||cloudBusy}/>}
   {<SettlementButton label={t("settlementNext")} onPress={()=>{setExpanded(null);setPage(value=>value+1);}} disabled={((page+1)*20>=occurrences.length)||cloudBusy}/>}
  </View>}
  {doc&&ids===null&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("settlementScopeError")}</Text>}
  {<SettlementButton label={t("ledgerUse")} onPress={()=>{if(ids)onUse(ids);}} disabled={(!doc||busy||ids===null)||cloudBusy}/>}
 </View>;
}
