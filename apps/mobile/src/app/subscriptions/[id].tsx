import { TopAppBar , DangerAction, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";

export default function SubscriptionDetailScreen(){
  const {id}=useLocalSearchParams<{id:string}>();const {session,localMode}=useAuth();const {subscriptions,update,archive}=useSubscriptions();const item=subscriptions.find((entry)=>entry.id===id);const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null);
  if(!session&&!localMode)return <Redirect href={routes.login}/>;if(!item)return <Redirect href={routes.subscriptions}/>;const selected=item;
  async function toggle(){setBusy(true);setMessage(null);try{await update(selected.id,{expectedVersion:selected.version,active:!selected.active});router.replace(routes.subscriptions);}catch(caught){if(isOfflineQueuedError(caught)){router.replace(routes.subscriptions);return;}setMessage("Không cập nhật được trạng thái.");}finally{setBusy(false);}}
  function confirmArchive(){Alert.alert("Lưu trữ khoản định kỳ?","Khoản này sẽ không còn xuất hiện trong danh sách.",[{text:"Hủy",style:"cancel"},{text:"Lưu trữ",style:"destructive",onPress:()=>{setBusy(true);void archive(selected.id,selected.version).then(()=>router.replace(routes.subscriptions)).catch((caught:unknown)=>{if(isOfflineQueuedError(caught)){router.replace(routes.subscriptions);return;}setMessage("Không lưu trữ được khoản định kỳ.");setBusy(false);});}}]);}
  return <PicketScreen><TopAppBar title={selected.title} subtitle="Chi tiết khoản thanh toán định kỳ" /><Surface peach><Text style={styles.amount}>{formatVnd(selected.amount)}</Text><Text style={styles.meta}>Kỳ tiếp theo: {new Date(selected.nextDueAt).toLocaleDateString("vi-VN")}</Text><Text style={styles.meta}>Cảnh báo trước {selected.alertDays} ngày</Text></Surface><Surface style={styles.actions}>{message?<Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>:null}<PrimaryAction busy={busy} label={selected.active?"Tạm dừng":"Kích hoạt lại"} onPress={()=>void toggle()}/><DangerAction disabled={busy} label="Lưu trữ khoản định kỳ" onPress={confirmArchive}/></Surface></PicketScreen>;
}
const styles=StyleSheet.create({appBar:{justifyContent:"center",minHeight:52},back:{color:colors.mauve,fontSize:15,fontWeight:"800"},heading:{color:colors.ink,fontSize:29,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,marginBottom:22,marginTop:7},amount:{color:colors.ink,fontSize:28,fontWeight:"800"},meta:{color:colors.muted,fontSize:14,marginTop:8},actions:{marginTop:14},error:{color:colors.expense,fontSize:13,fontWeight:"700"}});
