import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const kindLabels = { expense: "Khoản chi", income: "Khoản thu", both: "Thu và chi" } as const;

export default function CategoriesScreen() {
  const { session } = useAuth();
  const { categories } = useTransactions();
  if (!session) return <Redirect href={routes.login} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>‹ Quay lại</Text></Pressable>
        <Pressable onPress={() => router.push(routes.newCategory)}><Text style={styles.link}>+ Thêm</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Danh mục</Text>
        <Text style={styles.subtitle}>Danh mục mặc định được bảo vệ. Bạn có thể tạo và chỉnh sửa danh mục riêng.</Text>
        {categories.map((category) => (
          <Pressable key={category.id} disabled={!category.custom} onPress={() => router.push(routes.category(category.id))} style={styles.card}>
            <View style={[styles.colorDot, { backgroundColor: category.color ?? colors.mauve }]} />
            <View style={styles.copy}>
              <Text style={styles.name}>{category.name}</Text>
              <Text style={styles.hint}>{kindLabels[category.kind]} · {category.custom ? "Tùy chỉnh" : "Mặc định"}</Text>
            </View>
            {category.custom && <Text style={styles.chevron}>›</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 12 },
  link: { color: colors.mauve, fontSize: 15, fontWeight: "800", paddingVertical: 8 },
  content: { padding: 22, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 32, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20, marginTop: 7 },
  card: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.medium, flexDirection: "row", gap: 13, marginBottom: 10, padding: 16 },
  colorDot: { borderRadius: 8, height: 16, width: 16 },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  chevron: { color: colors.mauve, fontSize: 25 },
});
