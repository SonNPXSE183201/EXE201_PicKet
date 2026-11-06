import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { Redirect,router } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { LedgerFactsCard } from "@/features/cashflow/ledger-card";
const noChange=()=>undefined;
export default function WeeklyStoryPreview(){
 const {session,localMode}=useAuth(),{colors:c,theme}=useAppTheme(),{t}=useTranslation("cashflow");
 const [currency,setCurrency]=useState("VND");
 if(!__DEV__||!session||localMode||process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED!=="true")return <Redirect href="/learning-preview"/>;
 return <SafeAreaView style={{flex:1,backgroundColor:c.canvas}}><ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:60}}>
  <Pressable accessibilityRole="button" onPress={()=>router.back()} style={{padding:12,minHeight:48}}><Text style={{color:c.link}}>{t("back")}</Text></Pressable>
  <Text accessibilityRole="header" style={{color:c.text,fontSize:26,fontWeight:"700"}}>{t("storyTitle")}</Text>
  <Text style={{color:c.muted,lineHeight:22}}>{t("storyNotice")}</Text>
  <Text style={{color:c.text}}>{t("currency")}</Text>
  <TextInput accessibilityLabel={t("currency")} value={currency} onChangeText={value=>setCurrency(value.toUpperCase())} autoCorrect={false} autoCapitalize="characters" keyboardAppearance={theme} style={{minHeight:48,padding:12,color:c.text,borderWidth:1,borderColor:c.border}}/>
  <LedgerFactsCard key={`${session.user.id}:${currency}`} storyOnly owner={session.user.id} currency={currency} schedules={[]} days={7} onInvalidate={noChange} onUse={noChange}/>
 </ScrollView></SafeAreaView>;
}
