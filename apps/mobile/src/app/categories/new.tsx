import { TopAppBar , ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors, radii } from "@picket/design-tokens";
import type { Category } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, Text, View } from "react-native";

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
  const { session, localMode } = useAuth();
  const { createCategory } = useTransactions();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Category["kind"]>("expense");
  const [color, setColor] = useState(swatches[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

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

  return <PicketScreen>
    <TopAppBar title="Danh mục mới" backDisabled={busy} />
    <Text style={styles.subtitle}>Tạo nhóm riêng để theo dõi thu chi đúng với thói quen của bạn.</Text>
    <Surface>
      <FieldLabel>Tên danh mục</FieldLabel>
      <TextInput accessibilityLabel="Tên danh mục" autoCapitalize="sentences" maxLength={80} onChangeText={setName} placeholder="Ví dụ: Ăn uống" placeholderTextColor={colors.muted} style={styles.input} value={name} />
      <FieldLabel>Áp dụng cho</FieldLabel>
      <View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <ChoiceChip checked={kind === item.value} key={item.value} label={item.label} onPress={() => setKind(item.value)} />)}</View>
      <FieldLabel>Màu sắc</FieldLabel>
      <View accessibilityRole="radiogroup" style={styles.choices}>{swatches.map((item) => <Pressable accessibilityLabel={`Màu ${item}`} accessibilityRole="radio" accessibilityState={{ checked: color === item }} key={item} onPress={() => setColor(item)} style={[styles.swatch, { backgroundColor: item }, color === item && styles.swatchSelected]} />)}</View>
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text> : null}
      <PrimaryAction busy={busy} label="Tạo danh mục" onPress={() => void submit()} />
    </Surface>
  </PicketScreen>;
}

const styles = StyleSheet.create({
  appBar: { justifyContent: "center", minHeight: 52 },
  back: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 7 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  swatch: { borderRadius: 22, height: 44, width: 44 },
  swatchSelected: { borderColor: colors.ink, borderWidth: 3 },
  error: { color: colors.expense, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
});
