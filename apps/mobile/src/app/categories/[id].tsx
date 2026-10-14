import { colors, radii } from "@picket/design-tokens";
import type { Category } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const kinds: { value: Category["kind"]; label: string }[] = [
  { value: "expense", label: "Khoản chi" }, { value: "income", label: "Khoản thu" }, { value: "both", label: "Cả hai" },
];
const swatches = ["#8C6A7D", "#D46A6A", "#4F8A6B", "#C98A3D", "#5577A8"];

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { archiveCategory, categories, updateCategory } = useTransactions();
  const category = categories.find((item) => item.id === id);
  const [name, setName] = useState<string | null>(null);
  const [kind, setKind] = useState<Category["kind"] | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session) return <Redirect href={routes.login} />;
  if (!category || !category.custom) return <SafeAreaView style={[styles.safeArea, styles.center]}><Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>Không tìm thấy danh mục tùy chỉnh.</Text><Pressable onPress={() => router.replace(routes.categories)} style={styles.secondary}><Text style={styles.secondaryText}>Về danh sách</Text></Pressable></SafeAreaView>;

  const currentName = name ?? category.name;
  const currentKind = kind ?? category.kind;
  const currentColor = color ?? category.color ?? swatches[0];
  const categoryId = category.id;
  const categoryVersion = category.version;

  async function save() {
    if (!currentName.trim()) return setMessage("Hãy nhập tên danh mục.");
    setBusy(true); setMessage(null);
    try {
      await updateCategory(categoryId, { color: currentColor, expectedVersion: categoryVersion, kind: currentKind, name: currentName.trim() });
      router.replace(routes.categories);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.categories);
        return;
      }
      setMessage("Không cập nhật được. Danh mục có thể đã đổi hoặc tên đã tồn tại.");
    } finally { setBusy(false); }
  }

  function confirmArchive() {
    Alert.alert("Xóa danh mục?", "Danh mục đang được giao dịch sử dụng sẽ được lưu trữ mềm.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => { setBusy(true); void archiveCategory(categoryId, categoryVersion).then(() => router.replace(routes.categories)).catch((error: unknown) => { if (isOfflineQueuedError(error)) { router.replace(routes.categories); return; } setMessage("Không xóa được danh mục."); setBusy(false); }); } },
    ]);
  }

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>Sửa danh mục</Text>
    <TextInput accessibilityLabel="Tên danh mục" placeholder="Tên danh mục" placeholderTextColor={colors.muted} style={styles.input} value={currentName} onChangeText={setName} />
    <Text style={styles.label}>Áp dụng cho</Text><View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: currentKind === item.value }} key={item.value} onPress={() => setKind(item.value)} style={[styles.choice, currentKind === item.value && styles.selected]}><Text style={[styles.choiceText, currentKind === item.value && styles.selectedText]}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.label}>Màu sắc</Text><View accessibilityRole="radiogroup" style={styles.choices}>{swatches.map((item) => <Pressable accessibilityLabel={`Màu ${item}`} accessibilityRole="radio" accessibilityState={{ checked: currentColor === item }} key={item} onPress={() => setColor(item)} style={[styles.swatch, { backgroundColor: item }, currentColor === item && styles.swatchSelected]} />)}</View>
    {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
    <Pressable disabled={busy} onPress={() => void save()} style={styles.primary}>{busy ? <ActivityIndicator accessibilityLabel="Đang lưu danh mục" color={colors.white} /> : <Text style={styles.primaryText}>Lưu thay đổi</Text>}</Pressable>
    <Pressable disabled={busy} onPress={confirmArchive} style={styles.deleteButton}><Text style={styles.deleteText}>Xóa danh mục</Text></Pressable>
    <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Hủy</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 }, center: { alignItems: "center", justifyContent: "center", padding: 24 }, content: { gap: 14, padding: 24 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginBottom: 8, marginTop: 20 }, input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 }, selected: { backgroundColor: colors.mauve }, choiceText: { color: colors.ink, fontWeight: "700" }, selectedText: { color: colors.white },
  swatch: { borderRadius: 20, height: 40, width: 40 }, swatchSelected: { borderColor: colors.ink, borderWidth: 3 }, error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 52 }, primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  deleteButton: { alignItems: "center", borderColor: colors.expense, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 48 }, deleteText: { color: colors.expense, fontWeight: "800" }, secondary: { alignItems: "center", padding: 12 }, secondaryText: { color: colors.mauve, fontWeight: "800" },
});
