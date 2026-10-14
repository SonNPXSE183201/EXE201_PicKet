import { colors, radii } from "@picket/design-tokens";
import type { AccountKind } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";

const kinds: { value: AccountKind; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Ngân hàng" },
  { value: "ewallet", label: "Ví điện tử" },
  { value: "other", label: "Khác" },
];

export default function NewAccountScreen() {
  const { session } = useAuth();
  const { create } = useAccounts();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("cash");
  const [currencyCode, setCurrencyCode] = useState("VND");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) return <Redirect href={routes.login} />;

  async function submit() {
    if (!name.trim()) return setMessage("Hãy nhập tên tài khoản.");
    if (!/^\d+$/.test(openingBalance)) return setMessage("Số dư chưa hợp lệ.");
    setBusy(true);
    setMessage(null);
    try {
      await create({
        name: name.trim(),
        kind,
        currencyCode,
        openingBalance: Number.parseInt(openingBalance, 10),
      });
      router.replace(routes.home);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.home);
        return;
      }
      setMessage("Không tạo được tài khoản. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Thêm tài khoản</Text>
        <Text style={styles.subtitle}>Tài khoản được lưu qua Dart API và bảo vệ bằng Supabase RLS.</Text>
        <TextInput accessibilityLabel="Tên tài khoản" placeholder="Tên tài khoản" placeholderTextColor={colors.muted} style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Loại tài khoản</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: kind === item.value }} key={item.value} onPress={() => setKind(item.value)} style={[styles.choice, kind === item.value && styles.selected]}><Text style={[styles.choiceText, kind === item.value && styles.selectedText]}>{item.label}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="Mã tiền tệ" autoCapitalize="characters" maxLength={3} placeholder="VND" placeholderTextColor={colors.muted} style={styles.input} value={currencyCode} onChangeText={(value) => setCurrencyCode(value.toUpperCase())} />
        <TextInput accessibilityLabel="Số dư ban đầu" keyboardType="number-pad" placeholder="Số dư ban đầu" placeholderTextColor={colors.muted} style={styles.input} value={openingBalance} onChangeText={setOpeningBalance} />
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        <Pressable disabled={busy} onPress={() => void submit()} style={styles.primary}>{busy ? <ActivityIndicator accessibilityLabel="Đang tạo tài khoản" color={colors.white} /> : <Text style={styles.primaryText}>Tạo tài khoản</Text>}</Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Hủy</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { gap: 14, padding: 24 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 20 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  selected: { backgroundColor: colors.mauve, borderColor: colors.mauve },
  choiceText: { color: colors.ink, fontWeight: "700" },
  selectedText: { color: colors.white },
  error: { color: colors.expense, fontSize: 14 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", marginTop: 8, minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
});
