import { colors, radii } from "@picket/design-tokens";
import { MAX_MONEY, type TransactionKind } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { routes } from "@/core/navigation/routes";
import { completeDuplicateCapture } from "@/core/receipts/duplicate-capture-completion";
import { receiptRequestTextError } from "@/core/receipts/receipt-request-journal";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { picketApi } from "@/core/api/client";
import {
  getPendingReceiptDraft,
  pinPendingReceiptRequest,
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
import { guestOwnerId } from "@/core/local/guest-finance";
import { makeGuestReceipt } from "@/core/receipts/guest-receipt-model";
import { saveGuestReceipt } from "@/core/receipts/guest-receipt-store";
import { fromByteArray } from "base64-js";
import { finishReceiptFlow } from "@/core/ui/receipt-flow-policy";
import { calendarReceiptDay } from "@/core/ui/receipt-calendar";
import { captureJournal } from "@/core/ocr/capture-storage";

type BasicTransactionKind = Extract<TransactionKind, "expense" | "income">;

export default function NewTransactionScreen() {
  const { session, localMode } = useAuth();
  const owner = session?.user.id ?? (localMode ? guestOwnerId : null);
  const { accounts } = useAccounts();
  const { categories, create, refresh, transactions } = useTransactions();
  const params = useLocalSearchParams<{
    title?: string;
    amount?: string;
    receiptDraftId?: string;
    occurredAt?: string;
    fromCapture?: string;
    captureDraftId?: string;
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
    if (!owner || !params.receiptDraftId) return;
    let active = true;
    void getPendingReceiptDraft(params.receiptDraftId, owner)
      .then((draft) => {
        if (!active) return;
        setReceiptDraft(draft);
        if (draft) {
          const original = draft.transactionRequest;
          setTitle(original?.title ?? draft.merchant); setAmount(String(original?.amount ?? draft.amount));
          if (original) { setKind(original.kind); setAccountId(original.accountId); setCategoryId(original.categoryId ?? ""); setNote(original.note ?? ""); }
        }
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
  }, [owner, params.receiptDraftId]);

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

  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function submit() {
    if (loadingDraft || busy) return;
    if (params.receiptDraftId && !receiptDraft) return setMessage("Không đọc được bản nháp ảnh. Hãy quay lại bước quét; giao dịch chưa được tạo.");
    const parsedAmount = Number.parseInt(amount, 10);
    if (!selectedAccountId && !receiptDraft?.transactionRequest) return setMessage("Hãy tạo hoặc chọn một tài khoản.");
    if (!title.trim()) return setMessage("Hãy nhập nội dung giao dịch.");
    const textError = receiptRequestTextError(title.trim(),note.trim());
    if (textError) return setMessage(textError);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_MONEY) {
      return setMessage("Số tiền phải là số nguyên từ 1 đến 9.000.000.000.000 VND.");
    }
    setBusy(true);
    setMessage(null);
    try {
      let request = receiptDraft?.transactionRequest ?? {
        accountId: selectedAccountId,
        amount: parsedAmount,
        categoryId: selectedCategoryId || null,
        kind,
        note: note.trim(),
        occurredAt: receiptDraft?.purchasedAt ?? (params.occurredAt && Number.isFinite(Date.parse(params.occurredAt)) ? params.occurredAt : new Date().toISOString()),
        title: title.trim(),
      };
      if (!receiptDraft) {
        await create(request);
        if (params.captureDraftId) await captureJournal.complete(session?.user.id ?? guestOwnerId, params.captureDraftId).catch(() => undefined);
        router.dismissTo(params.fromCapture ? routes.home : routes.transactions);
        return;
      }
      if (localMode) {
        let draft = receiptDraft;
        if (!draft.transactionId) {
          const created = await create(request);
          draft = await updatePendingReceiptProgress(draft, { transactionId: created.id });
          setReceiptDraft(draft);
        } else if (!transactions.some((item) => item.id === draft.transactionId)) {
          throw new Error("Không tìm thấy giao dịch của bản nháp hóa đơn.");
        }
        const image = await inspectReceiptImage(draft.imageUri);
        await saveGuestReceipt(makeGuestReceipt({ transactionId: draft.transactionId!, imageBase64: fromByteArray(new Uint8Array(image.bytes)), contentType: image.contentType, merchant: title.trim(), amount: parsedAmount, purchasedAt: draft.purchasedAt, rawText: draft.rawText, lineItems: draft.lineItems }));
        await removePendingReceiptDraft(draft);
        if (params.captureDraftId) await captureJournal.complete(guestOwnerId, params.captureDraftId).catch(() => undefined);
        finishReceiptFlow(router, { transactionId: draft.transactionId!, month: calendarReceiptDay({ purchasedAt: draft.purchasedAt }, request.occurredAt)!.slice(0, 7) });
        return;
      }
      if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");

      const image = await inspectReceiptImage(receiptDraft.imageUri);
      const duplicateResult = await picketApi.findDuplicateReceipts(
        session.access_token,
        {
          imageSha256: image.sha256,
          merchant: request.title,
          purchasedAt: receiptDraft.purchasedAt,
          total: request.amount,
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
                  void (async () => {
                    try {
                      await completeDuplicateCapture({ exact, owner: session.user.id,
                        receiptOwner: receiptDraft.userId, captureId: params.captureDraftId }, {
                        complete: (owner, id) => captureJournal.complete(owner, id),
                        remove: () => removePendingReceiptDraft(receiptDraft),
                      });
                      router.dismissTo(routes.home);
                      router.push(routes.receipt(duplicate.id));
                    } catch {
                      setMessage("Chưa dọn được bản nháp. Hóa đơn đã lưu vẫn an toàn; hãy thử mở lại.");
                    } finally { resolve(false); }
                  })();
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

      let draft: PendingReceiptDraft = await pinPendingReceiptRequest(receiptDraft, request);
      request = draft.transactionRequest!;
      setReceiptDraft(draft);
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
        merchant: request.title,
        detectedTotal: request.amount,
        purchasedAt: request.occurredAt,
        currencyCode: "VND",
        confidence: draft.confidence,
        ocrProvider: draft.provider,
        reviewRequired: draft.reviewRequired,
        rawText: draft.rawText,
        imageSha256: image.sha256,
        lineItems: draft.lineItems,
      });
      await removePendingReceiptDraft(draft);
      if (params.captureDraftId) await captureJournal.complete(session.user.id, params.captureDraftId).catch(() => undefined);
      await refresh();
      finishReceiptFlow(router, { receiptId: receipt.receipt.id, transactionId: draft.transactionId!, month: calendarReceiptDay({ purchasedAt: draft.purchasedAt }, request.occurredAt)!.slice(0, 7) });
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage(localMode ? "Chưa hoàn tất lưu ảnh hóa đơn. Bản nháp vẫn trên thiết bị; hãy thử lại." : receiptDraft
        ? "Chưa hoàn tất lưu hóa đơn. Bản nháp vẫn an toàn trên thiết bị; hãy kết nối mạng và thử lại."
        : "Không lưu được giao dịch. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PicketScreen>
      <TopAppBar title="Giao dịch mới" subtitle="Ghi lại khoản thu hoặc chi của bạn." />
        {loadingDraft && <ActivityIndicator accessibilityLabel="Đang tải bản nháp hóa đơn" color={colors.mauve} />}
        {receiptDraft && (
          <View style={styles.receiptCard}>
            <Image accessibilityLabel="Ảnh hóa đơn của giao dịch mới" source={{ uri: receiptDraft.imageUri }} style={styles.receiptImage} />
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
        {!receiptDraft?.transactionRequest && <View accessibilityRole="radiogroup" style={styles.segment}>
          {(["expense", "income"] as const).map((value) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: kind === value }} key={value} onPress={() => { setKind(value); setCategoryId(""); }} style={[styles.segmentItem, kind === value && styles.segmentSelected]}>
              <Text style={[styles.segmentText, kind === value && styles.segmentTextSelected]}>
                {value === "expense" ? "Khoản chi" : "Khoản thu"}
              </Text>
            </Pressable>
          ))}
        </View>}

        <Surface style={styles.form}>
        {receiptDraft?.transactionRequest ? <View>
          <Text style={styles.label}>Yêu cầu gốc đã được lưu an toàn</Text>
          <Text style={styles.receiptHint}>Thử lại sẽ giữ nguyên ví, danh mục, thời gian và số tiền để không tạo giao dịch trùng. Hoàn tất yêu cầu này trước khi sửa giao dịch.</Text>
          <Text style={styles.label}>{receiptDraft.transactionRequest.title}</Text>
          <Text style={styles.amountInput}>{receiptDraft.transactionRequest.amount.toLocaleString("vi-VN")} ₫</Text>
          <Text style={styles.receiptHint}>{accounts.find(account => account.id === receiptDraft.transactionRequest?.accountId)?.name ?? "Ví của yêu cầu gốc"} · {receiptDraft.transactionRequest.kind === "expense" ? "Khoản chi" : "Khoản thu"}</Text>
          <Text style={styles.receiptHint}>{new Date(receiptDraft.transactionRequest.occurredAt).toLocaleString("vi-VN")}</Text>
          {receiptDraft.transactionRequest.note ? <Text style={styles.receiptHint}>{receiptDraft.transactionRequest.note}</Text> : null}
        </View> : <>
        <FieldLabel>Số tiền</FieldLabel><View style={styles.amountBox}><TextInput money accessibilityLabel="Số tiền giao dịch" keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.amountInput} value={amount} onChangeText={setAmount} /><Text style={styles.currency}>VND</Text></View>
        <FieldLabel>Nội dung</FieldLabel><TextInput accessibilityLabel="Nội dung giao dịch" placeholder="Ví dụ: Ăn trưa" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />

        <FieldLabel>Tài khoản</FieldLabel>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {accounts.map((account) => (
            <ChoiceChip checked={selectedAccountId === account.id} key={account.id} label={account.name} onPress={() => setAccountId(account.id)} />
          ))}
        </View>

        <View style={styles.labelRow}><Text style={styles.label}>Danh mục</Text><Pressable accessibilityRole="link" onPress={() => router.push(routes.categories)}><Text style={styles.manage}>Quản lý</Text></Pressable></View>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {availableCategories.map((category) => (
            <ChoiceChip checked={selectedCategoryId === category.id} key={category.id} label={category.name} onPress={() => setCategoryId(category.id)} />
          ))}
          {availableCategories.length === 0 && <Text style={styles.empty}>Chưa có danh mục phù hợp.</Text>}
        </View>

        <FieldLabel>Ghi chú</FieldLabel><TextInput accessibilityLabel="Ghi chú giao dịch, không bắt buộc" multiline numberOfLines={3} placeholder="Không bắt buộc" placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={note} onChangeText={setNote} />
        </>}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        <PrimaryAction busy={busy} disabled={loadingDraft} label={receiptDraft?.transactionRequest ? "Thử lại yêu cầu cũ" : "Lưu giao dịch"} onPress={() => void submit()} />
        </Surface>
    </PicketScreen>
  );
}

const styles = StyleSheet.create({
  appBar: { justifyContent: "center", minHeight: 52 },
  back: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18, marginTop: 7 },
  segment: { backgroundColor: colors.white, borderRadius: radii.medium, flexDirection: "row", marginBottom: 14, padding: 4 },
  segmentItem: { alignItems: "center", borderRadius: 8, flex: 1, padding: 11 },
  segmentSelected: { backgroundColor: colors.mauve },
  segmentText: { color: colors.ink, fontWeight: "700" },
  segmentTextSelected: { color: colors.white },
  receiptCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.small, flexDirection: "row", gap: 12, padding: 10 },
  receiptImage: { backgroundColor: colors.cream, borderRadius: 8, height: 64, width: 48 },
  receiptCopy: { flex: 1 },
  receiptTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  receiptHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  form: { marginTop: 0 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 },
  amountBox: { alignItems: "center", borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, flexDirection: "row", minHeight: 58, paddingHorizontal: 16 },
  amountInput: { color: colors.mauve, flex: 1, fontSize: 36, fontWeight: "700", fontVariant: ["tabular-nums"], minHeight: 76 },
  currency: { color: colors.mauve, fontSize: 14, fontWeight: "700" },
  note: { minHeight: 88, paddingTop: 14, textAlignVertical: "top" },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: 2 },
  labelRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  manage: { color: colors.mauve, fontSize: 13, fontWeight: "700" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  selected: { backgroundColor: colors.mauve, borderColor: colors.mauve },
  choiceText: { color: colors.ink, fontWeight: "700" },
  selectedText: { color: colors.white },
  empty: { color: colors.muted, fontSize: 13 },
  error: { color: colors.expense, fontSize: 14 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", marginTop: 8, minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
});
