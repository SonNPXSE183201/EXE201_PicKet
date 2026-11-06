import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState, View } from "react-native";
import { useTranslation } from "react-i18next";
import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { createLearningAiSession, type LearningAiApi } from "./ai-session";
import * as Crypto from "expo-crypto";

export function LearningAiCard(){
  const {session,localMode}=useAuth();
  const {colors:c}=useAppTheme();
  const {t}=useTranslation("learningAi");
  if(!session||localMode||!picketApi)return <Text style={{color:c.muted}}>{t("signIn")}</Text>;
  return <AiSession key={session.user.id} api={picketApi} token={session.access_token}/>;
}

function AiSession({api,token}:{api:LearningAiApi;token:string}){
  const {colors:c,language}=useAppTheme();
  const {t}=useTranslation("learningAi");
  const [machine]=useState(()=>createLearningAiSession(api,token,()=>Crypto.randomUUID()));
  const state=useSyncExternalStore(machine.subscribe,machine.snapshot,machine.snapshot);
  const enabled=process.env.EXPO_PUBLIC_LEARNING_AI_ENABLED==="true";
  useEffect(()=>{machine.setAccessToken(token);},[machine,token]);
  useEffect(()=>{
    machine.start();
    void machine.load();
    return()=>machine.dispose();
  },[machine]);
  const pending=state.job&&(["queued","claimed","dispatched"].includes(state.job.status)||
    (state.job.status==="completed"&&state.job.statementIds.length===0));
  const completed=state.job?.status==="completed"&&state.job.statementIds.length>0;
  useEffect(()=>{
    if(!pending&&!completed)return;
    const poll=()=>{if(AppState.currentState==="active")void machine.poll();};
    poll();
    const timer=setInterval(poll,pending?2000:60000);
    const listener=AppState.addEventListener("change",value=>{if(value==="active")poll();});
    return()=>{clearInterval(timer);listener.remove();};
  },[machine,pending,completed]);
  function button(label:string,action:()=>void,disabled=false){
    return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={action} style={{minHeight:48,padding:14,borderRadius:paperShape.button,borderColor:c.border,borderWidth:1,backgroundColor:disabled?c.disabledSurface:c.surface}}><Text style={{color:disabled?c.disabledText:c.primary,fontWeight:"600"}}>{label}</Text></Pressable>;
  }
  return <View style={{gap:12,padding:16,borderWidth:1,borderColor:c.border,borderRadius:paperShape.card,backgroundColor:c.surface}}>
    <Text accessibilityRole="header" style={{fontSize:22,fontWeight:"700",color:c.text}}>{t("title")}</Text>
    <Text style={{color:c.text,lineHeight:24}}>{t("case")}</Text>
    <Text style={{color:c.muted,lineHeight:22}}>{t("consent")}</Text>
    <Text style={{color:c.muted,lineHeight:22}}>{t("retention")}</Text>
    <Text style={{color:c.muted,lineHeight:22}}>{t("limits")}</Text>
    {!enabled&&<Text style={{color:c.muted}}>{t("disabled")}</Text>}
    {state.consent&&<Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t(state.consent.accepted?"accepted":"declined")}</Text>}
    {!state.consent?.accepted&&button(t("accept"),()=>void machine.setConsent(true),state.busy||!state.consent||!enabled)}
    {state.consent?.accepted&&button(t("generate"),()=>void machine.generate(language),state.busy||!!pending||!enabled)}
    {state.busy&&<Text accessibilityLiveRegion="polite" style={{color:c.muted}}>{t("loading")}</Text>}
    {state.job&&<View accessibilityLiveRegion="polite" style={{gap:10}}><Text style={{color:c.text,fontWeight:"600"}}>{t(state.job.status)}</Text>{!state.error&&!state.busy&&state.job.statementIds.map(id=><Text key={id} style={{color:c.text,lineHeight:24}}>{t(id)}</Text>)}</View>}
    {state.error&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t(state.error)}</Text>}
    {(state.error||!state.consent)&&button(t("refresh"),()=>void machine.load(),state.busy)}
    {state.consent?.accepted!==false&&button(t("revoke"),()=>void machine.setConsent(false))}
    {button(t("clear"),()=>void machine.clearHistory())}
  </View>;
}
