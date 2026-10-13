import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { listMutationConflicts, removeMutationConflict, type MutationConflict } from "@/core/sync/mutation-queue";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";

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
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session) return;
    let active = true;
    void listMutationConflicts(session.user.id)
      .then((conflicts) => { if (active) setItems(conflicts); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);
  if (!session) return <Redirect href={routes.login} />;

  async function dismiss(id: string) {
    await removeMutationConflict(id, session!.user.id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.replace(routes.home)}><Text style={styles.back}>‹ Trang chủ</Text></Pressable>
        <Text style={styles.title}>Xung đột đồng bộ</Text>
        <Text style={styles.subtitle}>Picket không tự ghi đè khi phiên bản trên máy chủ đã thay đổi. Hãy mở lại dữ liệu mới nhất và thực hiện thay đổi lần nữa nếu vẫn cần.</Text>
        {loading && <ActivityIndicator color={colors.mauve} />}
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{labels[item.kind] ?? item.kind}</Text>
            <Text style={styles.meta}>{item.entityKey ?? "Thao tác tạo mới"} · {item.reason}</Text>
            <Text style={styles.meta}>{new Date(item.failedAt).toLocaleString("vi-VN")}</Text>
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
  back: { color: colors.mauve, fontWeight: "800" }, title: { color: colors.ink, fontSize: 30, fontWeight: "800" },
  subtitle: { color: colors.muted, lineHeight: 21 }, card: { backgroundColor: colors.white, borderRadius: radii.medium, gap: 7, padding: 16 },
  name: { color: colors.ink, fontSize: 16, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 12 },
  button: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, marginTop: 8, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  buttonText: { color: colors.mauve, fontWeight: "800" }, empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
});
