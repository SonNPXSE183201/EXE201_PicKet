import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useState } from "react";
import { View } from "react-native";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { classifyNeedWant, needWantScenarios, type NeedWantChoice } from "./practice";

export function NeedsWantsPractice() {
  const { colors: c, language } = useAppTheme();
  const en = language === "en";
  const [choices, setChoices] = useState<Record<string,NeedWantChoice>>({});
  const labels = { need: en ? "Need" : "Nhu cầu", want: en ? "Want" : "Mong muốn", depends: en ? "Depends on context" : "Tùy ngữ cảnh" };
  return <View style={{gap:16}}>
    <Text accessibilityRole="header" style={{color:c.text,fontSize:22,fontWeight:"700"}}>{en ? "Needs and wants" : "Nhu cầu và mong muốn"}</Text>
    <Text style={{color:c.muted}}>{en ? "Tap a choice. There is no timer, and no spending is required." : "Chạm để chọn. Không giới hạn thời gian và không yêu cầu chi tiền."}</Text>
    {needWantScenarios.map(scenario => {
      const selected = choices[scenario.id];
      const feedback = selected ? classifyNeedWant(scenario.id,selected) : null;
      return <View key={scenario.id} style={{gap:10,padding:16,backgroundColor:c.surface,borderRadius:paperShape.card}}>
        <Text style={{color:c.text}}>{en ? scenario.en : scenario.vi}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={en ? scenario.en : scenario.vi} style={{gap:8}}>
          {(["need","want","depends"] as const).map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{checked:selected===choice}} onPress={()=>setChoices(previous=>({...previous,[scenario.id]:choice}))} style={{minHeight:48,padding:14,borderRadius:paperShape.button,borderWidth:1,borderColor:selected===choice ? c.primary : c.border}}><Text style={{color:c.text}}>{labels[choice]}</Text></Pressable>)}
        </View>
        {feedback && <Text accessibilityLiveRegion="polite" style={{color:c.text}}>{feedback.accepted ? (en ? "Reasonable for this scenario. " : "Phù hợp với dữ kiện này. ") : (en ? "Consider the context again. " : "Hãy xem lại ngữ cảnh. ")}{en ? feedback.whyEn : feedback.whyVi}</Text>}
      </View>;
    })}
  </View>;
}
