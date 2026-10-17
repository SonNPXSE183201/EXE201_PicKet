import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, ChoiceChip, EmptyState, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { runBulkAction } from "@/features/transactions/bulk-action";

export default function BulkTransactionsScreen() {
  const { session, localMode } = useAuth();
  const { archive, categories, transactions, update } = useTransactions();
  const [selected, setSelected] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  const eligible = transactions.filter((item) => item.kind === "income" || item.kind === "expense");
  const chosen = eligible.filter((item) => selected.includes(item.id));
  const availableCategories = categories.filter((category) => chosen.every((item) => category.kind === "both" || category.kind === item.kind));
  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  async function perform(action: "category" | "archive") {
    if (busy || chosen.length === 0 || (action === "category" && categoryId === null)) return;
    setBusy(true);
    setMessage(null);
    const byId = new Map(chosen.map((item) => [item.id, item]));
    const result = await runBulkAction(chosen.map((item) => item.id), async (id) => {
      const item = byId.get(id)!;
      if (action === "category") await update(item.id, { expectedVersion: item.version, categoryId });
      else await archive(item.id, item.version);
    });
    const acceptedIds = new Set([...result.completedIds, ...result.queuedIds]);
    setSelected((current) => current.filter((id) => !acceptedIds.has(id)));
    setMessage(`${result.completedIds.length}/${chosen.length} giao dịch đã xử lý. ${result.queuedIds.length > 0 ? `${result.queuedIds.length} giao dịch đã lưu trên máy, chờ đồng bộ. ` : ""}${result.failedIds.length > 0 ? `${result.failedIds.length} mục chưa thành công và vẫn được chọn; hãy kiểm tra rồi thử lại.` : ""}`);
    setBusy(false);
  }
  function confirmArchive() {
    if (chosen.length === 0) return;
    Alert.alert("Lưu trữ giao dịch?", `${chosen.length} giao dịch đã chọn sẽ không còn trong danh sách đang hoạt động.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Lưu trữ", style: "destructive", onPress: () => void perform("archive") },
    ]);
  }
  return <PicketScreen>
    <TopAppBar title="Sửa nhiều giao dịch" />
    <Text style={styles.subtitle}>Chọn các khoản thu/chi để đổi danh mục hoặc lưu trữ. Mỗi mục được xử lý riêng; mục lỗi sẽ còn được chọn.</Text>
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    <Text style={styles.label}>Đã chọn {chosen.length}</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" onPress={() => setSelected(eligible.map((item) => item.id))}><Text style={styles.link}>Chọn tất cả</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setSelected([])}><Text style={styles.link}>Bỏ chọn</Text></Pressable>
    </View>
    {eligible.length === 0 ? <EmptyState title="Chưa có giao dịch" description="Tạo khoản thu hoặc chi trước khi chỉnh sửa hàng loạt." /> :
      <Surface style={styles.list}>{eligible.map((item) => <Pressable accessibilityLabel={`${selected.includes(item.id) ? "Bỏ chọn" : "Chọn"} ${item.title}, ${formatVnd(item.amount)}`} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(item.id), disabled: busy }} disabled={busy} key={item.id} onPress={() => toggle(item.id)} style={styles.row}><Text style={styles.check}>{selected.includes(item.id) ? "☑" : "□"}</Text><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.meta}>{new Date(item.occurredAt).toLocaleDateString("vi-VN")}</Text></View><Text style={styles.amount}>{formatVnd(item.amount)}</Text></Pressable>)}</Surface>}
    <Text style={styles.label}>Danh mục mới</Text>
    <View style={styles.chips}>{availableCategories.map((item) => <ChoiceChip checked={categoryId === item.id} key={item.id} label={item.name} onPress={() => setCategoryId(item.id)} />)}</View>
    <PrimaryAction busy={busy} disabled={chosen.length === 0 || categoryId === null || !availableCategories.some((item) => item.id === categoryId)} label="Đổi danh mục đã chọn" onPress={() => void perform("category")} />
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || chosen.length === 0 }} disabled={busy || chosen.length === 0} onPress={confirmArchive} style={styles.archive}><Text style={styles.archiveText}>Lưu trữ đã chọn</Text></Pressable>
  </PicketScreen>;
}

const styles = StyleSheet.create({
  back:{color:colors.mauve,fontSize:15,fontWeight:"800",marginBottom:18},heading:{color:colors.ink,fontSize:29,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:16,marginTop:7},warning:{color:colors.expense,fontSize:13,lineHeight:20,marginBottom:14},message:{color:colors.ink,fontSize:14,lineHeight:21,marginBottom:10},label:{color:colors.ink,fontSize:15,fontWeight:"800",marginBottom:10,marginTop:20},actions:{flexDirection:"row",gap:24,marginBottom:12},link:{color:colors.mauve,fontWeight:"800"},list:{paddingVertical:4},row:{alignItems:"center",borderBottomColor:colors.line,borderBottomWidth:1,flexDirection:"row",minHeight:68},check:{color:colors.mauve,fontSize:24,width:38},copy:{flex:1},title:{color:colors.ink,fontSize:15,fontWeight:"700"},meta:{color:colors.muted,fontSize:12,marginTop:3},amount:{color:colors.ink,fontSize:13,fontWeight:"800"},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},archive:{alignItems:"center",borderColor:colors.expense,borderRadius:12,borderWidth:1,justifyContent:"center",marginTop:14,minHeight:50},archiveText:{color:colors.expense,fontWeight:"800"},
});
