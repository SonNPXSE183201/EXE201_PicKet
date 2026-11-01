import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { getGuestReceipt } from "@/core/receipts/guest-receipt-store";
import type { GuestReceipt } from "@/core/receipts/guest-receipt-model";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Surface, FieldLabel, ChoiceChip, TopAppBar } from "@/core/ui/picket-ui";
import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { buildTransactionEditRequest } from "@/features/transactions/transaction-edit-request";

export default function TransactionDetailScreen() {
  const {tx,money}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { archive, categories, loading, transactions, update } = useTransactions();
  const transaction = transactions.find((item) => item.id === id);
  const [title, setTitle] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [guestReceipt, setGuestReceipt] = useState<GuestReceipt | null>(null);

  useEffect(() => {
    if (!localMode || !id) return;
    let active = true;
    void getGuestReceipt(id).then((value) => { if (active) setGuestReceipt(value); }).catch(() => { if (active) setMessage("Không đọc được ảnh hóa đơn trên thiết bị."); });
    return () => { active = false; };
  }, [id, localMode]);

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

  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (loading && !transaction) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator accessibilityLabel={tx("Đang tải giao dịch")} color={colors.link} />
      </SafeAreaView>
    );
  }
  if (!transaction) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <Text style={styles.error}>{tx("Không tìm thấy giao dịch.")}</Text>
        <Pressable onPress={() => router.replace(routes.transactions)} style={styles.secondary}>
          <Text style={styles.secondaryText}>{tx("Về danh sách")}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  const currentTitle = title ?? transaction.title;
  const currentAmount = amount ?? String(transaction.amount);
  const currentNote = note ?? transaction.note;
  const currentCategoryId = categoryId === undefined ? transaction.categoryId : categoryId;
  const transactionId = transaction.id;
  const transactionVersion = transaction.version;
  const editable = transaction.kind === "expense" || transaction.kind === "income";

  async function save() {
    if (!currentTitle.trim()) return setMessage("Hãy nhập nội dung giao dịch.");
    let request;
    try { request = buildTransactionEditRequest({ title:currentTitle, amount:currentAmount, note:currentNote, categoryId:currentCategoryId, expectedVersion:transactionVersion }); }
    catch { return setMessage("Số tiền phải là số nguyên lớn hơn 0."); }
    setBusy(true);
    setMessage(null);
    try {
      await update(transactionId, request);
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
      tx("Xóa giao dịch?"),
      tx("Giao dịch sẽ được lưu trữ mềm và không còn xuất hiện trong danh sách."),
      [
        { text: tx("Hủy"), style: "cancel" },
        {
          text: tx("Xóa"),
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
        <TopAppBar title={tx("Sửa giao dịch")} backDisabled={busy} />
        <Surface peach style={styles.editorCard}>
          <View style={styles.headerRow}>
            <View style={styles.artBadge}>
              <PaperArt id={categoryArt(categories.find(c => c.id === currentCategoryId)?.icon ?? null, categories.find(c => c.id === currentCategoryId)?.name || currentTitle)} style={{ width: 36, height: 36 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={transaction.kind === "income" ? styles.income : styles.expense}>
                {transaction.kind === "income" ? tx("Khoản thu") : tx("Khoản chi")}
              </Text>
              <Text style={styles.headerAmount}>
                {transaction.kind === "expense" ? "− " : transaction.kind === "transfer" ? "" : "+ "}
                {money(Number(currentAmount))}
              </Text>
            </View>
          </View>
        <FieldLabel>{tx("Nội dung")}</FieldLabel>
        <TextInput accessibilityLabel={tx("Nội dung giao dịch")} editable={editable} placeholder={tx("Nội dung")} placeholderTextColor={colors.muted} style={[styles.input, !editable && styles.readonly]} value={currentTitle} onChangeText={setTitle} />
        <FieldLabel>{tx("Số tiền")}</FieldLabel>
        <TextInput money accessibilityLabel={tx("Số tiền giao dịch")} editable={editable} keyboardType="number-pad" placeholder={tx("Số tiền (VND)")} placeholderTextColor={colors.muted} style={[styles.input, !editable && styles.readonly]} value={currentAmount} onChangeText={setAmount} />
        <FieldLabel>{tx("Ghi chú")}</FieldLabel>
        <TextInput accessibilityLabel={tx("Ghi chú giao dịch")} editable={editable} multiline numberOfLines={3} placeholder={tx("Ghi chú")} placeholderTextColor={colors.muted} style={[styles.input, styles.note, !editable && styles.readonly]} value={currentNote} onChangeText={setNote} />
        {editable && <><Text style={styles.label}>{tx("Danh mục")}</Text><ScrollView contentContainerStyle={styles.categoryRow} horizontal showsHorizontalScrollIndicator={false}><ChoiceChip checked={currentCategoryId === null} label={tx("Cần phân loại")} onPress={() => setCategoryId(null)} />{categories.filter((item) => item.kind === transaction.kind || item.kind === "both").map((item) => <ChoiceChip checked={currentCategoryId === item.id} key={item.id} label={item.name} onPress={() => setCategoryId(item.id)} />)}</ScrollView></>}
        </Surface>
        {message && <Text style={styles.error}>{tx(message)}</Text>}
        {editable && <Pressable disabled={busy} onPress={() => void save()} style={styles.primary}>
          {busy ? <ActivityIndicator accessibilityLabel={tx("Đang lưu giao dịch")} color={colors.onPrimary} /> : <Text style={styles.primaryText}>{tx("Lưu thay đổi")}</Text>}
        </Pressable>}
        {editable && <Pressable disabled={busy} onPress={() => router.push(routes.splits(transactionId))} style={styles.actionButton}><Text style={styles.actionText}>{tx("Chia theo danh mục")}</Text></Pressable>}
        {transaction.kind === "expense" && <Pressable disabled={busy} onPress={() => router.push(routes.refund(transactionId))} style={styles.actionButton}><Text style={styles.actionText}>{tx("Tạo khoản hoàn tiền")}</Text></Pressable>}
        {receiptId && <Pressable disabled={busy} onPress={() => router.push(routes.receipt(receiptId))} style={styles.actionButton}><Text style={styles.actionText}>{tx("Xem hóa đơn đính kèm")}</Text></Pressable>}
        {guestReceipt && <><Text style={styles.actionText}>{tx("Hóa đơn trên thiết bị ·")}{" "}{guestReceipt.merchant}</Text><Image accessibilityLabel={tx("receiptImage",{merchant:guestReceipt.merchant})} resizeMode="contain" source={{ uri:`data:${guestReceipt.contentType};base64,${guestReceipt.imageBase64}` }} style={styles.receiptImage} />{guestReceipt.lineItems.map((item, index) => <Text key={`${index}:${item.name}`} style={styles.secondaryText}>{item.name} · {money(item.total)}</Text>)}</>}
        <Pressable disabled={busy} onPress={confirmArchive} style={styles.deleteButton}>
          <Text style={styles.deleteText}>{tx("Xóa giao dịch")}</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}>
          <Text style={styles.secondaryText}>{tx("Hủy")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  editorCard: { padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  artBadge: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerAmount: { color: colors.ink, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 14, padding: paperSpace.screen, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", marginTop: 20 },
  income: { color: colors.income, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  expense: { color: colors.expense, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 },
  readonly: { opacity: 0.65 },
  note: { minHeight: 88, paddingTop: 14, textAlignVertical: "top" },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  categoryRow: { gap: 8, paddingVertical: 2 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: paperShape.button, justifyContent: "center", marginTop: 8, minHeight: paperControl.height },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  actionButton: { alignItems: "center", borderColor: colors.primaryOutline, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height },
  actionText: { color: colors.link, fontSize: 15, fontWeight: "700" },
  receiptImage: { backgroundColor: colors.white, height: 280, width: "100%" },
  deleteButton: { alignItems: "center", borderColor: colors.expense, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.link, fontSize: 15, fontWeight: "700" },
});
