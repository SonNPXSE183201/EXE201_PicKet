import { TopAppBar , ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors, radii } from "@picket/design-tokens";
import type { SubscriptionCadence } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, Text, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const cadences:{value:SubscriptionCadence;label:string;months:number}[]=[{value:"weekly",label:"Tuần",months:1},{value:"monthly",label:"Tháng",months:1},{value:"quarterly",label:"Quý",months:3},{value:"yearly",label:"Năm",months:12}];
function defaultDueDate(){const date=new Date();date.setDate(date.getDate()+7);return date.toISOString().slice(0,10);}
export default function NewSubscriptionScreen(){
  const {session,localMode}=useAuth(); const {accounts}=useAccounts(); const {categories}=useTransactions(); const {create}=useSubscriptions(); const expenseCategories=categories.filter((item)=>item.kind!=="income");
  const [title,setTitle]=useState(""); const [amount,setAmount]=useState(""); const [cadence,setCadence]=useState<SubscriptionCadence>("monthly"); const [nextDueAt,setNextDueAt]=useState(defaultDueDate); const [walletId,setWalletId]=useState(accounts[0]?.id??""); const [categoryId,setCategoryId]=useState(expenseCategories[0]?.id??""); const [alertDays,setAlertDays]=useState("3"); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  if(!session&&!localMode)return <Redirect href={routes.login}/>;
  async function submit(){const parsed=Number.parseInt(amount,10);const alert=Number.parseInt(alertDays,10);const due=new Date(`${nextDueAt}T12:00:00`);if(!title.trim())return setMessage("Hãy nhập tên khoản định kỳ.");if(!/^\d+$/.test(amount)||parsed<=0)return setMessage("Số tiền phải lớn hơn 0.");if(Number.isNaN(due.getTime()))return setMessage("Ngày thanh toán không hợp lệ.");if(!/^\d+$/.test(alertDays)||alert>365)return setMessage("Số ngày cảnh báo từ 0 đến 365.");setBusy(true);setMessage(null);try{const cycle=cadences.find((item)=>item.value===cadence)?.months??1;await create({walletId:walletId||null,categoryId:categoryId||null,title:title.trim(),amount:parsed,cadence,nextDueAt:due.toISOString(),cycleMonths:cycle,note:note.trim(),alertDays:alert});router.replace(routes.subscriptions);}catch(caught){if(isOfflineQueuedError(caught)){router.replace(routes.subscriptions);return;}setMessage("Không tạo được khoản định kỳ.");}finally{setBusy(false);}}
  return <PicketScreen><TopAppBar title="Thêm chi phí định kỳ" subtitle="Thiết lập một lần để không quên những khoản lặp lại." backDisabled={busy} /><Surface>
    <FieldLabel>Tên khoản chi</FieldLabel><TextInput accessibilityLabel="Tên khoản chi định kỳ" onChangeText={setTitle} placeholder="Ví dụ: Internet" placeholderTextColor={colors.muted} style={styles.input} value={title}/><FieldLabel>Số tiền</FieldLabel><TextInput money accessibilityLabel="Số tiền định kỳ" keyboardType="number-pad" onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.muted} style={styles.input} value={amount}/>
    <FieldLabel>Chu kỳ</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{cadences.map((item)=><ChoiceChip checked={cadence===item.value} key={item.value} label={item.label} onPress={()=>setCadence(item.value)}/>)}</View><FieldLabel>Ngày tiếp theo</FieldLabel><TextInput accessibilityLabel="Ngày thanh toán tiếp theo" onChangeText={setNextDueAt} style={styles.input} value={nextDueAt}/>
    <FieldLabel>Tài khoản</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{accounts.map((item)=><ChoiceChip checked={walletId===item.id} key={item.id} label={item.name} onPress={()=>setWalletId(item.id)}/>)}</View><FieldLabel>Danh mục</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{expenseCategories.map((item)=><ChoiceChip checked={categoryId===item.id} key={item.id} label={item.name} onPress={()=>setCategoryId(item.id)}/>)}</View>
    <FieldLabel>Cảnh báo trước (ngày)</FieldLabel><TextInput accessibilityLabel="Số ngày cảnh báo trước" keyboardType="number-pad" onChangeText={setAlertDays} style={styles.input} value={alertDays}/><FieldLabel>Ghi chú</FieldLabel><TextInput accessibilityLabel="Ghi chú chi phí định kỳ" multiline onChangeText={setNote} placeholder="Không bắt buộc" placeholderTextColor={colors.muted} style={[styles.input,styles.note]} value={note}/>{message?<Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>:null}<PrimaryAction busy={busy} label="Tạo khoản định kỳ" onPress={()=>void submit()}/>
  </Surface></PicketScreen>;
}
const styles=StyleSheet.create({appBar:{justifyContent:"center",minHeight:52},back:{color:colors.mauve,fontSize:15,fontWeight:"800"},heading:{color:colors.ink,fontSize:29,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:22,marginTop:7},input:{borderColor:colors.peach,borderRadius:radii.medium,borderWidth:1,color:colors.ink,fontSize:16,minHeight:54,paddingHorizontal:16},choices:{flexDirection:"row",flexWrap:"wrap",gap:9},note:{minHeight:82,paddingTop:14,textAlignVertical:"top"},error:{color:colors.expense,fontSize:13,fontWeight:"700",marginTop:14}});
