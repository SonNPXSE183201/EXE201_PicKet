import { TopAppBar } from "@/core/ui/picket-ui";
import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function RefundScreen() {
  const {tx,money:formatVnd}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { createRefund, loading, transactions } = useTransactions();
  const original = transactions.find((item) => item.id === id);
  const refunded = transactions
    .filter((item) => item.kind === "refund" && item.refundOfTransactionId === id)
    .reduce((total, item) => total + item.amount, 0);
  const remaining = Math.max(0, (original?.amount ?? 0) - refunded);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);

  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (loading && !original) {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><ActivityIndicator accessibilityLabel={tx("Đang tải giao dịch cần hoàn tiền")} color={colors.link} /></SafeAreaView>;
  }
  if (!original || original.kind !== "expense") {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><Text style={styles.error}>{tx("Chỉ khoản chi đang hoạt động mới có thể hoàn tiền.")}</Text><Pressable onPress={() => router.replace(routes.transactions)} style={styles.secondary}><Text style={styles.secondaryText}>{tx("Về danh sách")}</Text></Pressable></SafeAreaView>;
  }
  const originalId = original.id;

  async function submit() {
    const parsedAmount = Number.parseInt(amount, 10);
    if (!/^\d+$/.test(amount) || parsedAmount <= 0 || parsedAmount > remaining) {
      return setMessage({key:"refundLimit",money:remaining});
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
        <TopAppBar title={tx("Hoàn tiền")} backDisabled={busy} />
        <Text style={styles.subtitle}>{original.title}</Text>
        <Text style={styles.remaining}>{tx("Có thể hoàn:")}{" "}{formatVnd(remaining)}</Text>
        <TextInput money accessibilityLabel={tx("Số tiền hoàn")} keyboardType="number-pad" placeholder={tx("Số tiền hoàn")} placeholderTextColor={colors.muted} style={styles.input} value={amount} onChangeText={setAmount} />
        <TextInput accessibilityLabel={tx("Lý do hoặc ghi chú hoàn tiền")} multiline placeholder={tx("Lý do hoặc ghi chú")} placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={note} onChangeText={setNote} />
        {message && <Text style={styles.error}>{tx(message)}</Text>}
        <Pressable disabled={busy || remaining === 0} onPress={() => void submit()} style={[styles.primary, remaining === 0 && styles.disabled]}>
          {busy ? <ActivityIndicator accessibilityLabel={tx("Đang tạo khoản hoàn")} color={colors.onPrimary} /> : <Text style={styles.primaryText}>{tx("Tạo khoản hoàn")}</Text>}
        </Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>{tx("Hủy")}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 14, padding: paperSpace.screen, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", marginTop: 20 },
  subtitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  remaining: { color: colors.income, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 },
  note: { minHeight: 82, paddingTop: 14, textAlignVertical: "top" },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: paperShape.button, justifyContent: "center", minHeight: paperControl.height },
  disabled: { opacity: 0.45 },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.link, fontSize: 15, fontWeight: "700" },
});
