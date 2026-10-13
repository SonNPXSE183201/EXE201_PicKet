import { colors, radii } from "@picket/design-tokens";
import type { TransactionKind } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { picketApi } from "@/core/api/client";
import {
  getPendingReceiptDraft,
  removePendingReceiptDraft,
  updatePendingReceiptProgress,
  type PendingReceiptDraft,
} from "@/core/receipts/pending-receipt";
import {
  inspectReceiptImage,
  uploadReceiptImage,
} from "@/core/receipts/receipt-upload";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

type BasicTransactionKind = Extract<TransactionKind, "expense" | "income">;

export default function NewTransactionScreen() {
  const { session } = useAuth();
  const { accounts } = useAccounts();
  const { categories, create, refresh } = useTransactions();
  const params = useLocalSearchParams<{
    title?: string;
    amount?: string;
    receiptDraftId?: string;
  }>();
  const [kind, setKind] = useState<BasicTransactionKind>("expense");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState(params.title ?? "");
  const [amount, setAmount] = useState(params.amount ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<PendingReceiptDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(params.receiptDraftId));

  useEffect(() => {
    if (!session || !params.receiptDraftId) return;
    let active = true;
    void getPendingReceiptDraft(params.receiptDraftId, session.user.id)
      .then((draft) => {
        if (!active) return;
        setReceiptDraft(draft);
        if (!draft) setMessage("Bản nháp hóa đơn không còn trên thiết bị.");
      })
      .catch(() => {
        if (active) setMessage("Không đọc được bản nháp hóa đơn.");
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [params.receiptDraftId, session]);

  const availableCategories = useMemo(
    () => categories.filter((item) => item.kind === kind || item.kind === "both"),
    [categories, kind],
  );
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedCategoryId = availableCategories.some(
    (item) => item.id === categoryId,
  )
    ? categoryId
    : availableCategories[0]?.id ?? "";

  if (!session) return <Redirect href={routes.login} />;

  async function submit() {
    if (loadingDraft) return;
    const parsedAmount = Number.parseInt(amount, 10);
    if (!selectedAccountId) return setMessage("Hãy tạo hoặc chọn một tài khoản.");
    if (!title.trim()) return setMessage("Hãy nhập nội dung giao dịch.");
    if (!/^\d+$/.test(amount) || parsedAmount <= 0) {
      return setMessage("Số tiền phải là số nguyên lớn hơn 0.");
    }
    setBusy(true);
    setMessage(null);
    try {
      const request = {
        accountId: selectedAccountId,
        amount: parsedAmount,
        categoryId: selectedCategoryId || null,
        kind,
        note: note.trim(),
        occurredAt: receiptDraft?.purchasedAt ?? new Date().toISOString(),
        title: title.trim(),
      };
      if (!receiptDraft) {
        await create(request);
        router.replace(routes.transactions);
        return;
      }
      if (!session || !picketApi) throw new Error("Dart API is unavailable.");

      const image = await inspectReceiptImage(receiptDraft.imageUri);
      const duplicateResult = await picketApi.findDuplicateReceipts(
        session.access_token,
        {
          imageSha256: image.sha256,
          merchant: title.trim(),
          purchasedAt: receiptDraft.purchasedAt,
          total: parsedAmount,
        },
      );
      if (duplicateResult.duplicates.length > 0) {
        const duplicate = duplicateResult.duplicates[0];
        const shouldContinue = await new Promise<boolean>((resolve) => {
          const exact = duplicate.matchType === "exact_hash";
          Alert.alert(
            exact ? "Hóa đơn này đã được lưu" : "Có thể trùng hóa đơn",
            exact
              ? "Ảnh giống hệt một hóa đơn đã có. Bạn có thể mở bản đã lưu."
              : "Có hóa đơn cùng cửa hàng, ngày và tổng tiền. Hãy kiểm tra trước khi lưu thêm.",
            [
              { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
              {
                text: "Xem hóa đơn",
                onPress: () => {
                  resolve(false);
                  if (exact) void removePendingReceiptDraft(receiptDraft);
                  router.push(routes.receipt(duplicate.id));
                },
              },
              ...(!exact
                ? [{ text: "Vẫn lưu", onPress: () => resolve(true) }]
                : []),
            ],
            { cancelable: false },
          );
        });
        if (!shouldContinue) return;
      }

      let draft = receiptDraft;
      if (!draft.storagePath) {
        const storagePath = await uploadReceiptImage({
          userId: session.user.id,
          image: image.bytes,
          extension: image.extension,
          contentType: image.contentType,
        });
        draft = await updatePendingReceiptProgress(draft, { storagePath });
        setReceiptDraft(draft);
      }
      if (!draft.transactionId) {
        const created = await picketApi.createTransaction(
          session.access_token,
          request,
          `${session.user.id}:${draft.id}`,
        );
        draft = await updatePendingReceiptProgress(draft, {
          transactionId: created.transaction.id,
        });
        setReceiptDraft(draft);
      }
      const receipt = await picketApi.createReceipt(session.access_token, {
        transactionId: draft.transactionId,
        storagePath: draft.storagePath!,
        merchant: title.trim(),
        detectedTotal: parsedAmount,
        purchasedAt: draft.purchasedAt,
        currencyCode: "VND",
        confidence: draft.confidence,
        ocrProvider: draft.provider,
        reviewRequired: false,
        rawText: draft.rawText,
        imageSha256: image.sha256,
        lineItems: draft.lineItems,
      });
      await removePendingReceiptDraft(draft);
      await refresh();
      router.replace(routes.receipt(receipt.receipt.id));
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage(
        receiptDraft
          ? "Chưa hoàn tất lưu hóa đơn. Bản nháp vẫn an toàn trên thiết bị; hãy kết nối mạng và thử lại."
          : "Không lưu được giao dịch. Hãy kiểm tra kết nối và thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Giao dịch mới</Text>
        {loadingDraft && <ActivityIndicator color={colors.mauve} />}
        {receiptDraft && (
          <View style={styles.receiptCard}>
            <Image source={{ uri: receiptDraft.imageUri }} style={styles.receiptImage} />
            <View style={styles.receiptCopy}>
              <Text style={styles.receiptTitle}>Có đính kèm hóa đơn</Text>
              <Text style={styles.receiptHint}>
                Ảnh chỉ được tải lên khi bạn bấm Lưu giao dịch.
                {receiptDraft.lineItems.length > 0
                  ? ` OCR đã tách ${receiptDraft.lineItems.length} sản phẩm để bạn kiểm tra.`
                  : " Không có dòng sản phẩm đủ tin cậy; bạn có thể thêm sau."}
              </Text>
            </View>
          </View>
        )}
        <View accessibilityRole="radiogroup" style={styles.segment}>
          {(["expense", "income"] as const).map((value) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: kind === value }} key={value} onPress={() => { setKind(value); setCategoryId(""); }} style={[styles.segmentItem, kind === value && styles.segmentSelected]}>
              <Text style={[styles.segmentText, kind === value && styles.segmentTextSelected]}>
                {value === "expense" ? "Khoản chi" : "Khoản thu"}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput placeholder="Nội dung, ví dụ: Ăn trưa" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />
        <TextInput keyboardType="number-pad" placeholder="Số tiền (VND)" placeholderTextColor={colors.muted} style={styles.input} value={amount} onChangeText={setAmount} />

        <Text style={styles.label}>Tài khoản</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {accounts.map((account) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedAccountId === account.id }} key={account.id} onPress={() => setAccountId(account.id)} style={[styles.choice, selectedAccountId === account.id && styles.selected]}>
              <Text style={[styles.choiceText, selectedAccountId === account.id && styles.selectedText]}>{account.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.labelRow}><Text style={styles.label}>Danh mục</Text><Pressable accessibilityRole="link" onPress={() => router.push(routes.categories)}><Text style={styles.manage}>Quản lý</Text></Pressable></View>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {availableCategories.map((category) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedCategoryId === category.id }} key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.choice, selectedCategoryId === category.id && styles.selected]}>
              <Text style={[styles.choiceText, selectedCategoryId === category.id && styles.selectedText]}>{category.name}</Text>
            </Pressable>
          ))}
          {availableCategories.length === 0 && <Text style={styles.empty}>Chưa có danh mục phù hợp.</Text>}
        </View>

        <TextInput multiline numberOfLines={3} placeholder="Ghi chú (không bắt buộc)" placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={note} onChangeText={setNote} />
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        <Pressable disabled={busy || loadingDraft} onPress={() => void submit()} style={[styles.primary, loadingDraft && styles.disabled]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Lưu giao dịch</Text>}
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
  content: { gap: 14, padding: 24, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginBottom: 4, marginTop: 20 },
  segment: { backgroundColor: colors.white, borderRadius: radii.small, flexDirection: "row", padding: 4 },
  segmentItem: { alignItems: "center", borderRadius: 8, flex: 1, padding: 11 },
  segmentSelected: { backgroundColor: colors.mauve },
  segmentText: { color: colors.ink, fontWeight: "800" },
  segmentTextSelected: { color: colors.white },
  receiptCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.small, flexDirection: "row", gap: 12, padding: 10 },
  receiptImage: { backgroundColor: colors.cream, borderRadius: 8, height: 64, width: 48 },
  receiptCopy: { flex: 1 },
  receiptTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  receiptHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  note: { minHeight: 88, paddingTop: 14, textAlignVertical: "top" },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800", marginTop: 2 },
  labelRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  manage: { color: colors.mauve, fontSize: 13, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  selected: { backgroundColor: colors.mauve, borderColor: colors.mauve },
  choiceText: { color: colors.ink, fontWeight: "700" },
  selectedText: { color: colors.white },
  empty: { color: colors.muted, fontSize: 13 },
  error: { color: colors.expense, fontSize: 14 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", marginTop: 8, minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
});
