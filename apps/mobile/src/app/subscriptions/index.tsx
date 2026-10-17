import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, EmptyState, IconButton, PicketScreen, SectionTitle, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { partitionSubscriptions } from "@/features/subscriptions/subscription-list";

const cadence = { weekly: "Hàng tuần", monthly: "Hàng tháng", quarterly: "Hàng quý", yearly: "Hàng năm", custom: "Tùy chỉnh" } as const;
export default function SubscriptionsScreen() {
  const { session, localMode } = useAuth(); const { subscriptions, loading, error, refresh } = useSubscriptions();
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const { active, paused } = partitionSubscriptions(subscriptions);
  const renderSubscription = (item: (typeof subscriptions)[number]) => <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push(routes.subscription(item.id))}><Surface style={styles.card}><View style={styles.icon}><AppIcon name="repeat" size={22} /></View><View style={styles.copy}><Text style={styles.name}>{item.title}</Text><Text style={styles.meta}>{cadence[item.cadence]} · {new Date(item.nextDueAt).toLocaleDateString("vi-VN")}</Text></View><Text style={styles.amount}>{formatVnd(item.amount)}</Text></Surface></Pressable>;
  return <PicketScreen>
    <TopAppBar title="Chi phí định kỳ" subtitle="Theo dõi các khoản thanh toán lặp lại." action={<IconButton icon="plus" label="Thêm chi phí định kỳ" onPress={() => router.push(routes.newSubscription)} />} />
    {error ? <ConnectionNotice hasData={subscriptions.length > 0} onRetry={() => void refresh()} /> : null}{loading ? <ActivityIndicator accessibilityLabel="Đang tải chi phí định kỳ" color={colors.mauve} /> : null}
    {!loading && active.length === 0 && paused.length === 0 ? <EmptyState action="Thêm khoản đầu tiên" description="Netflix, Internet, tiền thuê nhà hoặc bất kỳ chi phí lặp lại nào." onAction={() => router.push(routes.newSubscription)} symbol="↻" title="Chưa có chi phí định kỳ" /> : null}
    {active.length ? <><SectionTitle action="Làm mới" onAction={() => void refresh()} title="Sắp thanh toán" /><View style={styles.stack}>{active.map(renderSubscription)}</View></> : null}
    {paused.length ? <><SectionTitle title="Đã tạm dừng" /><View style={styles.stack}>{paused.map(renderSubscription)}</View></> : null}
  </PicketScreen>;
}
const styles=StyleSheet.create({appBar:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",minHeight:52},action:{color:colors.mauve,fontSize:15,fontWeight:"800"},heading:{color:colors.ink,fontSize:29,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:10,marginTop:7},error:{color:colors.expense,fontSize:13,marginVertical:10},stack:{gap:10},card:{alignItems:"center",flexDirection:"row",gap:12,padding:15},icon:{alignItems:"center",backgroundColor:colors.peach,borderRadius:18,height:42,justifyContent:"center",width:42},iconText:{color:colors.mauve,fontSize:22,fontWeight:"800"},copy:{flex:1},name:{color:colors.ink,fontSize:15,fontWeight:"800"},meta:{color:colors.muted,fontSize:12,marginTop:4},amount:{color:colors.ink,fontSize:14,fontWeight:"800"}});
