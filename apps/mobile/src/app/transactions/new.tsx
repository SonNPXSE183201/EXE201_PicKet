import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useTransactionCopy, type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { MAX_MONEY, type TransactionKind } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, Image, StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { completeDuplicateCapture } from "@/core/receipts/duplicate-capture-completion";
import { receiptRequestTextError } from "@/core/receipts/receipt-request-journal";
import { durableReceiptStoragePath } from "@/core/receipts/receipt-storage-policy";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, PicketScreen, PrimaryAction, TopAppBar } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";
import { picketApi } from "@/core/api/client";
import {
  getPendingReceiptDraft,
  pinPendingReceiptRequest,
  resetPendingReceiptAttempt,
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
import { canAttachReceipt } from "@/core/ocr/receipt-eligibility";

type BasicTransactionKind = Extract<TransactionKind, "expense" | "income">;

export default function NewTransactionScreen() {
  const { tx, locale, money } = useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const owner = session?.user.id ?? (localMode ? guestOwnerId : null);
  const { accounts, create: createAccount } = useAccounts();
  const { categories, create, refresh, transactions } = useTransactions();
  const params = useLocalSearchParams<{
    kind?: string;
    accountId?: string;
    title?: string;
    amount?: string;
    receiptDraftId?: string;
    occurredAt?: string;
    fromCapture?: string;
    captureDraftId?: string;
  }>();
  const [kind, setKind] = useState<BasicTransactionKind>(params.kind === "income" ? "income" : "expense");
  const [accountId, setAccountId] = useState(params.accountId ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState(params.title ?? "");
  const [amount, setAmount] = useState(params.amount ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
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
          setTitle(original?.title ?? draft.merchant);
          setAmount(String(original?.amount ?? draft.amount));
          if (original) {
            setKind(original.kind);
            setAccountId(original.accountId);
            setCategoryId(original.categoryId ?? "");
            setNote(original.note ?? "");
          }
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

  const effectiveCategories = useMemo(
    () => categories.filter((item) => item.kind === kind || item.kind === "both"),
    [categories, kind],
  );
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedCategoryId = effectiveCategories.some((item) => item.id === categoryId)
    ? categoryId
    : effectiveCategories[0]?.id ?? "";

  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function recoverReceiptAttempt() {
    if (busy || !receiptDraft?.transactionRequest || receiptDraft.transactionId || !session || !picketApi || localMode) return;
    setBusy(true);
    setMessage(null);
    try {
      const resolution = await picketApi.resolveTransactionAttempt(
        session.access_token,
        `${session.user.id}:${receiptDraft.transactionAttemptId ?? receiptDraft.id}`,
      );
      if (resolution.status === "abandoned") {
        setReceiptDraft(await resetPendingReceiptAttempt(receiptDraft));
        setMessage("Yêu cầu cũ đã được khóa an toàn. Bạn có thể sửa thông tin rồi lưu lại; ảnh hóa đơn được giữ nguyên.");
      } else {
        const next = await updatePendingReceiptProgress(receiptDraft, { transactionId: resolution.transaction.id });
        setReceiptDraft(next);
        setMessage("Giao dịch đã được lưu. Nhấn thử lại để hoàn tất gắn ảnh hóa đơn, không tạo thêm giao dịch.");
      }
    } catch {
      setMessage("Chưa xác minh được yêu cầu cũ. Bản nháp vẫn được giữ nguyên; kết nối mạng rồi kiểm tra lại trước khi sửa.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (loadingDraft || busy) return;
    if (params.receiptDraftId && !receiptDraft) return setMessage("Không đọc được bản nháp ảnh. Hãy quay lại bước quét; giao dịch chưa được tạo.");
    if (receiptDraft && !receiptDraft.transactionId && !canAttachReceipt(receiptDraft)) return setMessage("Ảnh chưa được nhận diện là hóa đơn hợp lệ. Hãy quay lại chụp hoặc chọn ảnh khác.");
    const parsedAmount = Number.parseInt(amount, 10);
    let targetAccountId = selectedAccountId;
    if (!targetAccountId && !receiptDraft?.transactionRequest) {
      if (localMode || !session) {
        try {
          const createdAcc = await createAccount({
            currencyCode: "VND",
            kind: "cash",
            name: "Ví tiền mặt",
            openingBalance: 0,
          });
          targetAccountId = createdAcc.id;
        } catch {
          // fallback
        }
      }
      if (!targetAccountId) return setMessage("Hãy tạo hoặc chọn một tài khoản.");
    }
    if (!title.trim()) return setMessage("Hãy nhập nội dung giao dịch.");
    const textError = receiptRequestTextError(title.trim(), note.trim());
    if (textError) return setMessage(textError);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_MONEY) {
      return setMessage("Số tiền phải là số nguyên từ 1 đến 9.000.000.000.000 VND.");
    }
    const targetCategoryId = selectedCategoryId;
    setBusy(true);
    setMessage(null);
    try {
      let request = receiptDraft?.transactionRequest ?? {
        accountId: targetAccountId,
        amount: parsedAmount,
        categoryId: targetCategoryId || null,
        kind,
        note: note.trim(),
        occurredAt:
          receiptDraft?.purchasedAt ??
          (params.occurredAt && Number.isFinite(Date.parse(params.occurredAt)) ? params.occurredAt : new Date().toISOString()),
        title: title.trim(),
      };
      if (!receiptDraft) {
        await create(request);
        if (params.captureDraftId) await captureJournal.complete(session?.user.id ?? guestOwnerId, params.captureDraftId).catch(() => undefined);
        if (router.canDismiss()) {
          router.dismissTo(params.fromCapture ? routes.home : routes.transactions);
        } else {
          router.replace(params.fromCapture ? routes.home : routes.transactions);
        }
        return;
      }
      if (localMode) {
        let draft: PendingReceiptDraft = await pinPendingReceiptRequest(receiptDraft, request);
        request = draft.transactionRequest!;
        setReceiptDraft(draft);
        const image = await inspectReceiptImage(draft.imageUri);
        if (draft.transactionId && !transactions.some((item) => item.id === draft.transactionId)) {
          throw new Error("Không tìm thấy giao dịch của bản nháp hóa đơn.");
        }
        const created = await create(request, draft.transactionId ?? draft.id);
        if (!draft.transactionId) {
          draft = await updatePendingReceiptProgress(draft, { transactionId: created.id });
          setReceiptDraft(draft);
        }
        await saveGuestReceipt(
          makeGuestReceipt({
            transactionId: draft.transactionId!,
            imageBase64: fromByteArray(new Uint8Array(image.bytes)),
            contentType: image.contentType,
            merchant: request.title,
            amount: request.amount,
            purchasedAt: request.occurredAt,
            rawText: draft.rawText,
            lineItems: draft.lineItems,
          }),
        );
        await removePendingReceiptDraft(draft);
        if (params.captureDraftId) await captureJournal.complete(guestOwnerId, params.captureDraftId).catch(() => undefined);
        finishReceiptFlow(router, {
          transactionId: draft.transactionId!,
          month: calendarReceiptDay({ purchasedAt: draft.purchasedAt }, request.occurredAt)!.slice(0, 7),
        });
        return;
      }
      if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");

      const image = await inspectReceiptImage(receiptDraft.imageUri);
      const duplicateResult = await picketApi.findDuplicateReceipts(session.access_token, {
        imageSha256: image.sha256,
        merchant: request.title,
        purchasedAt: receiptDraft.purchasedAt,
        total: request.amount,
      });
      if (duplicateResult.duplicates.length > 0) {
        const duplicate = duplicateResult.duplicates[0];
        const shouldContinue = await new Promise<boolean>((resolve) => {
          const exact = duplicate.matchType === "exact_hash";
          Alert.alert(
            exact ? tx("Hóa đơn này đã được lưu") : tx("Có thể trùng hóa đơn"),
            exact
              ? tx("Ảnh giống hệt một hóa đơn đã có. Bạn có thể mở bản đã lưu.")
              : tx("Có hóa đơn cùng cửa hàng, ngày và tổng tiền. Hãy kiểm tra trước khi lưu thêm."),
            [
              { text: tx("Hủy"), style: "cancel", onPress: () => resolve(false) },
              {
                text: tx("Xem hóa đơn"),
                onPress: () => {
                  void (async () => {
                    try {
                      await completeDuplicateCapture(
                        {
                          exact,
                          owner: session.user.id,
                          receiptOwner: receiptDraft.userId,
                          captureId: params.captureDraftId,
                        },
                        {
                          complete: (owner, id) => captureJournal.complete(owner, id),
                          remove: () => removePendingReceiptDraft(receiptDraft),
                        },
                      );
                      router.dismissTo(routes.home);
                      router.push(routes.receipt(duplicate.id));
                    } catch {
                      setMessage("Chưa dọn được bản nháp. Hóa đơn đã lưu vẫn an toàn; hãy thử mở lại.");
                    } finally {
                      resolve(false);
                    }
                  })();
                },
              },
              ...(!exact ? [{ text: tx("Vẫn lưu"), onPress: () => resolve(true) }] : []),
            ],
            { cancelable: false },
          );
        });
        if (!shouldContinue) return;
      }

      let draft: PendingReceiptDraft = await pinPendingReceiptRequest(receiptDraft, request);
      request = draft.transactionRequest!;
      setReceiptDraft(draft);
      if (!durableReceiptStoragePath(session.user.id, draft.storagePath)) {
        const storagePath = await uploadReceiptImage({
          userId: session.user.id,
          receiptId: draft.id,
          sha256: image.sha256,
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
          `${session.user.id}:${draft.transactionAttemptId ?? draft.id}`,
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
      finishReceiptFlow(router, {
        receiptId: receipt.receipt.id,
        transactionId: draft.transactionId!,
        month: calendarReceiptDay({ purchasedAt: draft.purchasedAt }, request.occurredAt)!.slice(0, 7),
      });
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage(
        receiptDraft
          ? localMode
            ? "Chưa hoàn tất lưu ảnh hóa đơn. Bản nháp vẫn trên thiết bị; hãy thử lại."
            : "Chưa hoàn tất lưu hóa đơn. Bản nháp vẫn an toàn trên thiết bị; hãy kết nối mạng và thử lại."
          : "Không lưu được giao dịch. Hãy kiểm tra kết nối và thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PicketScreen>
      <TopAppBar title={tx("Thêm giao dịch")} subtitle={tx("Ghi lại khoản thu hoặc chi của bạn.")} />

      {loadingDraft && <ActivityIndicator accessibilityLabel={tx("Đang tải bản nháp hóa đơn")} color={colors.link} />}

      {receiptDraft && (
        <View style={styles.receiptCard}>
          <Image accessibilityLabel={tx("Ảnh hóa đơn của giao dịch mới")} source={{ uri: receiptDraft.imageUri }} style={styles.receiptImage} />
          <View style={styles.receiptCopy}>
            <Text style={styles.receiptTitle}>{tx("Có đính kèm hóa đơn")}</Text>
            <Text style={styles.receiptHint}>
              {tx("Ảnh chỉ được tải lên khi bạn bấm Lưu giao dịch.")}
              {receiptDraft.lineItems.length > 0
                ? tx("receiptItems", { count: receiptDraft.lineItems.length })
                : tx(" Không có dòng sản phẩm đủ tin cậy; bạn có thể thêm sau.")}
            </Text>
          </View>
        </View>
      )}

      {/* Segment Pills: Chi tiêu / Thu nhập / Chuyển ví matching screen_09 */}
      {!receiptDraft?.transactionRequest && (
        <View accessibilityRole="radiogroup" style={styles.segment}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: kind === "expense" }}
            onPress={() => {
              setKind("expense");
              setCategoryId("");
            }}
            style={styles.segmentPressable}
          >
            <View style={[styles.segmentPill, kind === "expense" && styles.segmentPillSelected]}>
              <Text style={[styles.segmentText, kind === "expense" && styles.segmentTextSelected]}>
                {tx("Khoản chi")}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: kind === "income" }}
            onPress={() => {
              setKind("income");
              setCategoryId("");
            }}
            style={styles.segmentPressable}
          >
            <View style={[styles.segmentPill, kind === "income" && styles.segmentPillSelected]}>
              <Text style={[styles.segmentText, kind === "income" && styles.segmentTextSelected]}>
                {tx("Khoản thu")}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.newTransfer)}
            style={styles.segmentPressable}
          >
            <View style={styles.segmentPill}>
              <Text style={styles.segmentText}>{tx("Chuyển ví")}</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Hero Amount Card matching screen_09 */}
      {receiptDraft?.transactionRequest ? (
        <View style={styles.heroAmountCard}>
          <Text style={styles.heroAmountLabel}>{tx("Yêu cầu gốc đã được lưu an toàn")}</Text>
          <Text style={styles.receiptHint}>
            {tx("Thử lại sẽ giữ nguyên ví, danh mục, thời gian và số tiền để không tạo giao dịch trùng. Hoàn tất yêu cầu này trước khi sửa giao dịch.")}
          </Text>
          <Text style={styles.heroAmountValue}>{money(receiptDraft.transactionRequest.amount)}</Text>
          <Text style={styles.receiptHint}>
            {accounts.find((account) => account.id === receiptDraft.transactionRequest?.accountId)?.name ?? tx("Ví của yêu cầu gốc")} ·{" "}
            {receiptDraft.transactionRequest.kind === "expense" ? tx("Khoản chi") : tx("Khoản thu")}
          </Text>
        </View>
      ) : (
        <View style={styles.heroAmountCard}>
          <Text style={styles.heroAmountLabel}>{tx("Số tiền giao dịch (VND):")}</Text>
          <View style={styles.amountInputRow}>
            <Text
              style={[
                styles.amountSignText,
                { color: kind === "expense" ? colors.expense : colors.income },
              ]}
            >
              {kind === "expense" ? "−" : "+"}
            </Text>
            <TextInput
              money
              borderless
              accessibilityLabel={tx("Số tiền giao dịch")}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              style={[
                styles.amountInputField,
                { color: kind === "expense" ? colors.expense : colors.income },
              ]}
              value={amount}
              onChangeText={setAmount}
            />
            <Text
              style={[
                styles.amountCurrencyText,
                { color: kind === "expense" ? colors.expense : colors.income },
              ]}
            >
              {"đ"}
            </Text>
          </View>
        </View>
      )}

      {/* 4x2 Category Grid matching screen_09 */}
      {!receiptDraft?.transactionRequest && (
        <View style={styles.categorySection}>
          <View style={styles.categoryHeaderRow}>
            <Text style={styles.categorySectionTitle}>{tx("CHỌN DANH MỤC")}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push(routes.categories)}>
              <Text style={styles.manageCategoryLink}>{tx("Quản lý")}</Text>
            </Pressable>
          </View>

          <View style={styles.categoryGrid}>
            {effectiveCategories.slice(0, 8).map((category) => {
              const isSelected = selectedCategoryId === category.id;
              const artId = categoryArt(category.icon, category.name);
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.categoryTile, isSelected && styles.categoryTileSelected]}
                >
                  <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapSelected]}>
                    <PaperArt id={artId} style={{ width: 30, height: 30 }} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.categoryTileName, isSelected && styles.categoryTileNameSelected]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Grouped Details Card matching screen_09 */}
      <View style={styles.groupedCard}>
        {/* Row 1: Tài khoản / Ví thanh toán */}
        <View style={styles.groupedRow}>
          <View style={styles.rowIconBadge}>
            <AppIcon name="wallet-outline" size={18} color={colors.mauve} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabelText}>{tx("Ví / tài khoản thanh toán")}</Text>
            {accounts.length === 0 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push(routes.newAccount)}>
                <Text style={styles.manageCategoryLink}>{tx("Tạo ví đầu tiên")}</Text>
              </Pressable>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountChipsRow}>
                {accounts.map((account) => (
                  <ChoiceChip
                    checked={selectedAccountId === account.id}
                    key={account.id}
                    label={account.name}
                    onPress={() => setAccountId(account.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Row 2: Ngày giao dịch */}
        <View style={styles.groupedRow}>
          <View style={styles.rowIconBadge}>
            <AppIcon name="calendar-month-outline" size={18} color={colors.mauve} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabelText}>{tx("Ngày giao dịch")}</Text>
            <Text style={styles.rowValueText}>
              {tx("Hôm nay")}, {new Date().toLocaleDateString(locale)}
            </Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Row 3: Nội dung giao dịch */}
        <View style={styles.groupedRow}>
          <View style={styles.rowIconBadge}>
            <AppIcon name="note-text-outline" size={18} color={colors.mauve} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rowLabelText}>{tx("Nội dung giao dịch")}</Text>
            <TextInput
              accessibilityLabel={tx("Nội dung giao dịch")}
              placeholder={tx("Ví dụ: Ăn trưa")}
              placeholderTextColor={colors.muted}
              style={styles.detailInput}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Row 4: Ảnh hóa đơn đính kèm */}
        <View style={styles.groupedRow}>
          <View style={styles.rowIconBadge}>
            <AppIcon name="camera-outline" size={18} color={colors.mauve} />
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.rowLabelText}>{tx("Ảnh hóa đơn đính kèm")}</Text>
            <Text style={styles.rowHintText}>
              {receiptDraft ? tx("Có đính kèm hóa đơn") : tx("Chưa đính kèm")}
            </Text>
          </View>
        </View>
      </View>

      {message && (
        <Text accessibilityLiveRegion="polite" role="alert" style={styles.errorText}>
          {tx(message)}
        </Text>
      )}

      {/* Solid Plum Pill CTA matching screen_09 */}
      <View style={{ marginTop: 16, marginBottom: 24 }}>
        <PrimaryAction
          busy={busy}
          disabled={loadingDraft}
          label={receiptDraft?.transactionRequest ? tx("Thử lại yêu cầu cũ") : tx("Lưu giao dịch")}
          onPress={() => void submit()}
        />
        {!localMode && receiptDraft?.transactionRequest && !receiptDraft.transactionId && (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void recoverReceiptAttempt()} style={{ marginTop: 8 }}>
            <Text style={styles.manageCategoryLink}>{tx("Kiểm tra để sửa yêu cầu")}</Text>
          </Pressable>
        )}
      </View>
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    segment: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      marginBottom: 14,
      padding: 4,
      alignItems: "center",
      justifyContent: "space-between",
    },
    segmentPressable: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentPill: {
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      overflow: "hidden",
    },
    segmentPillSelected: {
      backgroundColor: colors.mauve,
      borderRadius: 16,
      overflow: "hidden",
    },
    segmentText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "600",
    },
    segmentTextSelected: {
      color: colors.onPrimary,
      fontWeight: "700",
    },
    receiptCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      gap: 12,
      padding: 10,
      marginBottom: 12,
    },
    receiptImage: {
      backgroundColor: colors.cream,
      borderRadius: 8,
      height: 60,
      width: 46,
    },
    receiptCopy: { flex: 1 },
    receiptTitle: { color: colors.ink, fontSize: 13, fontWeight: "700" },
    receiptHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },

    /* Hero Amount Card */
    heroAmountCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      paddingHorizontal: 18,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    heroAmountLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.2,
      marginBottom: 6,
    },
    amountInputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    amountSignText: {
      fontSize: 32,
      fontWeight: "800",
      marginRight: 4,
    },
    amountInputField: {
      flex: 1,
      fontSize: 32,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      minHeight: 48,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    amountCurrencyText: {
      fontSize: 22,
      fontWeight: "700",
      marginLeft: 4,
    },
    heroAmountValue: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.ink,
      fontVariant: ["tabular-nums"],
      marginVertical: 4,
    },

    /* Category Section & Grid */
    categorySection: {
      marginBottom: 14,
    },
    categoryHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    categorySectionTitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    manageCategoryLink: {
      color: colors.mauve,
      fontSize: 13,
      fontWeight: "700",
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-start",
    },
    categoryTile: {
      width: "23%",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    categoryTileSelected: {
      borderColor: colors.mauve,
      borderWidth: 1.5,
      backgroundColor: colors.pocketLilac,
    },
    categoryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cream,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryIconWrapSelected: {
      backgroundColor: colors.surface,
    },
    categoryTileName: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "center",
    },
    categoryTileNameSelected: {
      color: colors.mauve,
      fontWeight: "700",
    },

    /* Grouped Details Card */
    groupedCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    groupedRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
    },
    rowIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.cream,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabelText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "600",
    },
    rowValueText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    rowHintText: {
      color: colors.muted,
      fontSize: 12,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 60,
    },
    accountChipsRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 6,
    },
    detailInput: {
      backgroundColor: colors.cream,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 13,
      color: colors.ink,
      minHeight: 36,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      marginTop: 6,
    },
  });
