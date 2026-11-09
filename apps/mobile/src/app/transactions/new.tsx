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
import { CategoryPickerSheet, WalletPickerSheet } from "@/core/ui/picker-sheets";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { figmaType } from "@picket/design-tokens";
import { categoryTile } from "@/features/home/home-recent";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { AmountPaper, ChildBar, ErrorLine, FigmaScreen, FormRow, HeadingPair, NoticeCard, PaperCard, heroAmount } from "@/features/transactions/figma-parts";
import { AppIcon } from "@/core/ui/app-icon";
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
  const copy = useFigmaCopy();
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
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [pickWallet, setPickWallet] = useState(false);
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

  const wallet = accounts.find((account) => account.id === selectedAccountId);
  const noWallet = accounts.length === 0;
  const shownCategories = effectiveCategories.slice(0, 3);
  const parsedAmountNow = Number.parseInt(amount, 10);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const duplicate = receiptDraft || !Number.isSafeInteger(parsedAmountNow) || parsedAmountNow <= 0 ? null
    : transactions.find((item) => item.kind === kind && item.amount === parsedAmountNow && Date.parse(item.occurredAt) >= dayStart.getTime()) ?? null;
  const today = new Date();
  const dateText = `${today.getDate()}/${today.getMonth() + 1}`;
  const signColor = kind === "expense" ? colors.expense : colors.income;
  const cta = receiptDraft?.transactionRequest ? tx("Thử lại yêu cầu cũ") : noWallet && !localMode ? copy("createWalletFirst") : copy("save");
  const onCta = () => { if (noWallet && !localMode && !receiptDraft) router.push(routes.newAccount); else void submit(); };

  return (
    <FigmaScreen footer={<>
      <FigmaButton fullWidth icon="check" busy={busy} disabled={loadingDraft} label={cta} onPress={onCta} />
      {!localMode && receiptDraft?.transactionRequest && !receiptDraft.transactionId && (
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void recoverReceiptAttempt()} style={{ marginTop: 8, alignItems: "center" }}>
          <Text style={styles.manageCategoryLink}>{tx("Kiểm tra để sửa yêu cầu")}</Text>
        </Pressable>
      )}
    </>}>
      <ChildBar title={copy("addTitle")} />

      {loadingDraft && <ActivityIndicator accessibilityLabel={tx("Đang tải bản nháp hóa đơn")} color={colors.primary} />}

      {receiptDraft && (
        <View style={styles.receiptCard}>
          <Image accessibilityLabel={tx("Ảnh hóa đơn của giao dịch mới")} source={{ uri: receiptDraft.imageUri }} style={styles.receiptImage} />
          <View style={styles.receiptCopy}>
            <Text style={styles.receiptTitle}>{tx("Có đính kèm hóa đơn")}</Text>
            <Text style={styles.receiptHint}>
              {tx("Ảnh chỉ được tải lên khi bạn bấm Lưu giao dịch.")}
              {receiptDraft.lineItems.length > 0 ? tx("receiptItems", { count: receiptDraft.lineItems.length }) : tx(" Không có dòng sản phẩm đủ tin cậy; bạn có thể thêm sau.")}
            </Text>
          </View>
        </View>
      )}

      {!receiptDraft?.transactionRequest && (
        <View accessibilityRole="radiogroup" style={styles.segment}>
          {([["expense", copy("expense")], ["income", copy("incomeKind")]] as const).map(([value, label]) => (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: kind === value }} onPress={() => { setKind(value); setCategoryId(""); }} style={[styles.segmentPill, kind === value && styles.segmentPillSelected]}>
              <Text style={[styles.segmentText, kind === value && styles.segmentTextSelected]}>{label}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => router.push(routes.newTransfer)} style={styles.segmentPill}>
            <Text style={styles.segmentText}>{copy("transfer")}</Text>
          </Pressable>
        </View>
      )}

      <View>
        <View accessible={false} style={styles.stub}>
          <Text style={[figmaType.overline, { color: colors.text }]}>{copy("stubToday", { date: dateText }).toUpperCase()}</Text>
          {wallet ? <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{wallet.name}</Text> : null}
        </View>
        <View style={{ marginTop: -26 }}>
          <AmountPaper overline={copy("amountOverline")} footer={receiptDraft?.transactionRequest ? undefined : (
            <View style={styles.noteLine}>
              <AppIcon name="pencil-outline" size={14} color={colors.muted} />
              <TextInput accessibilityLabel={tx("Nội dung giao dịch")} borderless placeholder={tx("Ví dụ: Ăn trưa")} placeholderTextColor={colors.muted} style={styles.titleInput} value={title} onChangeText={setTitle} />
            </View>
          )}>
            {receiptDraft?.transactionRequest ? (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Text style={[heroAmount, { color: colors.text }]}>{money(receiptDraft.transactionRequest.amount)}</Text>
                <Text style={styles.receiptHint}>{tx("Thử lại sẽ giữ nguyên ví, danh mục, thời gian và số tiền để không tạo giao dịch trùng. Hoàn tất yêu cầu này trước khi sửa giao dịch.")}</Text>
                <Text style={styles.receiptHint}>{accounts.find((account) => account.id === receiptDraft.transactionRequest?.accountId)?.name ?? tx("Ví của yêu cầu gốc")} · {receiptDraft.transactionRequest.kind === "expense" ? tx("Khoản chi") : tx("Khoản thu")}</Text>
              </View>
            ) : (
              <View style={styles.amountRow}>
                <TextInput money borderless accessibilityLabel={tx("Số tiền giao dịch")} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: amount ? colors.text : colors.muted }]} value={amount} onChangeText={setAmount} />
                <Text style={[heroAmount, { color: signColor, textDecorationLine: "underline" }]}>₫</Text>
              </View>
            )}
          </AmountPaper>
        </View>
      </View>

      {duplicate && (
        <NoticeCard title={copy("dupTitle")} body={`${duplicate.title} · ${money(duplicate.amount)} · ${new Date(duplicate.occurredAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`} action={copy("dupView")} onAction={() => router.push(routes.transaction(duplicate.id))} />
      )}

      {message && <ErrorLine>{tx(message)}</ErrorLine>}

      {!receiptDraft?.transactionRequest && (
        <View style={{ gap: 12 }}>
          <HeadingPair overline={copy("categoryOverline")} title={copy("categoryTitle")} />
          <View style={styles.categoryGrid}>
            {shownCategories.map((category) => {
              const selected = selectedCategoryId === category.id;
              const tile = categoryTile(category.icon, category.name, kind === "income", colors);
              return (
                <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={category.name} onPress={() => setCategoryId(category.id)} style={styles.categoryCell}>
                  <View style={[styles.categoryTile, selected && { backgroundColor: tile.color, borderColor: colors.primary, borderWidth: 1.5 }]}><AppIcon name={tile.name} size={22} color={colors.text} /></View>
                  <Text numberOfLines={1} style={[styles.categoryName, selected && { fontWeight: "800", color: colors.primary }]}>{category.name}</Text>
                </Pressable>
              );
            })}
            {effectiveCategories.length > 3 && (
              <Pressable accessibilityRole="button" onPress={() => setShowAllCategories(true)} style={styles.categoryCell}>
                <View style={styles.categoryTile}><AppIcon name="dots-horizontal" size={22} color={colors.text} /></View>
                <Text numberOfLines={1} style={styles.categoryName}>{copy("more")}</Text>
              </Pressable>
            )}
          </View>
          <Pressable accessibilityRole="link" onPress={() => router.push(routes.categories)}><Text style={styles.manageCategoryLink}>{tx("Quản lý")}</Text></Pressable>
          <CategoryPickerSheet visible={showAllCategories} title={copy("categoryPickTitle")} searchPlaceholder={copy("categorySearch")} closeLabel={copy("close")} selectedId={selectedCategoryId}
            options={effectiveCategories.map((item) => { const tile = categoryTile(item.icon, item.name, kind === "income", colors); return { id: item.id, name: item.name, icon: tile.name, tint: tile.color }; })}
            onSelect={(id) => { setCategoryId(id); setShowAllCategories(false); }} onClose={() => setShowAllCategories(false)} />
        </View>
      )}

      <PaperCard>
        <FormRow icon="wallet-outline" label={copy("rowWallet")} value={wallet?.name ?? copy("noWallet")} tone={noWallet ? "warning" : undefined} onPress={noWallet ? () => router.push(routes.newAccount) : accounts.length > 1 ? () => setPickWallet(!pickWallet) : undefined} />
        <WalletPickerSheet visible={pickWallet} title={copy("walletPickTitle")} closeLabel={copy("close")} selectedId={selectedAccountId}
          options={accounts.map((account) => ({ id: account.id, name: account.name }))} onSelect={(id) => { setAccountId(id); setPickWallet(false); }} onClose={() => setPickWallet(false)} />
        <FormRow icon="calendar-month-outline" label={copy("rowDate")} value={`${tx("Hôm nay")}, ${today.toLocaleDateString(locale)}`} />
        {!receiptDraft?.transactionRequest ? (
          <FormRow icon="pencil-outline" label={copy("rowNote")} last={!receiptDraft}>
            <TextInput accessibilityLabel={copy("rowNote")} borderless placeholder={copy("notePlaceholder")} placeholderTextColor={colors.muted} style={styles.noteInput} value={note} onChangeText={setNote} />
          </FormRow>
        ) : null}
        {receiptDraft ? <FormRow icon="camera-outline" label={tx("Ảnh hóa đơn đính kèm")} value={tx("Có đính kèm hóa đơn")} last /> : null}
      </PaperCard>
    </FigmaScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    segment: { backgroundColor: colors.elevated, borderRadius: 24, flexDirection: "row", padding: 4, gap: 4 },
    segmentPill: { flex: 1, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    segmentPillSelected: { backgroundColor: colors.paper, ...figmaShadow("stub") },
    segmentText: { ...figmaType.button, color: colors.muted },
    segmentTextSelected: { color: colors.text },
    stub: { alignSelf: "flex-end", backgroundColor: colors.paper, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 32, borderRadius: 4, width: 150, transform: [{ rotate: "3deg" }], marginRight: 4, ...figmaShadow("stub") },
    noteLine: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4, alignSelf: "stretch", justifyContent: "center" },
    titleInput: { ...figmaType.bodySmall, color: colors.muted, minWidth: 140, paddingVertical: 2, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0, textAlign: "center" },
    amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    amountInput: { ...heroAmount, minWidth: 80, textAlign: "center", paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    categoryCell: { width: "22%", alignItems: "center", gap: 6 },
    categoryTile: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
    categoryName: { ...figmaType.bodySmall, color: colors.text },
    noteInput: { fontSize: 15, lineHeight: 22, fontWeight: "800", color: colors.text, padding: 0, minHeight: 24, backgroundColor: "transparent", borderWidth: 0 },
    manageCategoryLink: { ...figmaType.button, color: colors.primary },
    receiptCard: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.paper, ...figmaShadow("paper") },
    receiptImage: { width: 56, height: 72, borderRadius: 8, backgroundColor: colors.elevated },
    receiptCopy: { flex: 1, gap: 2 },
    receiptTitle: { ...figmaType.bodyStrong, color: colors.text },
    receiptHint: { ...figmaType.bodySmall, color: colors.muted, textAlign: "center" },
  });
