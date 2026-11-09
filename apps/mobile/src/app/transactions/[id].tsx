import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Image, Modal, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { getGuestReceipt } from "@/core/receipts/guest-receipt-store";
import { loadCloudReceiptImage } from "@/core/receipts/cloud-receipt-gallery";
import { recallReceipt, recallTransactionReceipt, rememberReceipt } from "@/core/receipts/receipt-memory";
import { MAX_RECEIPT_LINES, blankReceiptLine, editableReceiptLines, parseReceiptLines, receiptLinesChanged, receiptLinesTotal, updateReceiptLine, type EditableReceiptLine } from "@/core/receipts/receipt-line-edit";
import { ReceiptImageViewer, shareableReceiptUri } from "@/core/ui/receipt-image-viewer";
import * as Sharing from "expo-sharing";
import type { ReceiptRecord } from "@picket/domain";
import type { GuestReceipt } from "@/core/receipts/guest-receipt-model";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ActionSheet, IconButton, MenuRow, Surface } from "@/core/ui/picket-ui";
import { Chip, FigmaButton, ReceiptDivider, ReceiptSheet, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { CategoryPickerSheet } from "@/core/ui/picker-sheets";
import { PaperArt } from "@/core/ui/paper-art";
import { AppIcon } from "@/core/ui/app-icon";
import { figmaType } from "@picket/design-tokens";
import { categoryTile } from "@/features/home/home-recent";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useProfile } from "@/features/profile/profile-context";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { ChildBar, ErrorLine, FigmaScreen, FormRow, PaperCard } from "@/features/transactions/figma-parts";
import { dayLabel, dayKeyAt, signedAmount } from "@/features/transactions/spending-list";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { buildTransactionEditRequest } from "@/features/transactions/transaction-edit-request";

