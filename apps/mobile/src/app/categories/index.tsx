import { colors } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { EmptyState, IconButton, PicketScreen, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const kindLabels = { expense: "Khoản chi", income: "Khoản thu", both: "Thu và chi" } as const;

export default function CategoriesScreen() {
  const { session, localMode } = useAuth();
  const { categories } = useTransactions();
  if (!session && !localMode) return <Redirect href={routes.login} />;
  return <PicketScreen>
    <TopAppBar title="Danh mục" subtitle="Phân loại các khoản thu và chi theo cách của bạn." action={<IconButton icon="plus" label="Thêm danh mục" onPress={() => router.push(routes.newCategory)} />} />
    {categories.length === 0 ? <EmptyState action="Tạo danh mục" description="Thêm danh mục đầu tiên để phân loại giao dịch." onAction={() => router.push(routes.newCategory)} symbol="◌" title="Chưa có danh mục" /> : <Surface style={styles.list}>{categories.map((category,index)=><Pressable accessibilityHint={category.custom?"Mở để chỉnh sửa":"Danh mục mặc định không thể chỉnh sửa"} accessibilityRole="button" disabled={!category.custom} key={category.id} onPress={()=>router.push(routes.category(category.id))} style={[styles.row,index>0&&styles.border]}><View style={[styles.dot,{backgroundColor:category.color??colors.mauve}]} /><View style={styles.copy}><Text style={styles.name}>{category.name}</Text><Text style={styles.hint}>{kindLabels[category.kind]} · {category.custom?"Tùy chỉnh":"Mặc định"}</Text></View>{category.custom?<Text style={styles.chevron}>›</Text>:<Text style={styles.lock}>●</Text>}</Pressable>)}</Surface>}
  </PicketScreen>;
}

const styles=StyleSheet.create({appBar:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",minHeight:52},link:{color:colors.mauve,fontSize:15,fontWeight:"800"},heading:{color:colors.ink,fontSize:29,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:22,marginTop:7},list:{padding:8},row:{alignItems:"center",flexDirection:"row",gap:13,minHeight:68,paddingHorizontal:10},border:{borderTopColor:colors.line,borderTopWidth:1},dot:{borderRadius:10,height:20,width:20},copy:{flex:1},name:{color:colors.ink,fontSize:16,fontWeight:"800"},hint:{color:colors.muted,fontSize:12,marginTop:4},chevron:{color:colors.mauve,fontSize:26},lock:{color:colors.peach,fontSize:10}});
