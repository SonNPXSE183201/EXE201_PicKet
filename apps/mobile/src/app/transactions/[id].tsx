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
import type { GuestReceipt } from "@/core/receipts/guest-receipt-model";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { IconButton, MenuRow, Surface } from "@/core/ui/picket-ui";
import { Chip, FigmaButton, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
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
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pickCategory, setPickCategory] = useState(false);
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
  const dayKey = dayKeyAt(transaction.occurredAt, timeZone);
  const time = new Date(transaction.occurredAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  const meta = [dayLabel(dayKey, language, false), time, account?.name].filter(Boolean).join(" · ");
  const amountColor = transaction.kind === "expense" ? colors.expense : transaction.kind === "income" ? colors.income : colors.primary;
  const amountText = signedAmount(transaction.kind, Number(editing ? currentAmount : transaction.amount) || 0, account?.currencyCode ?? "VND", language);
  const hasReceipt = Boolean(receiptId || guestReceipt);
  const options = categories.filter((item) => item.kind === transaction.kind || item.kind === "both").map((item) => { const t = categoryTile(item.icon, item.name, transaction.kind === "income", colors); return { id: item.id, name: item.name, icon: t.name, tint: t.color }; });

  return (
    <FigmaScreen footer={editing ? <View style={{ gap: 8 }}>
      <FigmaButton fullWidth busy={busy} icon="check" label={copy("saveChanges")} onPress={() => void save()} />
      <FigmaButton fullWidth variant="text" size="medium" label={copy("cancel")} disabled={busy} onPress={() => { setEditing(false); setTitle(null); setAmount(null); setNote(null); setCategoryId(undefined); setMessage(null); }} />
    </View> : undefined}>
      <ChildBar title={editing ? copy("editTitle") : copy("detailTitle")} backDisabled={busy}
        action={editing ? undefined : <IconButton variant="surface" icon="dots-horizontal" expanded={menu} label={copy("tools")} onPress={() => setMenu(!menu)} />} />

      {menu && !editing && (
        <Surface style={{ paddingVertical: 4 }}>
          {editable && <MenuRow icon="call-split" title={copy("splitByCategory")} onPress={() => router.push(routes.splits(transactionId))} />}
          {receiptId && <MenuRow icon="receipt-text-outline" title={copy("viewReceipt")} onPress={() => router.push(routes.receipt(receiptId))} />}
          <MenuRow icon="archive-outline" title={copy("archiveTx")} onPress={() => { setMenu(false); setConfirming(true); }} />
        </Surface>
      )}

      <View style={figmaShadow("paper")}>
        <View style={styles.heroBody}>
          <View style={[styles.heroTile, { backgroundColor: tile.color }]}><AppIcon name={tile.name} size={24} color={colors.text} /></View>
          {hasReceipt && (
            <View accessible={false} style={styles.polaroid}>
              {guestReceipt ? <Image accessibilityLabel={tx("receiptImage", { merchant: guestReceipt.merchant })} resizeMode="cover" source={{ uri: `data:${guestReceipt.contentType};base64,${guestReceipt.imageBase64}` }} style={styles.polaroidImage} /> : <PaperArt id="receipt" style={styles.polaroidImage} />}
            </View>
          )}
          <View style={{ gap: 2 }}>
            <Text style={[figmaType.titleSection, { color: colors.text }]}>{currentTitle}</Text>
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{meta}</Text>
          </View>
          <Text style={[figmaType.amountHero, { color: amountColor, fontVariant: ["tabular-nums"] }]}>{amountText}</Text>
          {hasReceipt ? <Chip tone="success" label={copy("matchedReceipt")} /> : null}
        </View>
        <ReceiptEdge direction="bottom" />
      </View>

      {message && <ErrorLine>{tx(message)}</ErrorLine>}

      {editing ? (
        <PaperCard style={{ gap: 4 }}>
          <FormRow icon="shape-outline" label={copy("rowCategory")} value={currentCategory?.name ?? tx("Cần phân loại")} onPress={() => setPickCategory(true)} />
          <View style={styles.field}><Text style={styles.fieldLabel}>{tx("Nội dung")}</Text><TextInput accessibilityLabel={tx("Nội dung giao dịch")} placeholder={tx("Nội dung")} placeholderTextColor={colors.muted} style={styles.input} value={currentTitle} onChangeText={setTitle} /></View>
          <View style={styles.field}><Text style={styles.fieldLabel}>{tx("Số tiền")}</Text><TextInput money accessibilityLabel={tx("Số tiền giao dịch")} keyboardType="number-pad" placeholder={tx("Số tiền (VND)")} placeholderTextColor={colors.muted} style={styles.input} value={currentAmount} onChangeText={setAmount} /></View>
          <View style={styles.field}><Text style={styles.fieldLabel}>{tx("Ghi chú")}</Text><TextInput accessibilityLabel={tx("Ghi chú giao dịch")} multiline numberOfLines={3} placeholder={tx("Ghi chú")} placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={currentNote} onChangeText={setNote} /></View>
        </PaperCard>
      ) : (
        <PaperCard>
          <FormRow icon={tile.name} label={copy("rowCategory")} value={currentCategory?.name ?? tx("Cần phân loại")} onPress={editable ? () => setEditing(true) : undefined} />
          <FormRow icon="wallet-outline" label={copy("rowWallet")} value={account?.name ?? "—"} last={!transaction.note} />
          {transaction.note ? <FormRow icon="pencil-outline" label={copy("rowNote")} value={transaction.note} last /> : null}
        </PaperCard>
      )}

      {!editing && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {editable && <FigmaButton variant="outline" label={copy("edit")} disabled={busy} onPress={() => setEditing(true)} style={{ flex: 1 }} />}
          {transaction.kind === "expense" && <FigmaButton variant="outline" label={copy("refund")} disabled={busy} onPress={() => router.push(routes.refund(transactionId))} style={{ flex: 1 }} />}
        </View>
      )}
      {!editing && guestReceipt?.lineItems.map((item, index) => <Text key={`${index}:${item.name}`} style={[figmaType.bodySmall, { color: colors.muted }]}>{item.name} · {money(item.total)}</Text>)}
      {!editing && <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(true)} style={styles.archive}><Text style={[figmaType.bodyStrong, { color: colors.expense }]}>{copy("archiveTx")}</Text></Pressable>}

      <CategoryPickerSheet visible={pickCategory} title={copy("categoryPickTitle")} searchPlaceholder={copy("categorySearch")} closeLabel={copy("close")} selectedId={currentCategoryId ?? undefined} options={options}
        onSelect={(id) => { setCategoryId(id); setPickCategory(false); }} onClose={() => setPickCategory(false)} />

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
