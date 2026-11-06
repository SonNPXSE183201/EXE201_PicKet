import { PicketText as Text } from "@/core/ui/picket-text";
import { useEffect,useState } from "react";
import { AppState, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { formatCalendarDate,localeFor } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import type { LedgerSnapshot } from "./ledger-snapshot";
import { buildWeeklyStory } from "./weekly-story";
export function WeeklyStoryCard({snapshot,accounts,currency}:{snapshot:LedgerSnapshot;accounts:string[];currency:string}){
 const {colors:c,language}=useAppTheme(),{t}=useTranslation("cashflow");
 const [revealed,setRevealed]=useState(false),[page,setPage]=useState(0);
 useEffect(()=>{const listener=AppState.addEventListener("change",state=>{if(state!=="active")setRevealed(false);});return()=>listener.remove();},[]);
 let story:ReturnType<typeof buildWeeklyStory>|null=null;
 try{story=buildWeeklyStory(snapshot,accounts,currency);}catch{/* Abstain when facts cannot support the template. */}
 if(!story)return <Text accessibilityRole="alert" style={{color:c.expense}}>{t("ledgerError")}</Text>;
 const format=new Intl.NumberFormat(localeFor(language),{style:"currency",currency});
 const money=(amount:number)=>format.format(amount/10**(format.resolvedOptions().maximumFractionDigits??2));
 const button=(label:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={{padding:12,minHeight:48,backgroundColor:c.surface}}><Text style={{color:c.link}}>{label}</Text></Pressable>;
 return <View style={{gap:12}}>
  <Text accessibilityRole="header" style={{color:c.text,fontWeight:"700"}}>{t("storyTitle")}</Text>
  <Text style={{color:c.muted,lineHeight:22}}>{t("storyNotice")}</Text>
  {button(t(revealed?"storyHide":"storyReveal"),()=>setRevealed(value=>!value))}
  {revealed&&<>
   <Text style={{color:c.text}}>{t("storyPeriod",{from:formatCalendarDate(story.weekStart,language),through:formatCalendarDate(story.throughDay,language)})}</Text>
   <Text style={{color:c.text,lineHeight:24}}>{t("storyBody",{income:money(story.income),expenses:money(story.expenses),refunds:money(story.refunds),transfers:money(story.transferNet),net:money(story.net),count:story.transactionIds.length})}</Text>
   <Text style={{color:c.muted,lineHeight:22}}>{t(story.transactionIds.length?"storyNext":"storyEmpty")}</Text>
   <Text accessibilityRole="header" style={{color:c.text,fontWeight:"700"}}>{t("storySources")}</Text>
   {story.transactionIds.slice(page*20,(page+1)*20).map((id,index)=><View key={id}>{button(t("ledgerRecord",{count:page*20+index+1}),()=>router.push({pathname:"/transactions/[id]",params:{id}}))}</View>)}
   {story.transactionIds.length>20&&<>
    {button(t("settlementPrevious"),()=>setPage(value=>value-1),page===0)}
    {button(t("settlementNext"),()=>setPage(value=>value+1),(page+1)*20>=story.transactionIds.length)}
   </>}
  </>}
 </View>;
}