export default function TransactionDetailScreen() {
  const {tx,money,locale}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { archive, categories, loading, transactions, update } = useTransactions();
  const copy = useFigmaCopy();
  const { accounts } = useAccounts();
  const { profile } = useProfile();
  const transaction = transactions.find((item) => item.id === id);
  const [title, setTitle] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [lineDraft, setLineDraft] = useState<EditableReceiptLine[] | null>(null);
  const [lineBase, setLineBase] = useState<EditableReceiptLine[]>([]);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(() => (session && id ? recallTransactionReceipt(session.user.id, id)?.id ?? null : null));
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pickCategory, setPickCategory] = useState(false);
  const [guestReceipt, setGuestReceipt] = useState<GuestReceipt | null>(null);
  const [cloudImage, setCloudImage] = useState<string | null>(null);
  const [cloudReceipt, setCloudReceipt] = useState<ReceiptRecord | null>(() => (session && id ? recallTransactionReceipt(session.user.id, id) : null));
  const [ocrOpen, setOcrOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

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
      // Server-side lookup by transaction: older receipts beyond the newest
      // 50 are found too (an older API ignores the filter; the client still
      // matches by transaction id).
      .findReceiptByTransaction(session.access_token, id, controller.signal)
      .then((found) => {
        if (!active) return;
        if (found) rememberReceipt(session.user.id, found);
        if (found) setCloudReceipt((current) => current?.id === found.id && current.lineItems ? current : found);
        setReceiptId(found?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, session]);

  // The saved photo and OCR text live on the receipt row; show them here
  // instead of a placeholder so a reopened transaction still has its receipt.
  const owner = session?.user.id;
  useEffect(() => {
    if (!session || !owner || !receiptId || !picketApi) return;
    let active = true;
    const controller = new AbortController();
    // Photo first (path is known from the list or memory), then the full
    // receipt with its line items for the D5 paper card.
    const known = recallReceipt(owner, receiptId);
    const showImage = (path: string) => {
      void loadCloudReceiptImage(owner, path, controller.signal).then((uri) => { if (active && uri) setCloudImage(uri); });
    };
    if (known?.storagePath) showImage(known.storagePath);
    void picketApi.getReceipt(session.access_token, receiptId, controller.signal)
      .then(({ receipt }) => {
        if (!active) return;
        rememberReceipt(owner, receipt);
        setCloudReceipt(receipt);
        if (receipt.storagePath && receipt.storagePath !== known?.storagePath) showImage(receipt.storagePath);
      })
      .catch(() => undefined);
    return () => { active = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read only when the owner or receipt changes
  }, [owner, receiptId]);

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

  function beginEdit() {
    // Cloud receipt lines are edited together with the transaction (one D5 screen).
    if (cloudReceipt?.lineItems) {
      const lines = editableReceiptLines(cloudReceipt.lineItems);
      setLineBase(lines);
      setLineDraft(lines);
    } else {
      setLineDraft(null);
    }
    setEditing(true);
  }

  function endEdit() {
    setEditing(false); setTitle(null); setAmount(null); setNote(null); setCategoryId(undefined); setLineDraft(null); setMessage(null);
  }

  async function save() {
    if (!currentTitle.trim()) return setMessage("Hãy nhập nội dung giao dịch.");
    let request;
    try { request = buildTransactionEditRequest({ title:currentTitle, amount:currentAmount, note:currentNote, categoryId:currentCategoryId, expectedVersion:transactionVersion }); }
    catch { return setMessage("Số tiền phải là số nguyên lớn hơn 0."); }
    const linesEdited = Boolean(lineDraft && receiptId && cloudReceipt && receiptLinesChanged(lineBase, lineDraft));
    const parsedLines = linesEdited && lineDraft ? parseReceiptLines(lineDraft) : null;
    if (parsedLines && !parsedLines.ok) return setMessage(parsedLines.message as TransactionNotice);
    setBusy(true);
    setMessage(null);
    try {
      await update(transactionId, request);
      if (parsedLines?.ok && receiptId && cloudReceipt && session && picketApi) {
        const result = await picketApi.updateReceipt(session.access_token, receiptId, {
          expectedVersion: cloudReceipt.version,
          merchant: cloudReceipt.merchant,
          detectedTotal: cloudReceipt.detectedTotal,
          purchasedAt: cloudReceipt.purchasedAt,
          reviewRequired: false,
          lineItems: parsedLines.lines,
        });
        rememberReceipt(session.user.id, result.receipt);
        setCloudReceipt(result.receipt);
      }
      endEdit();
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        endEdit();
        return;
      }
      setMessage("Không cập nhật được. Dữ liệu có thể đã đổi trên thiết bị khác.");
    } finally {
      setBusy(false);
    }
  }

  function doArchive() {
    setConfirming(false);
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
  }

  const account = accounts.find((item) => item.id === transaction.accountId);
  const currentCategory = categories.find((item) => item.id === currentCategoryId);
  const tile = categoryTile(currentCategory?.icon ?? null, currentCategory?.name || currentTitle, transaction.kind === "income", colors);
  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const occurred = new Date(transaction.occurredAt);
  const datePart = occurred.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone });
  const timePart = occurred.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  const amountColor = transaction.kind === "expense" ? colors.expense : transaction.kind === "income" ? colors.income : colors.primary;
  const amountText = signedAmount(transaction.kind, Number(editing ? currentAmount : transaction.amount) || 0, account?.currencyCode ?? "VND", language);
  const hasReceipt = Boolean(receiptId || guestReceipt);
  const receiptImage = guestReceipt ? `data:${guestReceipt.contentType};base64,${guestReceipt.imageBase64}` : cloudImage;
  const receiptText = guestReceipt ? guestReceipt.rawText : cloudReceipt?.rawText ?? null;
  const lineItems = guestReceipt ? guestReceipt.lineItems.map((item, index) => ({ key: `${index}:${item.name}`, name: item.name, quantity: item.quantity, total: item.total }))
    : (cloudReceipt?.lineItems ?? []).map((item) => ({ key: item.id, name: item.name, quantity: item.quantity, total: item.total }));
  const options = categories.filter((item) => item.kind === transaction.kind || item.kind === "both").map((item) => { const t = categoryTile(item.icon, item.name, transaction.kind === "income", colors); return { id: item.id, name: item.name, icon: t.name, tint: t.color }; });

  async function shareReceipt(dialogTitle: string) {
    if (!receiptImage || sharing) return;
    setSharing(true);
    try {
      const local = await shareableReceiptUri(receiptImage, `picket-${currentTitle}`);
      if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
      await Sharing.shareAsync(local, { mimeType: "image/jpeg", dialogTitle });
    } catch {
      setMessage("Chưa lưu được ảnh. Hãy thử lại.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <FigmaScreen footer={editing ? <View style={{ gap: 8 }}>
      <FigmaButton fullWidth busy={busy} icon="check" label={copy("saveChanges")} onPress={() => void save()} />
      <FigmaButton fullWidth variant="text" size="medium" label={copy("cancel")} disabled={busy} onPress={endEdit} />
    </View> : undefined}>
      <ChildBar title={editing ? copy("editTitle") : copy("detailTitle")} backDisabled={busy}
        action={editing ? undefined : <IconButton variant="surface" icon="dots-horizontal" expanded={menu} label={copy("tools")} onPress={() => setMenu(!menu)} />} />

      {menu && !editing && (
        <Surface style={{ paddingVertical: 4 }}>
          {editable && <MenuRow icon="call-split" title={copy("splitByCategory")} onPress={() => { setMenu(false); router.push(routes.splits(transactionId)); }} />}
          {receiptText ? <MenuRow icon="text-box-search-outline" title={tx("Văn bản OCR đã đọc")} onPress={() => { setMenu(false); setOcrOpen(true); }} /> : null}
          <MenuRow icon="archive-outline" title={copy("archiveTx")} onPress={() => { setMenu(false); setConfirming(true); }} />
        </Surface>
      )}

      {hasReceipt && !editing && (
        <View style={styles.pinWrap}>
          <View style={styles.frame}>
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={tx("Xem ảnh hoá đơn")} disabled={!receiptImage} onPress={() => setViewerOpen(true)} style={{ flex: 1 }}>
              {receiptImage ? <Image accessible={false} resizeMode="cover" source={{ uri: receiptImage }} style={styles.photo} /> : receiptId ? <Skeleton height={322} radius={3} /> : <PaperArt id="receipt" style={styles.photo} />}
            </Pressable>
          </View>
          <View style={styles.tape} />
          {receiptImage && (
            <Pressable accessibilityRole="button" accessibilityLabel={tx("Phóng to ảnh hoá đơn")} onPress={() => setViewerOpen(true)} style={styles.zoom}>
              <AppIcon name="magnify" size={22} color={colors.text} />
            </Pressable>
          )}
        </View>
      )}

      {message && <ErrorLine>{tx(message)}</ErrorLine>}

      {editing ? (
        <PaperCard style={{ gap: 4 }}>
          <FormRow icon="shape-outline" label={copy("rowCategory")} value={currentCategory?.name ?? tx("Cần phân loại")} onPress={() => setPickCategory(true)} />
          <View style={styles.field}><Text style={styles.fieldLabel}>{tx("Nội dung")}</Text><TextInput accessibilityLabel={tx("Nội dung giao dịch")} placeholder={tx("Nội dung")} placeholderTextColor={colors.muted} style={styles.input} value={currentTitle} onChangeText={setTitle} /></View>
          <View style={styles.field}><Text style={styles.fieldLabel}>{tx("Số tiền")}</Text><TextInput money accessibilityLabel={tx("Số tiền giao dịch")} keyboardType="number-pad" placeholder={tx("Số tiền (VND)")} placeholderTextColor={colors.muted} style={styles.input} value={currentAmount} onChangeText={setAmount} /></View>
          <View style={styles.field}><Text style={styles.fieldLabel}>{tx("Ghi chú")}</Text><TextInput accessibilityLabel={tx("Ghi chú giao dịch")} multiline numberOfLines={3} placeholder={tx("Ghi chú")} placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={currentNote} onChangeText={setNote} /></View>
        </PaperCard>
      ) : null}
      {editing && receiptId ? (
        <PaperCard style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={[figmaType.overline, { color: colors.muted }]}>{tx("SẢN PHẨM TRÊN HOÁ ĐƠN")}</Text>
          {!lineDraft ? (
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{tx("Đang tải chi tiết hoá đơn…")}</Text>
          ) : (
            <>
              {lineDraft.length === 0 && <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{tx("OCR chưa tách được sản phẩm. Bạn có thể thêm tay.")}</Text>}
              {lineDraft.map((line, index) => (
                <View key={line.key} style={styles.lineEdit}>
                  <View style={styles.lineHead}>
                    <Text style={[figmaType.captionStrong, { color: colors.muted }]}>{tx("Sản phẩm {{index}}", { index: index + 1 })}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={tx("Xoá sản phẩm {{index}}", { index: index + 1 })} onPress={() => setLineDraft((current) => current?.filter((item) => item.key !== line.key) ?? null)} style={styles.lineRemove}>
                      <Text style={[figmaType.captionStrong, { color: colors.expense }]}>{tx("Xoá")}</Text>
                    </Pressable>
                  </View>
                  <TextInput accessibilityLabel={tx("Tên sản phẩm {{index}}", { index: index + 1 })} placeholder={tx("Tên sản phẩm")} placeholderTextColor={colors.muted} style={styles.input} value={line.name} onChangeText={(value) => setLineDraft((current) => current && updateReceiptLine(current, line.key, "name", value))} />
                  <View style={styles.lineRow}>
                    <TextInput accessibilityLabel={tx("Số lượng sản phẩm {{index}}", { index: index + 1 })} keyboardType="decimal-pad" placeholder={tx("SL")} placeholderTextColor={colors.muted} style={[styles.input, styles.lineQty]} value={line.quantity} onChangeText={(value) => setLineDraft((current) => current && updateReceiptLine(current, line.key, "quantity", value))} />
                    <TextInput money accessibilityLabel={tx("Đơn giá sản phẩm {{index}}", { index: index + 1 })} keyboardType="number-pad" placeholder={tx("Đơn giá")} placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} value={line.unitPrice} onChangeText={(value) => setLineDraft((current) => current && updateReceiptLine(current, line.key, "unitPrice", value))} />
                  </View>
                  <TextInput money accessibilityLabel={tx("Thành tiền sản phẩm {{index}}", { index: index + 1 })} keyboardType="number-pad" placeholder={tx("Thành tiền")} placeholderTextColor={colors.muted} style={styles.input} value={line.total} onChangeText={(value) => setLineDraft((current) => current && updateReceiptLine(current, line.key, "total", value))} />
                </View>
              ))}
              <FigmaButton variant="outline" size="medium" fullWidth icon="plus" label={tx("Thêm sản phẩm")} disabled={lineDraft.length >= MAX_RECEIPT_LINES} onPress={() => setLineDraft((current) => [...(current ?? []), blankReceiptLine(`new-${Date.now()}-${current?.length ?? 0}`)])} />
              {lineDraft.length > 0 && receiptLinesTotal(lineDraft) !== (Number(String(currentAmount).replace(/\D/g, "")) || 0) && (
                <Text style={[figmaType.captionStrong, { color: colors.muted }]}>{tx("Tổng các sản phẩm là {{lines}}, khác số tiền giao dịch {{amount}}. Có thể do thuế, phí hoặc giảm giá.", { lines: money(receiptLinesTotal(lineDraft)), amount: money(Number(String(currentAmount).replace(/\D/g, "")) || 0) })}</Text>
              )}
            </>
          )}
        </PaperCard>
      ) : null}
      {editing ? null : (
        <>
          <ReceiptSheet style={styles.sheet}>
            <Text style={[figmaType.titleSection, { color: colors.text }]}>{currentTitle}</Text>
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{[datePart, timePart, cloudReceipt?.merchant && cloudReceipt.merchant !== currentTitle ? cloudReceipt.merchant : null].filter(Boolean).join(" · ")}</Text>
            {hasReceipt && <Chip tone="success" size="small" label={copy("matchedReceipt")} style={{ alignSelf: "flex-start" }} />}
            {lineItems.length > 0 && (
              <>
                <ReceiptDivider />
                {lineItems.map((item) => (
                  <View key={item.key} style={styles.sheetLine}>
                    <Text style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>{item.name}{item.quantity !== 1 ? "00d7".padStart(2) + " " + item.quantity : ""}</Text>
                    <Text style={[figmaType.bodySmall, { color: colors.text, fontVariant: ["tabular-nums"] }]}>{money(item.total)}</Text>
                  </View>
                ))}
              </>
            )}
            {hasReceipt && lineItems.length === 0 && receiptId && !cloudReceipt?.lineItems && (
              <Text style={[figmaType.captionStrong, { color: colors.muted }]}>{tx("Đang tải chi tiết hoá đơn…")}</Text>
            )}
            <ReceiptDivider />
            <View style={styles.sheetLine}>
              <Text style={[figmaType.bodyStrong, { color: colors.text, fontSize: 16 }]}>{tx("Tổng cộng")}</Text>
              <Text style={[figmaType.bodyStrong, { color: amountColor, fontSize: 18, fontVariant: ["tabular-nums"] }]}>{amountText}</Text>
            </View>
          </ReceiptSheet>

          <PaperCard>
            <FormRow icon={tile.name} label={copy("rowCategory")} value={currentCategory?.name ?? tx("Cần phân loại")} onPress={editable ? () => setPickCategory(true) : undefined} />
            <FormRow icon="wallet-outline" label={copy("rowWallet")} value={account?.name ?? "—"} last={!transaction.note} />
            {transaction.note ? <FormRow icon="pencil-outline" label={copy("rowNote")} value={transaction.note} last /> : null}
          </PaperCard>

          <View style={styles.actions}>
            {editable && <FigmaButton variant="outline" label={copy("edit")} disabled={busy} onPress={beginEdit} style={{ flex: 1 }} />}
            {transaction.kind === "expense" && <FigmaButton variant="outline" label={copy("refund")} disabled={busy} onPress={() => router.push(routes.refund(transactionId))} style={{ flex: 1 }} />}
          </View>
          {receiptImage && (
            <View style={styles.actions}>
              <FigmaButton variant="outline" disabled={sharing} label={tx("Chia sẻ")} onPress={() => void shareReceipt(tx("Chia sẻ ảnh hoá đơn"))} style={{ flex: 1 }} />
              <FigmaButton variant="outline" disabled={sharing} label={tx("Lưu vào máy")} onPress={() => void shareReceipt(tx("Lưu ảnh hoá đơn"))} style={{ flex: 1 }} />
            </View>
          )}
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(true)} style={styles.archive}><Text style={[figmaType.bodyStrong, { color: colors.expense }]}>{copy("archiveTx")}</Text></Pressable>
        </>
      )}

      <ReceiptImageViewer visible={viewerOpen} uri={receiptImage} title={currentTitle} onClose={() => setViewerOpen(false)} />
      <ActionSheet title={tx("Văn bản OCR đã đọc")} visible={ocrOpen} onClose={() => setOcrOpen(false)}>
        {cloudReceipt ? (
          <Text style={[figmaType.captionStrong, { color: colors.muted }]}>
            {`OCR: ${cloudReceipt.ocrProvider} · ${cloudReceipt.confidence == null ? "—" : `${Math.round(cloudReceipt.confidence * 100)}%`}`}
          </Text>
        ) : null}
        <Text selectable style={styles.rawText}>{receiptText ?? ""}</Text>
        <Text style={[figmaType.captionStrong, { color: colors.muted }]}>{tx("Nhấn giữ để chọn và sao chép văn bản.")}</Text>
      </ActionSheet>

      <CategoryPickerSheet visible={pickCategory} title={copy("categoryPickTitle")} searchPlaceholder={copy("categorySearch")} closeLabel={copy("close")} selectedId={currentCategoryId ?? undefined} options={options}
        onSelect={(id) => { setCategoryId(id); setPickCategory(false); if (!editing) beginEdit(); }} onClose={() => setPickCategory(false)} />

      <Modal transparent animationType="fade" visible={confirming} onRequestClose={() => setConfirming(false)}>
        <View style={styles.backdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text accessibilityRole="header" style={[figmaType.titleSection, { fontSize: 18, color: colors.text }]}>{copy("archiveTitle")}</Text>
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{copy("archiveBody", { amount: money(Number(transaction.amount)), pocket: "" })}</Text>
            <View style={styles.dialogActions}>
              <FigmaButton variant="text" size="medium" label={copy("later")} onPress={() => setConfirming(false)} />
              <FigmaButton size="medium" label={copy("archiveConfirm")} onPress={doArchive} />
            </View>
          </View>
        </View>
      </Modal>
    </FigmaScreen>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  heroBody: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, gap: 12 },
  heroTile: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  polaroid: { position: "absolute", top: 12, right: 14, width: 76, height: 84, padding: 4, backgroundColor: colors.paper, borderRadius: 4, transform: [{ rotate: "6deg" }], ...figmaShadow("stub") },
  receiptRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72 },
  receiptThumb: { width: 56, height: 68, padding: 3, borderRadius: 4, backgroundColor: colors.paper, transform: [{ rotate: "-3deg" }], ...figmaShadow("stub") },
  receiptThumbImage: { width: "100%", height: "100%", borderRadius: 2, backgroundColor: colors.elevated },
  rawText: { color: colors.text, fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  pinWrap: { height: 372, alignItems: "center", marginTop: 4 },
  lineEdit: { gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: "dashed" },
  lineHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lineRemove: { minHeight: 40, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  lineRow: { flexDirection: "row", gap: 10 },
  lineQty: { width: 84 },
  frame: { marginTop: 22, width: 261, height: 338, borderRadius: 6, padding: 8, backgroundColor: colors.paper, transform: [{ rotate: "2deg" }], ...figmaShadow("paper") },
  photo: { flex: 1, width: "100%", borderRadius: 3, backgroundColor: colors.elevated },
  tape: { position: "absolute", top: 8, width: 65, height: 22, backgroundColor: colors.pocketCoral, transform: [{ rotate: "-4deg" }] },
  zoom: { position: "absolute", right: 30, bottom: 2, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  sheet: { gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  sheetLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 2 },
  actions: { flexDirection: "row", gap: 12 },
  polaroidImage: { width: "100%", height: "100%", borderRadius: 2, backgroundColor: colors.elevated },
  field: { gap: 6, paddingVertical: 8 },
  fieldLabel: { ...figmaType.bodySmall, color: colors.muted },
  input: { backgroundColor: colors.canvas, borderColor: colors.border, borderRadius: paperShape.input, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: paperControl.height, paddingHorizontal: 14 },
  note: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  archive: { alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: "rgba(48,33,50,0.45)", alignItems: "center", justifyContent: "center", padding: 28 },
  dialog: { alignSelf: "stretch", backgroundColor: colors.paper, borderRadius: 28, padding: 24, gap: 12 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 8 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
