import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { figmaType } from "@picket/design-tokens";
import { Chip, FigmaButton, Overline, ReceiptDivider, ReceiptSheet, figmaShadow } from "@/core/ui/figma-ui";
import { ReceiptImageViewer, shareableReceiptUri } from "@/core/ui/receipt-image-viewer";
import * as Sharing from "expo-sharing";
import { receiptArt } from "@/features/capture/capture-art";
import { ActionSheet, IconButton, MenuRow, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatVnd, MAX_MONEY, type ReceiptRecord } from "@picket/domain";
import { ApiError } from "@picket/api-client";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { routes } from "@/core/navigation/routes";
import { loadCloudReceiptImage } from "@/core/receipts/cloud-receipt-gallery";
import { recallReceipt, rememberReceipt } from "@/core/receipts/receipt-memory";
import { useAuth } from "@/features/auth/auth-context";

function statusText(status: ReceiptRecord["status"], t: TFunction<"common">) {
  if (status === "confirmed") return t("Đã xác nhận");
  if (status === "review_required") return t("Cần kiểm tra");
  if (status === "processing") return t("Đang xử lý");
  return t("Xử lý thất bại");
}

type EditableLine = {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
  total: string;
};

/** Figma D5: "03/11/2026 · 12:40" in the device time zone. */
function receiptDateLabel(iso: string) {
  const date = new Date(iso);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} · ${two(date.getHours())}:${two(date.getMinutes())}`;
}

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function ReceiptDetailScreen() {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { session } = useAuth();
  // A receipt already read on the transaction screen renders immediately.
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(() => (session && id ? recallReceipt(session.user.id, id) : null));
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const editStarted = useRef(false);
  const [menu, setMenu] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(() => receipt === null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [total, setTotal] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);

  useEffect(() => {
    if (!session || !id || !picketApi) return;
    let active = true;
    const controller = new AbortController();
    const owner = session.user.id;
    const showImage = (path: string) => {
      void loadCloudReceiptImage(owner, path, controller.signal).then((uri) => { if (active && uri) setImageUrl(uri); });
    };
    const known = recallReceipt(owner, id);
    if (known?.storagePath) showImage(known.storagePath);
    void picketApi
      .getReceipt(session.access_token, id, controller.signal)
      .then(({ receipt: result }) => {
        if (!active) return;
        rememberReceipt(owner, result);
        setReceipt(result);
        setLoading(false);
        if (edit === "1" && !editStarted.current) { editStarted.current = true; beginEditing(result); }
        if (result.storagePath && result.storagePath !== known?.storagePath) showImage(result.storagePath);
      })
      .catch((error: unknown) => {
        if (active && !known && !(error instanceof Error && error.name === "AbortError")) {
          setMessage(t("Không tải được hóa đơn."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, session, t]);

  if (!session) return <Redirect href={routes.login} />;
  if (receipt?.transactionId && edit !== "1") return <Redirect href={routes.transaction(receipt.transactionId)} />;

  function beginEditing(source: ReceiptRecord | null = receipt) {
    const receipt = source;
    if (!receipt) return;
    setMerchant(receipt.merchant ?? "");
    setTotal(receipt.detectedTotal === null ? "" : String(receipt.detectedTotal));
    setPurchasedAt(dateInput(receipt.purchasedAt));
    setLines(
      receipt.lineItems.map((item) => ({
        key: item.id,
        name: item.name,
        quantity: String(item.quantity),
        unitPrice: item.unitPrice === null ? "" : String(item.unitPrice),
        total: String(item.total),
      })),
    );
    setMessage(null);
    setEditing(true);
  }

  function updateLine(key: string, field: keyof Omit<EditableLine, "key">, value: string) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          const quantity = Number(next.quantity);
          const unitPrice = Number.parseInt(next.unitPrice, 10);
          if (quantity > 0 && Number.isSafeInteger(unitPrice) && unitPrice >= 0) {
            next.total = String(Math.round(quantity * unitPrice));
          }
        }
        return next;
      }),
    );
  }

  async function saveReview() {
    if (!receipt || !session || !picketApi) return;
    const parsedTotal = total === "" ? null : Number.parseInt(total, 10);
    if (merchant.trim().length > 160) {
      setMessage(t("Tên cửa hàng không được vượt quá 160 ký tự."));
      return;
    }
    if (parsedTotal !== null && (!/^\d+$/.test(total) || parsedTotal <= 0 || parsedTotal > MAX_MONEY)) {
      setMessage(t("Tổng hóa đơn phải là số nguyên lớn hơn 0."));
      return;
    }
    let purchasedIso: string | null = null;
    if (purchasedAt && !/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt)) {
      setMessage(t("Ngày mua phải có định dạng YYYY-MM-DD."));
      return;
    }
    if (purchasedAt) {
      const date = new Date(`${purchasedAt}T00:00:00.000Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== purchasedAt) {
        setMessage(t("Ngày mua không hợp lệ."));
        return;
      }
      purchasedIso = date.toISOString();
    }
    if (lines.length > 100) {
      setMessage(t("Một hóa đơn chỉ hỗ trợ tối đa 100 sản phẩm."));
      return;
    }
    const parsedLines = [];
    for (const line of lines) {
      const quantity = Number(line.quantity);
      const lineTotal = Number.parseInt(line.total, 10);
      const unitPrice = line.unitPrice === "" ? null : Number.parseInt(line.unitPrice, 10);
      if (
        !line.name.trim() ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > 1000000 ||
        !/^\d+$/.test(line.total) ||
        lineTotal <= 0 ||
        lineTotal > MAX_MONEY ||
        (unitPrice !== null &&
          (!/^\d+$/.test(line.unitPrice) ||
            unitPrice > MAX_MONEY ||
            Math.abs(Math.round(quantity * unitPrice) - lineTotal) > 1))
      ) {
        setMessage(t("Kiểm tra tên, số lượng, đơn giá và thành tiền của từng sản phẩm."));
        return;
      }
      parsedLines.push({
        name: line.name.trim(),
        quantity,
        unitPrice,
        total: lineTotal,
        confidence: null,
      });
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await picketApi.updateReceipt(session.access_token, receipt.id, {
        expectedVersion: receipt.version,
        merchant: merchant.trim() || null,
        detectedTotal: parsedTotal,
        purchasedAt: purchasedIso,
        reviewRequired: false,
        lineItems: parsedLines,
      });
      setReceipt(result.receipt);
      rememberReceipt(session.user.id, result.receipt);
      setEditing(false);
      setMessage(t("Đã lưu kết quả kiểm tra hóa đơn."));
      // Opened from the transaction's D5 screen: return there with the new lines.
      if (edit === "1" && router.canGoBack()) router.back();
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.status === 409
          ? t("Hóa đơn đã thay đổi trên thiết bị khác. Hãy mở lại màn hình trước khi sửa tiếp.")
          : t("Không lưu được hóa đơn. Hãy kiểm tra kết nối và thử lại."),
      );
    } finally {
      setSaving(false);
    }
  }

  const editedLineTotal = lines.reduce((sum, line) => {
    const value = Number.parseInt(line.total, 10);
    return sum + (Number.isSafeInteger(value) ? value : 0);
  }, 0);
  const editedReceiptTotal = Number.parseInt(total, 10);

  const purchasedLabel = receipt?.purchasedAt ? receiptDateLabel(receipt.purchasedAt) : t("Chưa nhận diện ngày mua");

  async function shareImage(dialogTitle: string) {
    if (!imageUrl || sharing) return;
    setSharing(true);
    setMessage(null);
    try {
      const local = await shareableReceiptUri(imageUrl, `picket-${receipt?.merchant ?? "hoa-don"}`);
      if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
      await Sharing.shareAsync(local, { mimeType: "image/jpeg", dialogTitle });
    } catch {
      setMessage(t("Chưa lưu được ảnh. Hãy thử lại."));
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TopAppBar
          title={editing ? t("Kiểm tra và chỉnh sửa") : t("Ảnh hoá đơn")}
          onBack={() => editing && edit !== "1" ? setEditing(false) : router.canGoBack() ? router.back() : router.replace(routes.transactions)}
          action={receipt && !editing ? <IconButton variant="surface" icon="dots-horizontal" expanded={menu} label={t("Công cụ hoá đơn")} onPress={() => setMenu(!menu)} /> : undefined}
        />
        {menu && receipt && !editing && (
          <Surface style={{ paddingVertical: 4 }}>
            <MenuRow icon="pencil-outline" title={t("Kiểm tra và chỉnh sửa")} onPress={() => { setMenu(false); beginEditing(); }} />
            {receipt.rawText ? <MenuRow icon="text-box-search-outline" title={t("Văn bản OCR đã đọc")} onPress={() => { setMenu(false); setOcrOpen(true); }} /> : null}
            {receipt.transactionId ? <MenuRow icon="swap-horizontal" title={t("Mở giao dịch")} onPress={() => { setMenu(false); router.push(routes.transaction(receipt.transactionId!)); }} /> : null}
          </Surface>
        )}
        {loading && <ActivityIndicator accessibilityLabel={t("Đang tải hóa đơn")} color={colors.link} style={styles.loader} />}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        {receipt && (
          <>
            {!editing && (
              <View style={styles.pinWrap}>
                <View style={styles.frame}>
                  {imageUrl ? (
                    <Pressable accessibilityRole="imagebutton" accessibilityLabel={t("Xem ảnh hoá đơn")} onPress={() => setViewerOpen(true)} style={{ flex: 1 }}>
                      <Image accessible={false} source={{ uri: imageUrl }} resizeMode="cover" style={styles.photo} />
                    </Pressable>
                  ) : (
                    <View style={[styles.photo, styles.imagePlaceholder]}>
                      <Image accessible={false} source={receiptArt} resizeMode="contain" style={styles.placeholderArt} />
                      {!loading && <Text style={[figmaType.bodySmall, styles.hint]}>{t("Không tải được ảnh xem trước.")}</Text>}
                    </View>
                  )}
                </View>
                <View style={styles.tape} />
                {imageUrl && (
                  <Pressable accessibilityRole="button" accessibilityLabel={t("Phóng to ảnh hoá đơn")} onPress={() => setViewerOpen(true)} style={styles.zoom}>
                    <AppIcon name="magnify" size={22} color={colors.text} />
                  </Pressable>
                )}
              </View>
            )}
            {editing ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>{t("Cửa hàng")}</Text>
                <TextInput accessibilityLabel={t("Tên cửa hàng")} value={merchant} onChangeText={setMerchant} placeholder={t("Tên cửa hàng")} placeholderTextColor={colors.muted} style={styles.input} />
                <Text style={styles.fieldLabel}>{t("Tổng hóa đơn")}</Text>
                <TextInput money accessibilityLabel={t("Tổng hóa đơn")} value={total} onChangeText={setTotal} keyboardType="number-pad" placeholder={t("Tổng tiền")} placeholderTextColor={colors.muted} style={styles.input} />
                <Text style={styles.fieldLabel}>{t("Ngày mua")}</Text>
                <TextInput date accessibilityLabel={t("Ngày mua")} value={purchasedAt} onChangeText={setPurchasedAt} style={styles.input} />
              </View>
            ) : (
              <ReceiptSheet style={styles.sheet}>
                <Text style={[figmaType.titleSection, { color: colors.text }]}>{receipt.merchant ?? t("Hóa đơn")}</Text>
                <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{purchasedLabel}</Text>
                {receipt.status !== "confirmed" && <Chip tone="warning" size="small" label={statusText(receipt.status, t)} style={{ alignSelf: "flex-start" }} />}
                <ReceiptDivider />
                {receipt.lineItems.length === 0 ? (
                  <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{t("Chưa nhận diện chi tiết từng sản phẩm.")}</Text>
                ) : (
                  receipt.lineItems.map((item) => (
                    <View key={item.id} style={styles.sheetLine}>
                      <Text style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>
                        {item.name}{item.quantity !== 1 ? ` × ${item.quantity}` : ""}
                      </Text>
                      <Text style={[figmaType.bodySmall, { color: colors.text, fontVariant: ["tabular-nums"] }]}>{formatVnd(item.total)}</Text>
                    </View>
                  ))
                )}
                <ReceiptDivider />
                <View style={styles.sheetLine}>
                  <Text style={[figmaType.bodyStrong, { color: colors.text, fontSize: 16 }]}>{t("Tổng cộng")}</Text>
                  <Text style={[figmaType.bodyStrong, { color: colors.text, fontSize: 16, fontVariant: ["tabular-nums"] }]}>
                    {receipt.detectedTotal === null ? t("Chưa có tổng tiền") : formatVnd(receipt.detectedTotal)}
                  </Text>
                </View>
                {receipt.transactionId ? (
                  <Pressable accessibilityRole="link" onPress={() => router.push(routes.transaction(receipt.transactionId!))} style={styles.openTx}>
                    <Text style={[figmaType.bodyStrong, { color: colors.primary }]}>{t("Mở giao dịch")}</Text>
                    <AppIcon name="chevron-right" size={16} color={colors.primary} />
                  </Pressable>
                ) : null}
              </ReceiptSheet>
            )}
            {editing && <Overline>{t("Sản phẩm")}</Overline>}
            {editing ? (
              <>
                {lines.map((line, index) => (
                  <View key={line.key} style={styles.editLine}>
                    <View style={styles.lineHeader}>
                      <Text style={styles.lineName}>{t("Sản phẩm {{index}}", { index: index + 1 })}</Text>
                      <Pressable accessibilityLabel={t("Xóa sản phẩm {{index}}", { index: index + 1 })} onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                        <Text style={styles.remove}>{t("Xóa")}</Text>
                      </Pressable>
                    </View>
                    <TextInput accessibilityLabel={t("Tên sản phẩm {{index}}", { index: index + 1 })} value={line.name} onChangeText={(value) => updateLine(line.key, "name", value)} placeholder={t("Tên sản phẩm")} placeholderTextColor={colors.muted} style={styles.input} />
                    <View style={styles.inputRow}>
                      <TextInput accessibilityLabel={t("Số lượng sản phẩm {{index}}", { index: index + 1 })} value={line.quantity} onChangeText={(value) => updateLine(line.key, "quantity", value)} keyboardType="decimal-pad" placeholder={t("Số lượng")} placeholderTextColor={colors.muted} style={[styles.input, styles.flexInput]} />
                      <TextInput money accessibilityLabel={t("Đơn giá sản phẩm {{index}}", { index: index + 1 })} value={line.unitPrice} onChangeText={(value) => updateLine(line.key, "unitPrice", value)} keyboardType="number-pad" placeholder={t("Đơn giá")} placeholderTextColor={colors.muted} style={[styles.input, styles.flexInput]} />
                    </View>
                    <TextInput money accessibilityLabel={t("Thành tiền sản phẩm {{index}}", { index: index + 1 })} value={line.total} onChangeText={(value) => updateLine(line.key, "total", value)} keyboardType="number-pad" placeholder={t("Thành tiền")} placeholderTextColor={colors.muted} style={styles.input} />
                  </View>
                ))}
                <FigmaButton fullWidth variant="outline" size="medium" disabled={lines.length >= 100} label={t("+ Thêm sản phẩm")} onPress={() => setLines((current) => [...current, { key: `new-${Date.now()}-${current.length}`, name: "", quantity: "1", unitPrice: "", total: "" }])} />
                {lines.length > 0 && Number.isSafeInteger(editedReceiptTotal) && editedLineTotal !== editedReceiptTotal && (
                  <Text style={styles.warning}>{t("Tổng các dòng là {{lineTotal}}, khác tổng hóa đơn {{receiptTotal}}. Có thể do thuế hoặc giảm giá.", { lineTotal: formatVnd(editedLineTotal), receiptTotal: formatVnd(editedReceiptTotal) })}</Text>
                )}
                <View style={styles.editorActions}>
                  <FigmaButton fullWidth busy={saving} label={t("Lưu kết quả kiểm tra")} onPress={() => void saveReview()} />
                  <FigmaButton fullWidth variant="text" size="medium" disabled={saving} label={t("Hủy chỉnh sửa")} onPress={() => { if (edit === "1" && router.canGoBack()) { router.back(); return; } setEditing(false); setMessage(null); }} />
                </View>
              </>
            ) : (
              <View style={styles.actions}>
                <FigmaButton variant="outline" disabled={!imageUrl || sharing} label={t("Chia sẻ")} onPress={() => void shareImage(t("Chia sẻ ảnh hoá đơn"))} style={{ flex: 1 }} />
                <FigmaButton variant="outline" disabled={!imageUrl || sharing} label={t("Lưu vào máy")} onPress={() => void shareImage(t("Lưu ảnh hoá đơn"))} style={{ flex: 1 }} />
              </View>
            )}
          </>
        )}
      </ScrollView>
      <ReceiptImageViewer visible={viewerOpen} uri={imageUrl} title={receipt?.merchant || t("Hóa đơn")} onClose={() => setViewerOpen(false)} />
      <ActionSheet title={t("Văn bản OCR đã đọc")} visible={ocrOpen} onClose={() => setOcrOpen(false)}>
        <Text style={[figmaType.captionStrong, { color: colors.muted }]}>
          {t("OCR: {{provider}} · Độ tin cậy: {{confidence}}", { provider: receipt?.ocrProvider ?? "—", confidence: receipt?.confidence == null ? "—" : `${Math.round(receipt.confidence * 100)}%` })}
        </Text>
        <Text selectable style={styles.rawText}>{receipt?.rawText ?? ""}</Text>
        <Text style={[figmaType.captionStrong, { color: colors.muted }]}>{t("Nhấn giữ để chọn và sao chép văn bản.")}</Text>
      </ActionSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  loader: { marginTop: 32 },
  pinWrap: { height: 372, alignItems: "center", marginTop: 4 },
  frame: { marginTop: 22, width: 261, height: 338, borderRadius: 6, padding: 8, backgroundColor: colors.paper, transform: [{ rotate: "2deg" }], ...figmaShadow("paper") },
  photo: { flex: 1, borderRadius: 3, backgroundColor: colors.elevated },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  placeholderArt: { width: 160, height: 160 },
  tape: { position: "absolute", top: 8, width: 65, height: 22, backgroundColor: colors.pocketCoral, transform: [{ rotate: "-4deg" }] },
  zoom: { position: "absolute", right: 30, bottom: 2, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  sheet: { gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  sheetLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 2 },
  openTx: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", minHeight: 44 },
  actions: { flexDirection: "row", gap: 12 },
  card: { backgroundColor: colors.paper, borderRadius: paperShape.card, gap: 6, padding: 18 },
  lineName: { color: colors.text, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  rawText: { color: colors.text, fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontWeight: "700" },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 3 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: paperShape.input, borderWidth: 1, color: colors.text, minHeight: paperControl.height, paddingHorizontal: 13 },
  inputRow: { flexDirection: "row", gap: 10 },
  flexInput: { flex: 1 },
  editLine: { backgroundColor: colors.paper, borderRadius: 18, gap: 9, padding: 14 },
  lineHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  remove: { color: colors.expense, fontSize: 13, fontWeight: "700" },
  warning: { backgroundColor: colors.warningSurface, borderRadius: 18, color: colors.text, fontSize: 12, lineHeight: 18, padding: 12 },
  editorActions: { gap: 8, marginTop: 4 },
});
