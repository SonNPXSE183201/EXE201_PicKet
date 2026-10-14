import { colors, radii } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function RefundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { createRefund, loading, transactions } = useTransactions();
  const original = transactions.find((item) => item.id === id);
  const refunded = transactions
    .filter((item) => item.kind === "refund" && item.refundOfTransactionId === id)
    .reduce((total, item) => total + item.amount, 0);
  const remaining = Math.max(0, (original?.amount ?? 0) - refunded);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) return <Redirect href={routes.login} />;
  if (loading && !original) {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><ActivityIndicator accessibilityLabel="Đang tải giao dịch cần hoàn tiền" color={colors.mauve} /></SafeAreaView>;
  }
  if (!original || original.kind !== "expense") {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><Text style={styles.error}>Chỉ khoản chi đang hoạt động mới có thể hoàn tiền.</Text><Pressable onPress={() => router.replace(routes.transactions)} style={styles.secondary}><Text style={styles.secondaryText}>Về danh sách</Text></Pressable></SafeAreaView>;
  }
  const originalId = original.id;

  async function submit() {
    const parsedAmount = Number.parseInt(amount, 10);
    if (!/^\d+$/.test(amount) || parsedAmount <= 0 || parsedAmount > remaining) {
      return setMessage(`Số tiền hoàn phải từ 1 đến ${formatVnd(remaining)}.`);
    }
    setBusy(true);
    setMessage(null);
    try {
      await createRefund(originalId, {
        amount: parsedAmount,
        note: note.trim(),
        occurredAt: new Date().toISOString(),
      });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage("Không tạo được khoản hoàn. Số dư hoàn có thể đã thay đổi trên thiết bị khác.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Hoàn tiền</Text>
        <Text style={styles.subtitle}>{original.title}</Text>
        <Text style={styles.remaining}>Có thể hoàn: {formatVnd(remaining)}</Text>
        <TextInput accessibilityLabel="Số tiền hoàn" keyboardType="number-pad" placeholder="Số tiền hoàn" placeholderTextColor={colors.muted} style={styles.input} value={amount} onChangeText={setAmount} />
        <TextInput accessibilityLabel="Lý do hoặc ghi chú hoàn tiền" multiline placeholder="Lý do hoặc ghi chú" placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={note} onChangeText={setNote} />
        {message && <Text style={styles.error}>{message}</Text>}
        <Pressable disabled={busy || remaining === 0} onPress={() => void submit()} style={[styles.primary, remaining === 0 && styles.disabled]}>
          {busy ? <ActivityIndicator accessibilityLabel="Đang tạo khoản hoàn" color={colors.white} /> : <Text style={styles.primaryText}>Tạo khoản hoàn</Text>}
        </Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Hủy</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { gap: 14, padding: 24, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 20 },
  subtitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  remaining: { color: colors.income, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  note: { minHeight: 82, paddingTop: 14, textAlignVertical: "top" },
  error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 52 },
  disabled: { opacity: 0.45 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
});
