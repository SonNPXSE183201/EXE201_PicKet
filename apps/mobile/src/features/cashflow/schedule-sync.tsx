import { useEffect } from "react";
import { AppState } from "react-native";
import type { CashflowSchedule } from "@picket/domain";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { cashflowSchedules } from "./schedule-storage";

export async function syncCashflowSchedules(session:{user:{id:string};access_token:string},signal?:AbortSignal){
  const api=picketApi;
  if(!api)throw new Error("Schedule service unavailable");
  return cashflowSchedules.sync(session.user.id,
    ()=>api.cashflowSchedules(session.access_token,signal),
    operation=>operation.action==="save"?
      api.saveCashflowSchedule(session.access_token,operation.expectedRevision,operation.schedule as CashflowSchedule,operation.key,signal):
      api.removeCashflowSchedule(session.access_token,operation.expectedRevision,operation.schedule.id,operation.key,signal),
    ()=>!signal?.aborted);
}
export function ScheduleSync(){
  const {session,localMode}=useAuth();
  useEffect(()=>{
    if(!session||localMode||process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED!=="true")return;
    const controller=new AbortController();
    const sync=()=>{if(!controller.signal.aborted)void syncCashflowSchedules(session,controller.signal).catch(()=>undefined);};
    sync();
    const listener=AppState.addEventListener("change",state=>{if(state==="active")sync();});
    const timer=setInterval(()=>{if(AppState.currentState==="active")sync();},60000);
    return()=>{controller.abort();listener.remove();clearInterval(timer);};
  },[session,localMode]);
  return null;
}
