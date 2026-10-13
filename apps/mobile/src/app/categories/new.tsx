import { colors, radii } from "@picket/design-tokens";
import type { Category } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const kinds: { value: Category["kind"]; label: string }[] = [
  { value: "expense", label: "Khoản chi" },
  { value: "income", label: "Khoản thu" },
  { value: "both", label: "Cả hai" },
];
const swatches = ["#8C6A7D", "#D46A6A", "#4F8A6B", "#C98A3D", "#5577A8"];

export default function NewCategoryScreen() {
  const { session } = useAuth();
  const { createCategory } = useTransactions();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Category["kind"]>("expense");
  const [color, setColor] = useState(swatches[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session) return <Redirect href={routes.login} />;

  async function submit() {
    if (!name.trim()) return setMessage("Hãy nhập tên danh mục.");
    setBusy(true);
    setMessage(null);
    try {
      await createCategory({ color, kind, name: name.trim() });
      router.replace(routes.categories);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.categories);
        return;
      }
      setMessage("Không tạo được danh mục. Tên có thể đã tồn tại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Danh mục mới</Text>
      <TextInput placeholder="Tên danh mục" placeholderTextColor={colors.muted} style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Áp dụng cho</Text>
      <View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: kind === item.value }} key={item.value} onPress={() => setKind(item.value)} style={[styles.choice, kind === item.value && styles.selected]}><Text style={[styles.choiceText, kind === item.value && styles.selectedText]}>{item.label}</Text></Pressable>)}</View>
      <Text style={styles.label}>Màu sắc</Text>
      <View accessibilityRole="radiogroup" style={styles.choices}>{swatches.map((item) => <Pressable accessibilityLabel={`Màu ${item}`} accessibilityRole="radio" accessibilityState={{ checked: color === item }} key={item} onPress={() => setColor(item)} style={[styles.swatch, { backgroundColor: item }, color === item && styles.swatchSelected]} />)}</View>
      {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
      <Pressable disabled={busy} onPress={() => void submit()} style={styles.primary}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Tạo danh mục</Text>}</Pressable>
      <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Hủy</Text></Pressable>
    </ScrollView></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 }, content: { gap: 14, padding: 24 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 }, selected: { backgroundColor: colors.mauve },
  choiceText: { color: colors.ink, fontWeight: "700" }, selectedText: { color: colors.white },
  swatch: { borderRadius: 20, height: 40, width: 40 }, swatchSelected: { borderColor: colors.ink, borderWidth: 3 },
  error: { color: colors.expense, fontSize: 14 }, primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" }, secondary: { alignItems: "center", padding: 12 }, secondaryText: { color: colors.mauve, fontWeight: "800" },
});
