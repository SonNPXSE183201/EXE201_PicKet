import { colors, radii } from "@picket/design-tokens";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { archive, loading, transactions, update } = useTransactions();
  const transaction = transactions.find((item) => item.id === id);
  const [title, setTitle] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !id || !picketApi) return;
    let active = true;
    const controller = new AbortController();
    void picketApi
      .listReceipts(session.access_token, controller.signal)
      .then(({ receipts }) => {
        if (active) {
          setReceiptId(receipts.find((item) => item.transactionId === id)?.id ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, session]);

  if (!session) return <Redirect href={routes.login} />;
  if (loading && !transaction) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator color={colors.mauve} />
      </SafeAreaView>
    );
  }
  if (!transaction) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <Text style={styles.error}>Không tìm thấy giao dịch.</Text>
        <Pressable onPress={() => router.replace(routes.transactions)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Về danh sách</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  const currentTitle = title ?? transaction.title;
  const currentAmount = amount ?? String(transaction.amount);
  const currentNote = note ?? transaction.note;
  const transactionId = transaction.id;
  const transactionVersion = transaction.version;
  const editable = transaction.kind === "expense" || transaction.kind === "income";

  async function save() {
    const parsedAmount = Number.parseInt(currentAmount, 10);
    if (!currentTitle.trim()) return setMessage("Hãy nhập nội dung giao dịch.");
    if (!/^\d+$/.test(currentAmount) || parsedAmount <= 0) {
      return setMessage("Số tiền phải là số nguyên lớn hơn 0.");
    }
    setBusy(true);
    setMessage(null);
    try {
      await update(transactionId, {
        amount: parsedAmount,
        expectedVersion: transactionVersion,
        note: currentNote.trim(),
        title: currentTitle.trim(),
      });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage("Không cập nhật được. Dữ liệu có thể đã đổi trên thiết bị khác.");
    } finally {
      setBusy(false);
    }
  }

  function confirmArchive() {
    Alert.alert(
      "Xóa giao dịch?",
      "Giao dịch sẽ được lưu trữ mềm và không còn xuất hiện trong danh sách.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            setMessage(null);
            void archive(transactionId, transactionVersion)
              .then(() => router.replace(routes.transactions))
              .catch((error: unknown) => {
                if (isOfflineQueuedError(error)) {
                  router.replace(routes.transactions);
                  return;
                }
                setMessage("Không xóa được. Dữ liệu có thể đã đổi trên thiết bị khác.");
                setBusy(false);
              });
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sửa giao dịch</Text>
        <Text style={transaction.kind === "income" ? styles.income : styles.expense}>
          {transaction.kind === "income" ? "Khoản thu" : "Khoản chi"}
        </Text>
        <TextInput accessibilityLabel="Nội dung giao dịch" editable={editable} placeholder="Nội dung" placeholderTextColor={colors.muted} style={[styles.input, !editable && styles.readonly]} value={currentTitle} onChangeText={setTitle} />
        <TextInput accessibilityLabel="Số tiền giao dịch" editable={editable} keyboardType="number-pad" placeholder="Số tiền (VND)" placeholderTextColor={colors.muted} style={[styles.input, !editable && styles.readonly]} value={currentAmount} onChangeText={setAmount} />
        <TextInput accessibilityLabel="Ghi chú giao dịch" editable={editable} multiline numberOfLines={3} placeholder="Ghi chú" placeholderTextColor={colors.muted} style={[styles.input, styles.note, !editable && styles.readonly]} value={currentNote} onChangeText={setNote} />
        {message && <Text style={styles.error}>{message}</Text>}
        {editable && <Pressable disabled={busy} onPress={() => void save()} style={styles.primary}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Lưu thay đổi</Text>}
        </Pressable>}
        {editable && <Pressable disabled={busy} onPress={() => router.push(routes.splits(transactionId))} style={styles.actionButton}><Text style={styles.actionText}>Chia theo danh mục</Text></Pressable>}
        {transaction.kind === "expense" && <Pressable disabled={busy} onPress={() => router.push(routes.refund(transactionId))} style={styles.actionButton}><Text style={styles.actionText}>Tạo khoản hoàn tiền</Text></Pressable>}
        {receiptId && <Pressable disabled={busy} onPress={() => router.push(routes.receipt(receiptId))} style={styles.actionButton}><Text style={styles.actionText}>Xem hóa đơn đính kèm</Text></Pressable>}
        <Pressable disabled={busy} onPress={confirmArchive} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Xóa giao dịch</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}>
          <Text style={styles.secondaryText}>Hủy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { gap: 14, padding: 24, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 20 },
  income: { color: colors.income, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  expense: { color: colors.expense, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  readonly: { opacity: 0.65 },
  note: { minHeight: 88, paddingTop: 14, textAlignVertical: "top" },
  error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", marginTop: 8, minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  actionButton: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  actionText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
  deleteButton: { alignItems: "center", borderColor: colors.expense, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  deleteText: { color: colors.expense, fontSize: 15, fontWeight: "800" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
});
