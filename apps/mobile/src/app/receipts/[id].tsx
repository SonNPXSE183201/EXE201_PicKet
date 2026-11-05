import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { figmaType } from "@picket/design-tokens";
import { Overline, ReceiptDivider, ReceiptSheet, figmaShadow } from "@/core/ui/figma-ui";
import { receiptArt } from "@/features/capture/capture-art";
import { TopAppBar } from "@/core/ui/picket-ui";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatVnd, MAX_MONEY, type ReceiptRecord } from "@picket/domain";
import { ApiError } from "@picket/api-client";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { routes } from "@/core/navigation/routes";
import { supabase } from "@/core/supabase/client";
import { useAuth } from "@/features/auth/auth-context";

function statusText(status: ReceiptRecord["status"]) {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "review_required") return "Cần kiểm tra";
  if (status === "processing") return "Đang xử lý";
  return "Xử lý thất bại";
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
          setMessage("Không tải được hóa đơn.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, session]);

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
      setMessage("Tên cửa hàng không được vượt quá 160 ký tự.");
      return;
    }
    if (parsedTotal !== null && (!/^\d+$/.test(total) || parsedTotal <= 0 || parsedTotal > MAX_MONEY)) {
      setMessage("Tổng hóa đơn phải là số nguyên lớn hơn 0.");
      return;
    }
    let purchasedIso: string | null = null;
    if (purchasedAt && !/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt)) {
      setMessage("Ngày mua phải có định dạng YYYY-MM-DD.");
      return;
    }
    if (purchasedAt) {
      const date = new Date(`${purchasedAt}T00:00:00.000Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== purchasedAt) {
        setMessage("Ngày mua không hợp lệ.");
        return;
      }
      purchasedIso = date.toISOString();
    }
    if (lines.length > 100) {
      setMessage("Một hóa đơn chỉ hỗ trợ tối đa 100 sản phẩm.");
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
        setMessage("Kiểm tra tên, số lượng, đơn giá và thành tiền của từng sản phẩm.");
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
      setMessage("Đã lưu kết quả kiểm tra hóa đơn.");
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.status === 409
          ? "Hóa đơn đã thay đổi trên thiết bị khác. Hãy mở lại màn hình trước khi sửa tiếp."
          : "Không lưu được hóa đơn. Hãy kiểm tra kết nối và thử lại.",
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
        <TopAppBar title="Chi tiết hóa đơn" onBack={() => router.canGoBack() ? router.back() : router.replace(routes.transactions)} />
        {loading && <ActivityIndicator accessibilityLabel="Đang tải hóa đơn" color={colors.link} style={styles.loader} />}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        {receipt && (
          <>
            <View style={styles.pinWrap}>
              <View style={styles.frame}>
                {imageUrl ? (
                  <Image accessibilityLabel="Ảnh hóa đơn đã lưu" source={{ uri: imageUrl }} resizeMode="cover" style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.imagePlaceholder]}>
                    <Image accessible={false} source={receiptArt} resizeMode="contain" style={styles.placeholderArt} />
                    <Text style={[figmaType.bodySmall, styles.hint]}>Không tải được ảnh xem trước.</Text>
                  </View>
                )}
              </View>
              <View style={styles.tape} />
            </View>
            {editing ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Cửa hàng</Text>
                <TextInput accessibilityLabel="Tên cửa hàng" value={merchant} onChangeText={setMerchant} placeholder="Tên cửa hàng" placeholderTextColor={colors.muted} style={styles.input} />
                <Text style={styles.fieldLabel}>Tổng hóa đơn</Text>
                <TextInput money accessibilityLabel="Tổng hóa đơn" value={total} onChangeText={setTotal} keyboardType="number-pad" placeholder="Tổng tiền" placeholderTextColor={colors.muted} style={styles.input} />
                <Text style={styles.fieldLabel}>Ngày mua</Text>
                <TextInput date accessibilityLabel="Ngày mua" value={purchasedAt} onChangeText={setPurchasedAt} style={styles.input} />
              </View>
            ) : (
              <ReceiptSheet style={styles.sheet}>
                <Text style={[figmaType.titleSection, { color: colors.text }]}>{receipt.merchant ?? "Hóa đơn"}</Text>
                <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
                  {receipt.purchasedAt
                    ? new Date(receipt.purchasedAt).toLocaleString("vi-VN")
                    : "Chưa nhận diện ngày mua"} · {statusText(receipt.status)}
                </Text>
                <ReceiptDivider />
                {receipt.lineItems.length === 0 ? (
                  <Text style={[figmaType.bodySmall, { color: colors.muted }]}>Chưa nhận diện chi tiết từng sản phẩm.</Text>
                ) : (
                  receipt.lineItems.map((item) => (
                    <View key={item.id} style={styles.sheetLine}>
                      <Text style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>{item.name} · Số lượng {item.quantity}</Text>
                      <Text style={[figmaType.bodySmall, { color: colors.text }]}>{formatVnd(item.total)}</Text>
                    </View>
                  ))
                )}
                <ReceiptDivider />
                <View style={styles.sheetLine}>
                  <Text style={[figmaType.bodyStrong, { color: colors.text }]}>Tổng cộng</Text>
                  <Text style={[figmaType.amountRow, { color: colors.expense }]}>
                    {receipt.detectedTotal === null ? "Chưa có tổng tiền" : formatVnd(receipt.detectedTotal)}
                  </Text>
                </View>
                <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
                  OCR: {receipt.ocrProvider} · Độ tin cậy: {receipt.confidence === null ? "—" : `${Math.round(receipt.confidence * 100)}%`}
                </Text>
              </ReceiptSheet>
            )}
            {editing && <Overline>Sản phẩm</Overline>}
            {editing ? (
              <>
                {lines.map((line, index) => (
                  <View key={line.key} style={styles.editLine}>
                    <View style={styles.lineHeader}>
                      <Text style={styles.lineName}>Sản phẩm {index + 1}</Text>
                      <Pressable accessibilityLabel={`Xóa sản phẩm ${index + 1}`} onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                        <Text style={styles.remove}>Xóa</Text>
                      </Pressable>
                    </View>
                    <TextInput accessibilityLabel={`Tên sản phẩm ${index + 1}`} value={line.name} onChangeText={(value) => updateLine(line.key, "name", value)} placeholder="Tên sản phẩm" placeholderTextColor={colors.muted} style={styles.input} />
                    <View style={styles.inputRow}>
                      <TextInput accessibilityLabel={`Số lượng sản phẩm ${index + 1}`} value={line.quantity} onChangeText={(value) => updateLine(line.key, "quantity", value)} keyboardType="decimal-pad" placeholder="Số lượng" placeholderTextColor={colors.muted} style={[styles.input, styles.flexInput]} />
                      <TextInput money accessibilityLabel={`Đơn giá sản phẩm ${index + 1}`} value={line.unitPrice} onChangeText={(value) => updateLine(line.key, "unitPrice", value)} keyboardType="number-pad" placeholder="Đơn giá" placeholderTextColor={colors.muted} style={[styles.input, styles.flexInput]} />
                    </View>
                    <TextInput money accessibilityLabel={`Thành tiền sản phẩm ${index + 1}`} value={line.total} onChangeText={(value) => updateLine(line.key, "total", value)} keyboardType="number-pad" placeholder="Thành tiền" placeholderTextColor={colors.muted} style={styles.input} />
                  </View>
                ))}
                <Pressable disabled={lines.length >= 100} onPress={() => setLines((current) => [...current, { key: `new-${Date.now()}-${current.length}`, name: "", quantity: "1", unitPrice: "", total: "" }])} style={[styles.outlineButton, lines.length >= 100 && styles.disabled]}>
                  <Text style={styles.outlineText}>+ Thêm sản phẩm</Text>
                </Pressable>
                {lines.length > 0 && Number.isSafeInteger(editedReceiptTotal) && editedLineTotal !== editedReceiptTotal && (
                  <Text style={styles.warning}>Tổng các dòng là {formatVnd(editedLineTotal)}, khác tổng hóa đơn {formatVnd(editedReceiptTotal)}. Có thể do thuế hoặc giảm giá.</Text>
                )}
              </>
            ) : null}
            {editing ? (
              <View style={styles.editorActions}>
                <Pressable disabled={saving} onPress={() => void saveReview()} style={styles.primaryButton}>
                  {saving ? <ActivityIndicator accessibilityLabel="Đang lưu kết quả kiểm tra hóa đơn" color={colors.onPrimary} /> : <Text style={styles.primaryText}>Lưu kết quả kiểm tra</Text>}
                </Pressable>
                <Pressable disabled={saving} onPress={() => { setEditing(false); setMessage(null); }} style={styles.outlineButton}>
                  <Text style={styles.outlineText}>Hủy chỉnh sửa</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={beginEditing} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Kiểm tra và chỉnh sửa</Text>
              </Pressable>
            )}
            {receipt.rawText && (
              <>
                <Overline>Văn bản OCR</Overline>
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
  safe: { backgroundColor: colors.canvas, flex: 1 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  back: { color: colors.link, fontWeight: "700" },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  loader: { marginTop: 32 },
  pinWrap: { height: 372, alignItems: "center", marginTop: 4 },
  frame: { marginTop: 22, width: 250, height: 330, borderRadius: 6, padding: 8, backgroundColor: colors.paper, transform: [{ rotate: "2deg" }], ...figmaShadow("paper") },
  photo: { flex: 1, borderRadius: 3, backgroundColor: colors.elevated },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  placeholderArt: { width: 160, height: 160 },
  tape: { position: "absolute", top: 4, width: 64, height: 16, backgroundColor: colors.pocketCoral, transform: [{ rotate: "-6deg" }] },
  sheet: { gap: 6, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  sheetLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 2 },
  card: { backgroundColor: colors.paper, borderRadius: paperShape.card, gap: 6, padding: 18 },
  merchant: { color: colors.text, fontSize: 20, fontWeight: "700" },
  amount: { color: colors.expense, fontSize: 24, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 6 },
  lineItem: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 18, flexDirection: "row", padding: 15 },
  lineCopy: { flex: 1 },
  lineName: { color: colors.text, fontWeight: "700" },
  lineTotal: { color: colors.text, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  rawText: { color: colors.text, fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontWeight: "700" },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 3 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: paperShape.input, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 13 },
  inputRow: { flexDirection: "row", gap: 10 },
  flexInput: { flex: 1 },
  editLine: { backgroundColor: colors.paper, borderRadius: 18, gap: 9, padding: 14 },
  lineHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  remove: { color: colors.expense, fontSize: 13, fontWeight: "700" },
  warning: { backgroundColor: colors.warningSurface, borderRadius: 18, color: colors.text, fontSize: 12, lineHeight: 18, padding: 12 },
  editorActions: { gap: 10, marginTop: 4 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 14 },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  outlineButton: { alignItems: "center", borderColor: colors.border, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 14 },
  outlineText: { color: colors.link, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.55 },
});
