import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { TopAppBar } from "@/core/ui/picket-ui";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { radii } from "@/core/ui/mobile-palette";
import { formatVnd, MAX_MONEY, type ReceiptRecord } from "@picket/domain";
import { ApiError } from "@picket/api-client";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { routes } from "@/core/navigation/routes";
import { supabase } from "@/core/supabase/client";
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

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function ReceiptDetailScreen() {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
    void picketApi
      .getReceipt(session.access_token, id, controller.signal)
      .then(async ({ receipt: result }) => {
        if (!active) return;
        setReceipt(result);
        if (supabase) {
          const signed = await supabase.storage
            .from("picket-media")
            .createSignedUrl(result.storagePath, 300);
          if (active && !signed.error) setImageUrl(signed.data.signedUrl);
        }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof Error && error.name === "AbortError")) {
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

  function beginEditing() {
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
      setEditing(false);
      setMessage(t("Đã lưu kết quả kiểm tra hóa đơn."));
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TopAppBar title={t("Chi tiết hóa đơn")} illustration="receipt" onBack={() => router.canGoBack() ? router.back() : router.replace(routes.transactions)} />
        {loading && <ActivityIndicator accessibilityLabel={t("Đang tải hóa đơn")} color={colors.link} style={styles.loader} />}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        {receipt && (
          <>
            {imageUrl ? (
              <Image accessibilityLabel={t("Ảnh hóa đơn đã lưu")} source={{ uri: imageUrl }} resizeMode="contain" style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.hint}>{t("Không tải được ảnh xem trước.")}</Text>
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
              <View style={styles.card}>
                <Text style={styles.merchant}>{receipt.merchant ?? t("Hóa đơn")}</Text>
                <Text style={styles.amount}>
                  {receipt.detectedTotal === null
                    ? t("Chưa có tổng tiền")
                    : formatVnd(receipt.detectedTotal)}
                </Text>
                <Text style={styles.meta}>{statusText(receipt.status, t)}</Text>
                <Text style={styles.meta}>
                  {receipt.purchasedAt
                    ? new Date(receipt.purchasedAt).toLocaleString("vi-VN")
                    : t("Chưa nhận diện ngày mua")}
                </Text>
                <Text style={styles.meta}>
                  {t("OCR: {{provider}} · Độ tin cậy: {{confidence}}", { provider: receipt.ocrProvider, confidence: receipt.confidence === null ? "—" : `${Math.round(receipt.confidence * 100)}%` })}
                </Text>
              </View>
            )}
            <Text accessibilityRole="header" style={styles.sectionTitle}>{t("Sản phẩm")}</Text>
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
                <Pressable disabled={lines.length >= 100} onPress={() => setLines((current) => [...current, { key: `new-${Date.now()}-${current.length}`, name: "", quantity: "1", unitPrice: "", total: "" }])} style={[styles.outlineButton, lines.length >= 100 && styles.disabled]}>
                  <Text style={styles.outlineText}>{t("+ Thêm sản phẩm")}</Text>
                </Pressable>
                {lines.length > 0 && Number.isSafeInteger(editedReceiptTotal) && editedLineTotal !== editedReceiptTotal && (
                  <Text style={styles.warning}>{t("Tổng các dòng là {{lineTotal}}, khác tổng hóa đơn {{receiptTotal}}. Có thể do thuế hoặc giảm giá.", { lineTotal: formatVnd(editedLineTotal), receiptTotal: formatVnd(editedReceiptTotal) })}</Text>
                )}
              </>
            ) : receipt.lineItems.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.hint}>{t("Chưa nhận diện chi tiết từng sản phẩm.")}</Text>
              </View>
            ) : (
              receipt.lineItems.map((item) => (
                <View key={item.id} style={styles.lineItem}>
                  <View style={styles.lineCopy}>
                    <Text style={styles.lineName}>{item.name}</Text>
                    <Text style={styles.hint}>{t("Số lượng {{quantity}}", { quantity: item.quantity })}</Text>
                  </View>
                  <Text style={styles.lineTotal}>{formatVnd(item.total)}</Text>
                </View>
              ))
            )}
            {editing ? (
              <View style={styles.editorActions}>
                <Pressable disabled={saving} onPress={() => void saveReview()} style={styles.primaryButton}>
                  {saving ? <ActivityIndicator accessibilityLabel={t("Đang lưu kết quả kiểm tra hóa đơn")} color={colors.onPrimary} /> : <Text style={styles.primaryText}>{t("Lưu kết quả kiểm tra")}</Text>}
                </Pressable>
                <Pressable disabled={saving} onPress={() => { setEditing(false); setMessage(null); }} style={styles.outlineButton}>
                  <Text style={styles.outlineText}>{t("Hủy chỉnh sửa")}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={beginEditing} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{t("Kiểm tra và chỉnh sửa")}</Text>
              </Pressable>
            )}
            {receipt.rawText && (
              <>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{t("Văn bản OCR")}</Text>
                <View style={styles.card}>
                  <Text style={styles.rawText}>{receipt.rawText}</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 14, padding: paperSpace.screen, paddingBottom: 48 },
  back: { color: colors.link, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700" },
  loader: { marginTop: 32 },
  image: { backgroundColor: colors.white, borderRadius: radii.large, height: 360, width: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.white, borderRadius: paperShape.card, gap: 6, padding: 18 },
  merchant: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  amount: { color: colors.expense, fontSize: 24, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "700", marginTop: 6 },
  lineItem: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.small, flexDirection: "row", padding: 15 },
  lineCopy: { flex: 1 },
  lineName: { color: colors.ink, fontWeight: "700" },
  lineTotal: { color: colors.ink, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  rawText: { color: colors.ink, fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontWeight: "700" },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "700", marginTop: 3 },
  input: { backgroundColor: colors.cream, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, minHeight: 48, paddingHorizontal: 13 },
  inputRow: { flexDirection: "row", gap: 10 },
  flexInput: { flex: 1 },
  editLine: { backgroundColor: colors.white, borderRadius: radii.small, gap: 9, padding: 14 },
  lineHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  remove: { color: colors.expense, fontSize: 13, fontWeight: "700" },
  warning: { backgroundColor: colors.warningSurface, borderRadius: radii.small, color: colors.ink, fontSize: 12, lineHeight: 18, padding: 12 },
  editorActions: { gap: 10, marginTop: 4 },
  primaryButton: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 14 },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  outlineButton: { alignItems: "center", borderColor: colors.primaryOutline, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 14 },
  outlineText: { color: colors.link, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.55 },
});
