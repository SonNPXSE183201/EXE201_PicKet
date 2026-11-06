import { PicketText as Text } from "@/core/ui/picket-text";
import {useAuth} from "@/features/auth/auth-context";
import {useEffect,useRef,useState} from "react";
import { AppState, View } from "react-native";
import {router} from "expo-router";
import {useTranslation} from "react-i18next";
import {AccessiblePressable as Pressable} from "@/core/ui/accessible-pressable";
import {listPendingMutations} from "@/core/sync/mutation-queue";
import {useAppTheme} from "@/features/settings/appearance-provider";
import {forecastObservations} from "./forecast-observation-storage";
import type {CaptureInput} from "./forecast-observations";
export function ForecastCaptureCard({owner,input,disabled=false}:{owner:string;input:CaptureInput;disabled?:boolean}){
 const {session,localMode}=useAuth();
 const {colors:c}=useAppTheme(),{t}=useTranslation("forecastObservations");
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[saved,setSaved]=useState(false);
 const scope=useRef({alive:true,active:true,epoch:0});
 useEffect(()=>{const run={alive:true,active:true,epoch:0};scope.current=run;const listener=AppState.addEventListener("change",state=>{run.epoch++;run.active=state==="active";});return()=>{run.alive=false;run.active=false;run.epoch++;listener.remove();};},[owner]);
 async function capture(){
  if(busy||disabled||localMode||session?.user.id!==owner)return;const run=scope.current,epoch=run.epoch,current=()=>run.active&&scope.current===run&&epoch===run.epoch;
  setBusy(true);setFailed(false);setSaved(false);
  try{
   const pending=await listPendingMutations(owner);if(pending.length||!current())throw new Error("Ledger changed");
   await forecastObservations.capture(owner,{...input,pendingCount:pending.length},current);if(current())setSaved(true);
  }catch{if(current())setFailed(true);}finally{if(run.alive&&scope.current===run)setBusy(false);}
 }
 if(!__DEV__||localMode||session?.user.id!==owner||process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED!=="true")return null;
 return <View style={{gap:10,padding:12,borderWidth:1,borderColor:c.border,borderRadius:12}}>
  <Text accessibilityRole="header" style={{color:c.text,fontWeight:"700"}}>{t("captureTitle")}</Text>
  <Text style={{color:c.muted,lineHeight:22}}>{t("captureNotice")}</Text>
  <Pressable accessibilityRole="button" accessibilityState={{disabled:busy||disabled,busy}} disabled={busy||disabled} onPress={()=>void capture()} style={{minHeight:48,padding:12}}><Text style={{color:c.link}}>{t("capture")}</Text></Pressable>
  <Pressable accessibilityRole="button" onPress={()=>router.push("/forecast-observations-preview")} style={{minHeight:48,padding:12}}><Text style={{color:c.link}}>{t("open")}</Text></Pressable>
  {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("error")}</Text>}
  {saved&&<Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t("captured")}</Text>}
 </View>;
}
