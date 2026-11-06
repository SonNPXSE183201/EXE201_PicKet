import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { initialPaymentDueDate } from "@/core/forms/payment-form";
import { parseSubscriptionForm, subscriptionFormCadences as cadences } from "@/features/subscriptions/subscription-form";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import type { SubscriptionCadence } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function NewSubscriptionScreen(){
  const {t}=useTranslation("subscriptions");
  const { colors, styles } = useMobileStyles(createStyles);
  const {session,localMode}=useAuth(); const {accounts}=useAccounts(); const {categories}=useTransactions(); const {create}=useSubscriptions(); const expenseCategories=categories.filter((item)=>item.kind!=="income");
  const [title,setTitle]=useState(""); const [amount,setAmount]=useState(""); const [cadence,setCadence]=useState<SubscriptionCadence>("monthly"); const [nextDueAt,setNextDueAt]=useState(initialPaymentDueDate); const [walletId,setWalletId]=useState(accounts[0]?.id??""); const [categoryId,setCategoryId]=useState(expenseCategories[0]?.id??""); const [alertDays,setAlertDays]=useState("3"); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  if(!session&&!localMode)return <Redirect href={routes.login}/>;
  async function submit(){const parsed=parseSubscriptionForm({title,amount,nextDueDate:nextDueAt,cadence,alertDays,note,walletId,categoryId});if("error" in parsed)return setMessage(parsed.error);setBusy(true);setMessage(null);try{await create(parsed.value);router.replace(routes.subscriptions);}catch(caught){if(isOfflineQueuedError(caught)){router.replace(routes.subscriptions);return;}setMessage("createFailed");}finally{setBusy(false);}}
  return <PicketScreen><TopAppBar illustration="home" title={t("add")} subtitle={t("createSubtitle")} backDisabled={busy} /><Surface>
    <FieldLabel>{t("name")}</FieldLabel><TextInput accessibilityLabel={t("nameLabel")} maxLength={160} onChangeText={setTitle} placeholder={t("namePlaceholder")} placeholderTextColor={colors.muted} style={styles.input} value={title}/><FieldLabel>{t("amount")}</FieldLabel><TextInput money accessibilityLabel={t("amountLabel")} keyboardType="number-pad" onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.muted} style={styles.input} value={amount}/>
    <FieldLabel>{t("cadence")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{cadences.map((item)=><ChoiceChip checked={cadence===item} key={item} label={t(item)} onPress={()=>setCadence(item)}/>)}</View><FieldLabel>{t("nextDate")}</FieldLabel><TextInput date accessibilityLabel={t("nextDateLabel")} onChangeText={setNextDueAt} style={styles.input} value={nextDueAt}/>
    <FieldLabel>{t("wallet")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{accounts.map((item)=><ChoiceChip checked={walletId===item.id} key={item.id} label={item.name} onPress={()=>setWalletId(item.id)}/>)}</View><FieldLabel>{t("category")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{expenseCategories.map((item)=><ChoiceChip checked={categoryId===item.id} key={item.id} label={item.name} onPress={()=>setCategoryId(item.id)}/>)}</View>
    <FieldLabel>{t("alertDays")}</FieldLabel><TextInput accessibilityLabel={t("alertDaysLabel")} keyboardType="number-pad" onChangeText={setAlertDays} style={styles.input} value={alertDays}/><FieldLabel>{t("note")}</FieldLabel><TextInput accessibilityLabel={t("noteLabel")} maxLength={2000} multiline onChangeText={setNote} placeholder={t("optional")} placeholderTextColor={colors.muted} style={[styles.input,styles.note]} value={note}/>{message?<Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{t(message)}</Text>:null}<PrimaryAction busy={busy} label={t("create")} onPress={()=>void submit()}/>
  </Surface></PicketScreen>;
}
const createStyles = (colors: MobileThemeColors) => StyleSheet.create({appBar:{justifyContent:"center",minHeight:52},back:{color:colors.link,fontSize:15,fontWeight:"700"},heading:{color:colors.ink,fontSize:26,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:22,marginTop:7},input:{borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,minHeight:paperControl.height,paddingHorizontal:16},choices:{flexDirection:"row",flexWrap:"wrap",gap:9},note:{minHeight:82,paddingTop:14,textAlignVertical:"top"},error:{color:colors.danger,fontSize:13,fontWeight:"700",marginTop:14}});
