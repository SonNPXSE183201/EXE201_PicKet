import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { formatCalendarDate } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { weekStartForDay, type PracticeEvent } from "./practice";
import { weeklyPractice } from "./progress-storage";

export function WeeklyPractice({owner}:{owner:string}) {
  const {colors:c,language}=useAppTheme();
  const {t}=useTranslation("learning");
  const currentWeek=()=>{
    const date=new Date();
    return weekStartForDay(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`);
  };
  const [week,setWeek]=useState(currentWeek);
  useEffect(()=>{
    const refresh=()=>setWeek(currentWeek());
    const subscription=AppState.addEventListener("change",state=>{if(state==="active")refresh();});
    const timer=setInterval(refresh,60000);
    return()=>{subscription.remove();clearInterval(timer);};
  },[]);
  const [events,setEvents]=useState<PracticeEvent[]|null>(null);
  const [error,setError]=useState(false);
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    const refresh=()=>{void weeklyPractice.load(owner).then(value=>{if(active){setEvents(value);setError(false);}}).catch(()=>{if(active)setError(true);});};
    refresh();
    const stop=weeklyPractice.subscribe(owner,refresh);
    return ()=>{active=false;stop();};
  },[owner,revision]);
  const current=events?.find(row=>row.weekStart===week);
  async function record(skipped:boolean) {
    setBusy(true);
    try{setEvents(await weeklyPractice.record(owner,week,skipped));}catch{setError(true);}finally{setBusy(false);}
  }
  const disabled=events===null||error||busy||current?.skipped===false;
  return <View style={{backgroundColor:c.surface,borderRadius:paperShape.card,padding:18,gap:12}}>
    <Text accessibilityRole="header" style={{color:c.text,fontSize:22,fontWeight:"700"}}>{t("weeklyTitle")}</Text>
    <Text style={{color:c.muted}}>{t("weekOf",{date:formatCalendarDate(week,language)})}</Text>
    <Text style={{color:c.text}}>{t("weeklyTask")}</Text>
    <Text style={{color:c.muted}}>{t("optionalPractice")}</Text>
    <Text accessibilityLiveRegion="polite" style={{color:error?c.expense:c.text}}>{error?t("storageError"):current ? current.skipped ? t("weeklySkipped") : t("weeklyComplete") : ""}</Text>
    {error && <Pressable onPress={()=>setRevision(value=>value+1)}><Text style={{color:c.link}}>{t("Thử lại",{ns:"common"})}</Text></Pressable>}
    <Pressable disabled={disabled} accessibilityState={{disabled}} onPress={()=>void record(false)} style={{padding:14,backgroundColor:c.elevated,borderRadius:paperShape.button}}><Text style={{color:c.text}}>{t("weeklySave")}</Text></Pressable>
    <Pressable disabled={disabled} accessibilityState={{disabled}} onPress={()=>void record(true)}><Text style={{color:c.link}}>{t("weeklySkip")}</Text></Pressable>
  </View>;
}
