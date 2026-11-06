import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/features/settings/appearance-provider";
import type { LearningProgress } from "./progress";
import type { PracticeEvent } from "./practice";
import { weeklyPractice } from "./progress-storage";
import { learningMilestones } from "./milestones";

export function LearningAchievements({owner,progress}:{owner:string;progress:LearningProgress}){
  const {colors:c}=useAppTheme();
  const {t}=useTranslation("learning");
  const [events,setEvents]=useState<PracticeEvent[]>([]);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let active=true;
    const refresh=()=>{void weeklyPractice.load(owner).then(value=>{if(active){setEvents(value);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});};
    refresh();const stop=weeklyPractice.subscribe(owner,refresh);
    return()=>{active=false;stop();};
  },[owner]);
  const {xp,badges}=learningMilestones(owner,progress.completed,events);
  return <View style={{gap:10}}>
    <Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:"700"}}>{t("achievements")}</Text>
    <Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t("learningXp",{count:xp})}</Text>
    <Text style={{color:c.muted}}>{t("xpNotice")}</Text>
    <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{badges.map(id=><View key={id} style={{padding:12,borderRadius:paperShape.card,backgroundColor:c.elevated}}><Text style={{color:c.text}}>{t(id)}</Text></View>)}</View>
    {failed&&<Text accessibilityRole="alert" style={{color:c.expense}}>{t("storageError")}</Text>}
  </View>;
}
