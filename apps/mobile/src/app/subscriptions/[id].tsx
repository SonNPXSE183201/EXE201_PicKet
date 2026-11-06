import { PicketText as Text } from "@/core/ui/picket-text";
import { formatMoney, localeFor, normalizeLanguage } from "@/core/i18n/formatters";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , DangerAction, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";

export default function SubscriptionDetailScreen(){
  const {t,i18n}=useTranslation("subscriptions");
  const language=normalizeLanguage(i18n.resolvedLanguage??i18n.language);
  const { styles } = useMobileStyles(createStyles);
  const {id}=useLocalSearchParams<{id:string}>();const {session,localMode}=useAuth();const {subscriptions,update,archive}=useSubscriptions();const item=subscriptions.find((entry)=>entry.id===id);const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null);
  if(!session&&!localMode)return <Redirect href={routes.login}/>;if(!item)return <Redirect href={routes.subscriptions}/>;const selected=item;
  async function toggle(){setBusy(true);setMessage(null);try{await update(selected.id,{expectedVersion:selected.version,active:!selected.active});router.replace(routes.subscriptions);}catch(caught){if(isOfflineQueuedError(caught)){router.replace(routes.subscriptions);return;}setMessage("updateFailed");}finally{setBusy(false);}}
  function confirmArchive(){Alert.alert(t("archiveTitle"),t("archiveDescription"),[{text:t("cancel"),style:"cancel"},{text:t("confirmArchive"),style:"destructive",onPress:()=>{setBusy(true);void archive(selected.id,selected.version).then(()=>router.replace(routes.subscriptions)).catch((caught:unknown)=>{if(isOfflineQueuedError(caught)){router.replace(routes.subscriptions);return;}setMessage("archiveFailed");setBusy(false);});}}]);}
  return <PicketScreen><TopAppBar illustration="home" title={selected.title} subtitle={t("detailSubtitle")} /><Surface peach><Text style={styles.amount}>{formatMoney(selected.amount,language,"VND")}</Text><Text style={styles.meta}>{t("nextPayment",{date:new Date(selected.nextDueAt).toLocaleDateString(localeFor(language))})}</Text><Text style={styles.meta}>{t("reminder",{count:selected.alertDays})}</Text></Surface><Surface style={styles.actions}>{message?<Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{t(message)}</Text>:null}<PrimaryAction busy={busy} label={t(selected.active?"pause":"reactivate")} onPress={()=>void toggle()}/><DangerAction disabled={busy} label={t("archive")} onPress={confirmArchive}/></Surface></PicketScreen>;
}
const createStyles = (colors: MobileThemeColors) => StyleSheet.create({appBar:{justifyContent:"center",minHeight:52},back:{color:colors.link,fontSize:15,fontWeight:"700"},heading:{color:colors.ink,fontSize:26,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,marginBottom:22,marginTop:7},amount:{color:colors.ink,fontSize:28,fontWeight:"800"},meta:{color:colors.muted,fontSize:14,marginTop:8},actions:{marginTop:14},error:{color:colors.danger,fontSize:13,fontWeight:"700"}});
