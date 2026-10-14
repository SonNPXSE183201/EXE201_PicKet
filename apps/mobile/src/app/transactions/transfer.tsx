import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
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
import { useTransactions } from "@/features/transactions/transactions-context";

export default function NewTransferScreen() {
  const { session } = useAuth();
  const { accounts } = useAccounts();
  const { createTransfer } = useTransactions();
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? "");
  const source = accounts.find((item) => item.id === sourceId) ?? accounts[0];
  const destinations = useMemo(
    () =>
      accounts.filter(
        (item) =>
          item.id !== source?.id && item.currencyCode === source?.currencyCode,
      ),
    [accounts, source],
  );
  const [destinationId, setDestinationId] = useState("");
  const selectedDestinationId = destinations.some(
    (item) => item.id === destinationId,
  )
    ? destinationId
    : destinations[0]?.id ?? "";
  const [title, setTitle] = useState("Chuyển tiền");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) return <Redirect href={routes.login} />;

  async function submit() {
    const parsedAmount = Number.parseInt(amount, 10);
    if (!source || !selectedDestinationId) {
      return setMessage("Cần ít nhất hai tài khoản cùng loại tiền.");
    }
    if (!title.trim()) return setMessage("Hãy nhập nội dung chuyển tiền.");
    if (!/^\d+$/.test(amount) || parsedAmount <= 0) {
      return setMessage("Số tiền phải là số nguyên lớn hơn 0.");
    }
    setBusy(true);
    setMessage(null);
    try {
      await createTransfer({
        amount: parsedAmount,
        destinationAccountId: selectedDestinationId,
        note: note.trim(),
        occurredAt: new Date().toISOString(),
        sourceAccountId: source.id,
        title: title.trim(),
      });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage("Không chuyển được tiền. Hai tài khoản phải cùng loại tiền và đang hoạt động.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Chuyển tiền</Text>
        <Text style={styles.subtitle}>Chuyển nội bộ không được tính là thu hoặc chi.</Text>
        <Text style={styles.label}>Từ tài khoản</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {accounts.map((account) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: source?.id === account.id }} key={account.id} onPress={() => { setSourceId(account.id); setDestinationId(""); }} style={[styles.choice, source?.id === account.id && styles.selected]}>
              <Text style={[styles.choiceText, source?.id === account.id && styles.selectedText]}>{account.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Đến tài khoản ({source?.currencyCode ?? "—"})</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {destinations.map((account) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedDestinationId === account.id }} key={account.id} onPress={() => setDestinationId(account.id)} style={[styles.choice, selectedDestinationId === account.id && styles.selected]}>
              <Text style={[styles.choiceText, selectedDestinationId === account.id && styles.selectedText]}>{account.name}</Text>
            </Pressable>
          ))}
          {destinations.length === 0 && <Text style={styles.empty}>Không có tài khoản đích cùng loại tiền.</Text>}
        </View>
        <TextInput accessibilityLabel="Nội dung chuyển tiền" placeholder="Nội dung" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />
        <TextInput accessibilityLabel="Số tiền chuyển" keyboardType="number-pad" placeholder="Số tiền" placeholderTextColor={colors.muted} style={styles.input} value={amount} onChangeText={setAmount} />
        <TextInput accessibilityLabel="Ghi chú chuyển tiền" multiline placeholder="Ghi chú" placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={note} onChangeText={setNote} />
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        <Pressable disabled={busy} onPress={() => void submit()} style={styles.primary}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Xác nhận chuyển</Text>}
        </Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Hủy</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { gap: 14, padding: 24, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 20 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  selected: { backgroundColor: colors.mauve, borderColor: colors.mauve },
  choiceText: { color: colors.ink, fontWeight: "700" },
  selectedText: { color: colors.white },
  empty: { color: colors.expense, fontSize: 13 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  note: { minHeight: 82, paddingTop: 14, textAlignVertical: "top" },
  error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
});
