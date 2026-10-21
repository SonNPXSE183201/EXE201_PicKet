import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { listMutationConflicts, removeMutationConflict, retryMutationConflict, subscribeToMutationQueue, type MutationConflict } from "@/core/sync/mutation-queue";
import { parseEditedConflictPayload } from "@/core/sync/conflict-resolution";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { TransactionMergeEditor } from "@/features/sync/transaction-merge-editor";

const labels: Record<string, string> = {
  "account.create": "Tạo tài khoản",
  "account.update": "Cập nhật tài khoản",
  "account.archive": "Lưu trữ tài khoản",
  "budget.create": "Tạo ngân sách",
  "budget.update": "Cập nhật ngân sách",
  "budget.archive": "Lưu trữ ngân sách",
  "category.create": "Tạo danh mục",
  "category.update": "Cập nhật danh mục",
  "category.archive": "Lưu trữ danh mục",
  "transaction.update": "Cập nhật giao dịch",
  "transaction.archive": "Lưu trữ giao dịch",
  "transaction.splits": "Chia giao dịch",
};

export default function SyncConflictsScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<MutationConflict[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session) return;
    let active = true;
    let revision = 0;
    const reload = () => {
      const request = ++revision;
      void listMutationConflicts(session.user.id)
        .then(conflicts => { if (active && request === revision) setItems(conflicts); })
        .catch(() => { if (active && request === revision) setMessage("Chưa tải được các bản sửa đang chờ. Hãy mở lại màn hình để thử lại."); })
        .finally(() => { if (active && request === revision) setLoading(false); });
    };
    const unsubscribe = subscribeToMutationQueue(reload);
    reload();
    return () => { active = false; unsubscribe(); };
  }, [session]);
  if (!session) return <Redirect href={routes.login} />;

  async function dismiss(id: string) {
    await removeMutationConflict(id, session!.user.id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function retry(item: MutationConflict) {
    try {
      const payload = parseEditedConflictPayload(
        drafts[item.id] ?? JSON.stringify(item.payload, null, 2),
      );
      await retryMutationConflict(item, payload);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setEditingId(null);
      setMessage("Đã đưa thay đổi trở lại hàng đợi. Picket sẽ thử đồng bộ lại.");
    } catch {
      setMessage("Payload phải là một JSON object hợp lệ. Hãy kiểm tra trước khi thử lại.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.replace(routes.home)}><Text style={styles.back}>‹ Trang chủ</Text></Pressable>
        <Text style={styles.title}>Xung đột đồng bộ</Text>
        <Text style={styles.subtitle}>Picket không tự ghi đè khi phiên bản trên máy chủ đã thay đổi. Hãy mở lại dữ liệu mới nhất và thực hiện thay đổi lần nữa nếu vẫn cần.</Text>
        {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
        {loading && <ActivityIndicator accessibilityLabel="Đang tải xung đột đồng bộ" color={colors.mauve} />}
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{labels[item.kind] ?? item.kind}</Text>
            <Text style={styles.meta}>{item.entityKey ?? "Thao tác tạo mới"} · {item.reason}</Text>
            <Text style={styles.meta}>{new Date(item.failedAt).toLocaleString("vi-VN")}</Text>
            <Pressable onPress={() => {
              setDrafts((current) => ({ ...current, [item.id]: current[item.id] ?? JSON.stringify(item.payload, null, 2) }));
              setEditingId((current) => current === item.id ? null : item.id);
            }} style={styles.button}><Text style={styles.buttonText}>{editingId === item.id ? "Đóng chỉnh sửa" : "Sửa và gửi lại"}</Text></Pressable>
            {editingId === item.id && item.kind === "transaction.update" && <TransactionMergeEditor conflict={item} onQueued={() => {
              setItems(current => current.filter(candidate => candidate.id !== item.id));
              setEditingId(null);
              setMessage("Đã đưa bản đối chiếu vào hàng đợi. Nếu máy chủ đổi tiếp, Picket sẽ giữ xung đột để bạn kiểm tra lại.");
            }} />}
            {editingId === item.id && item.kind !== "transaction.update" && <>
              <Text style={styles.help}>Chỉ sửa các trường nghiệp vụ hoặc `expectedVersion` sau khi đối chiếu dữ liệu mới nhất trên server.</Text>
              <TextInput accessibilityLabel={`Payload xung đột ${labels[item.kind] ?? item.kind}`} multiline onChangeText={(value) => setDrafts((current) => ({ ...current, [item.id]:value }))} style={styles.editor} value={drafts[item.id] ?? ""} />
              <Pressable onPress={() => void retry(item)} style={styles.retry}><Text style={styles.retryText}>Đưa vào hàng đợi đồng bộ</Text></Pressable>
            </>}
            <Pressable onPress={() => void dismiss(item.id)} style={styles.button}><Text style={styles.buttonText}>Đã xem, giữ bản trên máy chủ</Text></Pressable>
          </View>
        ))}
        {!loading && items.length === 0 && <Text style={styles.empty}>Không còn xung đột nào.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream }, content: { gap: 14, padding: 22, paddingBottom: 48 },
  back: { color: colors.mauve, fontWeight: "700" }, title: { color: colors.ink, fontSize: 30, fontWeight: "700" },
  subtitle: { color: colors.muted, lineHeight: 21 }, card: { backgroundColor: colors.white, borderRadius: radii.medium, gap: 7, padding: 16 },
  name: { color: colors.ink, fontSize: 16, fontWeight: "700" }, meta: { color: colors.muted, fontSize: 12 },
  button: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, marginTop: 8, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  buttonText: { color: colors.mauve, fontWeight: "700" }, empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
  message:{color:colors.ink,fontSize:13},help:{color:colors.muted,fontSize:12,lineHeight:18},editor:{backgroundColor:colors.cream,borderColor:colors.peach,borderRadius:radii.small,borderWidth:1,color:colors.ink,fontFamily:"monospace",minHeight:150,padding:12,textAlignVertical:"top"},retry:{alignItems:"center",backgroundColor:colors.mauve,borderRadius:radii.small,justifyContent:"center",minHeight:44},retryText:{color:colors.white,fontWeight:"800"},
});
