import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import {useEffect,useRef,useState} from "react";
import { Alert, AppState, View } from "react-native";
import {Redirect,router} from "expo-router";
import {useTranslation} from "react-i18next";
import {PicketTextInput as TextInput} from "@/core/ui/picket-text-input";
import {AccessiblePressable as Pressable} from "@/core/ui/accessible-pressable";
import {PicketScreen,TopAppBar} from "@/core/ui/picket-ui";
import {formatCalendarDate,formatInstant,localeFor} from "@/core/i18n/formatters";
import {useAuth} from "@/features/auth/auth-context";
import {useAccounts} from "@/features/accounts/accounts-context";
import {useAppTheme} from "@/features/settings/appearance-provider";
import {forecastObservations} from "@/features/cashflow/forecast-observation-storage";
import {evaluateCapturedForecast,observationDay,type FrozenForecastCase} from "@/features/cashflow/forecast-observations";
import type {ObservationDocument} from "@/features/cashflow/forecast-observation-store";
import {parseScenarioMoney} from "@/features/cashflow/scenario-form";

function HistoryButton({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
 const {colors:c}=useAppTheme();return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={{minHeight:48,padding:12,borderWidth:1,borderColor:c.border,borderRadius:paperShape.button}}><Text style={{color:disabled?c.muted:c.primary}}>{label}</Text></Pressable>;
}
export default function ForecastObservationPreview(){
 const {session,localMode}=useAuth();
 if(!__DEV__||!session||localMode||process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED!=="true")return <Redirect href="/"/>;
 return <ObservationSession key={session.access_token} owner={session.user.id}/>;
}
function ObservationSession({owner}:{owner:string}){
 const {colors:c,language}=useAppTheme(),{t}=useTranslation("forecastObservations"),{t:cashflow}=useTranslation("cashflow"),{accounts}=useAccounts();
 const [doc,setDoc]=useState<ObservationDocument|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[saved,setSaved]=useState<"saved"|"deleted"|null>(null),[shown,setShown]=useState(false),[expanded,setExpanded]=useState<string|null>(null),[page,setPage]=useState(0),[clock,setClock]=useState(()=>new Date().toISOString());
 const [draft,setDraft]=useState<{id:string;revision:number;day:string;balance:string;confirmed:boolean}|null>(null);
 const scope=useRef({alive:true,active:true,epoch:0});
 useEffect(()=>{
  const run={alive:true,active:true,epoch:0};scope.current=run;
  void forecastObservations.load(owner).then(value=>{if(run.active)setDoc(value);}).catch(()=>{if(run.active)setFailed(true);});
  const listener=AppState.addEventListener("change",state=>{run.epoch++;run.active=state==="active";if(state!=="active"){setShown(false);setExpanded(null);setDraft(null);}else setClock(new Date().toISOString());});
  const timer=setInterval(()=>{if(run.active)setClock(new Date().toISOString());},60000);
  return()=>{run.alive=false;run.active=false;run.epoch++;listener.remove();clearInterval(timer);};
 },[owner]);
 async function perform(action:(current:()=>boolean)=>Promise<unknown>,success:"saved"|"deleted"|null=null){
  if(busy)return;const run=scope.current,epoch=run.epoch,current=()=>run.active&&scope.current===run&&epoch===run.epoch;
  setBusy(true);setFailed(false);setSaved(null);
  try{if(!current())return;await action(current);const value=await forecastObservations.load(owner);if(current()){setDoc(value);setDraft(null);setSaved(success);setPage(current=>Math.min(current,Math.max(0,Math.ceil(value.cases.length/5)-1)));setClock(new Date().toISOString());}}
  catch{if(current())setFailed(true);}finally{if(scope.current===run&&run.alive)setBusy(false);}
 }
 const money=(value:number,currency:string)=>{if(!shown)return "••••••";const formatter=new Intl.NumberFormat(localeFor(language),{style:"currency",currency});return formatter.format(value/10**(formatter.resolvedOptions().maximumFractionDigits??2));};
 function remove(record:FrozenForecastCase){Alert.alert(t("deleteTitle"),t("deleteBody"),[{text:t("cancel"),style:"cancel"},{text:t("remove"),style:"destructive",onPress:()=>void perform(()=>forecastObservations.remove(owner,record.id,record.revision),"deleted")}]);}
 return <PicketScreen>
  <TopAppBar title={t("title")}/><HistoryButton label={t("back")} onPress={()=>router.back()}/>
  <Text style={{color:c.muted,lineHeight:22}}>{t("notice")}</Text><Text style={{color:c.muted,lineHeight:22}}>{t("privacy")}</Text>
  <HistoryButton label={t(shown?"hide":"show")} onPress={()=>{setShown(value=>!value);setDraft(null);}}/>
  <HistoryButton label={t("reload")} onPress={()=>void perform(()=>forecastObservations.load(owner))} disabled={busy}/>
  {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("error")}</Text>}
  {saved&&<Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t(saved)}</Text>}
  {doc?.cases.length===0&&<Text style={{color:c.muted}}>{t("empty")}</Text>}
  {doc&&[...doc.cases].reverse().slice(page*5,(page+1)*5).map(record=>{
   const result=(()=>{try{return evaluateCapturedForecast(record,clock);}catch{return null;}})();
   const unavailable=record.accountIds.some(id=>!accounts.some(account=>account.id===id));
   return <View key={record.id} style={{gap:10,padding:14,borderWidth:1,borderColor:c.border,borderRadius:12,marginVertical:10}}>
    <Text accessibilityRole="header" style={{color:c.text,fontWeight:"700"}}>{t("case",{day:formatCalendarDate(record.input.startDay,language),days:record.input.days,currency:record.input.currency})}</Text>
    <Text style={{color:c.muted}}>{t("progress",{count:record.observations.length,total:record.input.days,closed:result?.closedDays??0})}</Text>
    <HistoryButton label={t(expanded===record.id?"close":"details")} onPress={()=>{setExpanded(expanded===record.id?null:record.id);setDraft(null);}}/>
    {expanded===record.id&&<>
     <Text style={{color:c.muted}}>{t("source",{time:formatInstant(record.sourceAsOf,language,"UTC")})}</Text>
     <Text style={{color:c.muted}}>{t("scope",{wallets:record.accountIds.map(id=>accounts.find(account=>account.id===id)?.name??t("walletMissing")).join(", ")})}</Text>
     <Text style={{color:c.text}}>{t("opening",{amount:money(record.input.openingBalance,record.input.currency)})}</Text>
     {unavailable&&<Text style={{color:c.expense}}>{t("unavailable")}</Text>}
     {result?.metrics&&shown?<><Text style={{color:c.text}}>{t("metrics",{amount:new Intl.NumberFormat(localeFor(language),{maximumFractionDigits:2}).format(result.metrics.mae)+" "+t("minorUnits",{currency:record.input.currency})})}</Text><Text style={{color:c.muted}}>{t("alerts",{missed:result.metrics.missedLowBalanceDays,false:result.metrics.falseLowBalanceDays})}</Text></>:<Text style={{color:c.muted}}>{t(result?.metrics?"showForMetrics":"waiting")}</Text>}
     {record.baseline.map(row=>{
      const observed=record.observations.find(item=>item.day===row.day),closed=observationDay(row.day)+86400000<=Date.parse(clock);
      return <View key={row.day} style={{gap:6,padding:10,borderWidth:1,borderColor:c.border}}>
       <Text style={{color:c.text}}>{formatCalendarDate(row.day,language)} (UTC)</Text><Text style={{color:c.text}}>{t("predicted",{amount:money(row.balance,record.input.currency)})}</Text>
       <Text style={{color:c.muted}}>{observed?t("observed",{amount:money(observed.balance,record.input.currency)}):t("missing")}</Text>
       {!closed&&<Text style={{color:c.muted}}>{t("notClosed")}</Text>}
       <HistoryButton label={t(observed?"correct":"record",{day:formatCalendarDate(row.day,language)})} disabled={busy||!closed||!shown||unavailable} onPress={()=>{setDraft({id:record.id,revision:record.revision,day:row.day,balance:observed?String(observed.balance):"",confirmed:false});setSaved(null);}}/>
      </View>;
     })}
     {draft?.id===record.id&&<View style={{gap:10,padding:12}}>
      <Text style={{color:c.text,fontWeight:"700"}}>{t("record",{day:formatCalendarDate(draft.day,language)})}</Text><Text style={{color:c.muted}}>{cashflow("units")}</Text>
      <TextInput accessibilityLabel={t("balance")} value={draft.balance} onChangeText={balance=>setDraft(current=>current?{...current,balance}:null)} keyboardType="numbers-and-punctuation" autoCorrect={false}/>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t("confirm")} accessibilityState={{checked:draft.confirmed,disabled:busy}} disabled={busy} onPress={()=>setDraft(current=>current?{...current,confirmed:!current.confirmed}:null)} style={{minHeight:48,padding:12}}><Text style={{color:c.text}}>{draft.confirmed?"☑":"☐"} {t("confirm")}</Text></Pressable>
      <HistoryButton label={t("save")} disabled={busy||!draft.confirmed||!draft.balance||!shown||unavailable} onPress={()=>void perform(current=>forecastObservations.observe(owner,draft.id,draft.revision,draft.day,parseScenarioMoney(draft.balance),current),"saved")}/>
      <HistoryButton label={t("cancel")} disabled={busy} onPress={()=>setDraft(null)}/>
     </View>}
     {record.changes.length>0&&<><Text style={{color:c.muted}}>{t("changes",{count:record.changes.length})}</Text>{record.changes.slice(-10).map((change,index)=><Text key={`${change.day}-${index}`} style={{color:c.muted}}>{t("old",{day:formatCalendarDate(change.day,language),amount:money(change.balance,record.input.currency),time:formatInstant(change.replacedAt,language,"UTC")})}</Text>)}</>}
    </>}
    <HistoryButton label={t("delete")} disabled={busy} onPress={()=>remove(record)}/>
   </View>;
  })}
  {doc&&doc.cases.length>5&&<><HistoryButton label={t("previous")} disabled={busy||page===0} onPress={()=>{setPage(value=>value-1);setExpanded(null);setDraft(null);}}/><HistoryButton label={t("next")} disabled={busy||(page+1)*5>=doc.cases.length} onPress={()=>{setPage(value=>value+1);setExpanded(null);setDraft(null);}}/></>}
  {doc&&doc.cases.length>0&&<HistoryButton label={t("clear")} disabled={busy} onPress={()=>Alert.alert(t("clearTitle",{count:doc.cases.length}),t("deleteBody"),[{text:t("cancel"),style:"cancel"},{text:t("remove"),style:"destructive",onPress:()=>void perform(()=>forecastObservations.clear(owner,doc.revision),"deleted")}])}/>}
 </PicketScreen>;
}
