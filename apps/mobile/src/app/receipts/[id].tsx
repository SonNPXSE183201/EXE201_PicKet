import { colors, radii } from "@picket/design-tokens";
import { formatVnd, MAX_MONEY, type ReceiptRecord } from "@picket/domain";
import { ApiError } from "@picket/api-client";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
        <Pressable accessibilityRole="link" onPress={() => router.replace(routes.transactions)}>
          <Text style={styles.back}>‹ Giao dịch</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Chi tiết hóa đơn</Text>
        {loading && <ActivityIndicator accessibilityLabel="Đang tải hóa đơn" color={colors.mauve} style={styles.loader} />}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        {receipt && (
          <>
            {imageUrl ? (
              <Image accessibilityLabel="Ảnh hóa đơn đã lưu" source={{ uri: imageUrl }} resizeMode="contain" style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.hint}>Không tải được ảnh xem trước.</Text>
              </View>
            )}
            {editing ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Cửa hàng</Text>
                <TextInput accessibilityLabel="Tên cửa hàng" value={merchant} onChangeText={setMerchant} placeholder="Tên cửa hàng" placeholderTextColor={colors.muted} style={styles.input} />
                <Text style={styles.fieldLabel}>Tổng hóa đơn</Text>
                <TextInput accessibilityLabel="Tổng hóa đơn" value={total} onChangeText={setTotal} keyboardType="number-pad" placeholder="Tổng tiền" placeholderTextColor={colors.muted} style={styles.input} />
                <Text style={styles.fieldLabel}>Ngày mua</Text>
                <TextInput accessibilityLabel="Ngày mua theo định dạng năm tháng ngày" value={purchasedAt} onChangeText={setPurchasedAt} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.merchant}>{receipt.merchant ?? "Hóa đơn"}</Text>
                <Text style={styles.amount}>
                  {receipt.detectedTotal === null
                    ? "Chưa có tổng tiền"
                    : formatVnd(receipt.detectedTotal)}
                </Text>
                <Text style={styles.meta}>{statusText(receipt.status)}</Text>
                <Text style={styles.meta}>
                  {receipt.purchasedAt
                    ? new Date(receipt.purchasedAt).toLocaleString("vi-VN")
                    : "Chưa nhận diện ngày mua"}
                </Text>
                <Text style={styles.meta}>
                  OCR: {receipt.ocrProvider} · Độ tin cậy: {receipt.confidence === null ? "—" : `${Math.round(receipt.confidence * 100)}%`}
                </Text>
              </View>
            )}
            <Text accessibilityRole="header" style={styles.sectionTitle}>Sản phẩm</Text>
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
                      <TextInput accessibilityLabel={`Đơn giá sản phẩm ${index + 1}`} value={line.unitPrice} onChangeText={(value) => updateLine(line.key, "unitPrice", value)} keyboardType="number-pad" placeholder="Đơn giá" placeholderTextColor={colors.muted} style={[styles.input, styles.flexInput]} />
                    </View>
                    <TextInput accessibilityLabel={`Thành tiền sản phẩm ${index + 1}`} value={line.total} onChangeText={(value) => updateLine(line.key, "total", value)} keyboardType="number-pad" placeholder="Thành tiền" placeholderTextColor={colors.muted} style={styles.input} />
                  </View>
                ))}
                <Pressable disabled={lines.length >= 100} onPress={() => setLines((current) => [...current, { key: `new-${Date.now()}-${current.length}`, name: "", quantity: "1", unitPrice: "", total: "" }])} style={[styles.outlineButton, lines.length >= 100 && styles.disabled]}>
                  <Text style={styles.outlineText}>+ Thêm sản phẩm</Text>
                </Pressable>
                {lines.length > 0 && Number.isSafeInteger(editedReceiptTotal) && editedLineTotal !== editedReceiptTotal && (
                  <Text style={styles.warning}>Tổng các dòng là {formatVnd(editedLineTotal)}, khác tổng hóa đơn {formatVnd(editedReceiptTotal)}. Có thể do thuế hoặc giảm giá.</Text>
                )}
              </>
            ) : receipt.lineItems.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.hint}>Chưa nhận diện chi tiết từng sản phẩm.</Text>
              </View>
            ) : (
              receipt.lineItems.map((item) => (
                <View key={item.id} style={styles.lineItem}>
                  <View style={styles.lineCopy}>
                    <Text style={styles.lineName}>{item.name}</Text>
                    <Text style={styles.hint}>Số lượng {item.quantity}</Text>
                  </View>
                  <Text style={styles.lineTotal}>{formatVnd(item.total)}</Text>
                </View>
              ))
            )}
            {editing ? (
              <View style={styles.editorActions}>
                <Pressable disabled={saving} onPress={() => void saveReview()} style={styles.primaryButton}>
                  {saving ? <ActivityIndicator accessibilityLabel="Đang lưu kết quả kiểm tra hóa đơn" color={colors.white} /> : <Text style={styles.primaryText}>Lưu kết quả kiểm tra</Text>}
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
                <Text accessibilityRole="header" style={styles.sectionTitle}>Văn bản OCR</Text>
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

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.cream, flex: 1 },
  content: { gap: 14, padding: 22, paddingBottom: 48 },
  back: { color: colors.mauve, fontWeight: "800" },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800" },
  loader: { marginTop: 32 },
  image: { backgroundColor: colors.white, borderRadius: radii.large, height: 360, width: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.white, borderRadius: radii.medium, gap: 6, padding: 18 },
  merchant: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  amount: { color: colors.expense, fontSize: 24, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginTop: 6 },
  lineItem: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.small, flexDirection: "row", padding: 15 },
  lineCopy: { flex: 1 },
  lineName: { color: colors.ink, fontWeight: "800" },
  lineTotal: { color: colors.ink, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  rawText: { color: colors.ink, fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  error: { color: colors.expense, fontWeight: "700" },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 3 },
  input: { backgroundColor: colors.cream, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, minHeight: 48, paddingHorizontal: 13 },
  inputRow: { flexDirection: "row", gap: 10 },
  flexInput: { flex: 1 },
  editLine: { backgroundColor: colors.white, borderRadius: radii.small, gap: 9, padding: 14 },
  lineHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  remove: { color: colors.expense, fontSize: 13, fontWeight: "800" },
  warning: { backgroundColor: "#FFF4DD", borderRadius: radii.small, color: colors.ink, fontSize: 12, lineHeight: 18, padding: 12 },
  editorActions: { gap: 10, marginTop: 4 },
  primaryButton: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 50, paddingHorizontal: 14 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  outlineButton: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 14 },
  outlineText: { color: colors.mauve, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.55 },
});
