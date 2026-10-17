import { TopAppBar , ChoiceChip, DangerAction, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors, radii } from "@picket/design-tokens";
import type { Category } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, Text, View } from "react-native";

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
  const { session, localMode } = useAuth();
  const { archiveCategory, categories, updateCategory } = useTransactions();
  const category = categories.find((item) => item.id === id);
  const [name, setName] = useState<string | null>(null);
  const [kind, setKind] = useState<Category["kind"] | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (!category || !category.custom) return <PicketScreen><Surface style={styles.missing}><Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>Không tìm thấy danh mục tùy chỉnh.</Text><PrimaryAction label="Về danh sách" onPress={() => router.replace(routes.categories)} /></Surface></PicketScreen>;

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
      if (isOfflineQueuedError(error)) { router.replace(routes.categories); return; }
      setMessage("Không cập nhật được. Danh mục có thể đã đổi hoặc tên đã tồn tại.");
    } finally { setBusy(false); }
  }

  function confirmArchive() {
    Alert.alert("Xóa danh mục?", "Danh mục đang được giao dịch sử dụng sẽ được lưu trữ mềm.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => { setBusy(true); void archiveCategory(categoryId, categoryVersion).then(() => router.replace(routes.categories)).catch((error: unknown) => { if (isOfflineQueuedError(error)) { router.replace(routes.categories); return; } setMessage("Không xóa được danh mục."); setBusy(false); }); } },
    ]);
  }

  return <PicketScreen>
    <TopAppBar title="Sửa danh mục" backDisabled={busy} />
    <Text style={styles.subtitle}>Điều chỉnh tên, phạm vi và màu nhận diện cho danh mục.</Text>
    <Surface>
      <FieldLabel>Tên danh mục</FieldLabel><TextInput accessibilityLabel="Tên danh mục" maxLength={80} onChangeText={setName} placeholder="Tên danh mục" placeholderTextColor={colors.muted} style={styles.input} value={currentName} />
      <FieldLabel>Áp dụng cho</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <ChoiceChip checked={currentKind === item.value} key={item.value} label={item.label} onPress={() => setKind(item.value)} />)}</View>
      <FieldLabel>Màu sắc</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{swatches.map((item) => <Pressable accessibilityLabel={`Màu ${item}`} accessibilityRole="radio" accessibilityState={{ checked: currentColor === item }} key={item} onPress={() => setColor(item)} style={[styles.swatch, { backgroundColor: item }, currentColor === item && styles.swatchSelected]} />)}</View>
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text> : null}
      <PrimaryAction busy={busy} label="Lưu thay đổi" onPress={() => void save()} />
      <DangerAction disabled={busy} label="Xóa danh mục" onPress={confirmArchive} />
    </Surface>
  </PicketScreen>;
}

const styles = StyleSheet.create({
  appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 7 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  swatch: { borderRadius: 22, height: 44, width: 44 }, swatchSelected: { borderColor: colors.ink, borderWidth: 3 }, error: { color: colors.expense, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 }, missing: { marginTop: 48 },
});
