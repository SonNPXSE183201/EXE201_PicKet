import { colors, radii } from "@picket/design-tokens";
import {
  PICKET_SUBSCRIPTION_IDS,
  type Entitlements,
  type PicketSubscriptionId,
} from "@picket/domain";
import * as Crypto from "expo-crypto";
import {
  deepLinkToSubscriptions,
  getAvailablePurchases,
  type ProductSubscription,
  type Purchase,
  useIAP,
} from "expo-iap";
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import {
  isPicketSubscriptionId,
  verifyAndFinishPurchase,
} from "@/features/billing/billing-policy";

const planCopy: Record<
  PicketSubscriptionId,
  { name: string; cadence: string; summary: string }
> = {
  picket_plus_monthly: {
    name: "Picket Plus",
    cadence: "hàng tháng",
    summary: "Tăng hạn mức OCR cloud và giữ đầy đủ tính năng đồng bộ.",
  },
  picket_plus_yearly: {
    name: "Picket Plus",
    cadence: "hàng năm",
    summary: "Gói Plus theo năm, quản lý trực tiếp qua Google Play.",
  },
  picket_pro_monthly: {
    name: "Picket Pro",
    cadence: "hàng tháng",
    summary: "Hạn mức OCR cloud cao nhất cho nhu cầu sử dụng thường xuyên.",
  },
  picket_pro_yearly: {
    name: "Picket Pro",
    cadence: "hàng năm",
    summary: "Gói Pro theo năm, phù hợp người dùng dài hạn.",
  },
};

export default function BillingScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href={routes.login} />;
  return <BillingContent accessToken={session.access_token} userId={session.user.id} />;
}

function BillingContent({ accessToken, userId }: { accessToken: string; userId: string }) {
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const processingTokens = useRef(new Set<string>());
  const fetchedProducts = useRef(false);

  const {
    connected,
    subscriptions,
    fetchProducts,
    finishTransaction,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void verifyStorePurchase(purchase);
    },
    onPurchaseError: (error) => {
      setBusyProduct(null);
      setSuccess(false);
      setMessage(
        error.code === "user-cancelled"
          ? "Bạn đã đóng cửa sổ thanh toán."
          : "Google Play chưa hoàn tất giao dịch. Vui lòng thử lại.",
      );
    },
    onError: () => {
      setMessage("Không kết nối được Google Play Billing.");
    },
  });

  useEffect(() => {
    if (!connected || Platform.OS !== "android" || fetchedProducts.current) return;
    fetchedProducts.current = true;
    void fetchProducts({ skus: [...PICKET_SUBSCRIPTION_IDS], type: "subs" });
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (!picketApi) return;
    let active = true;
    void picketApi
      .currentEntitlements(accessToken)
      .then((value) => {
        if (active) setEntitlements(value);
      })
      .catch(() => {
        if (active) setEntitlements(null);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  async function refreshEntitlements() {
    if (!picketApi) return;
    setEntitlements(await picketApi.currentEntitlements(accessToken));
  }

  async function verifyStorePurchase(purchase: Purchase) {
    const token = purchase.purchaseToken;
    if (!token || processingTokens.current.has(token)) return;
    processingTokens.current.add(token);
    setBusyProduct(purchase.productId);
    setSuccess(false);
    setMessage("Đang xác minh giao dịch an toàn với Google Play…");
    try {
      const api = picketApi;
      if (!api) throw new Error("Dart API chưa được cấu hình.");
      const result = await verifyAndFinishPurchase(
        purchase,
        (request) => api.verifyPlayPurchase(accessToken, request),
        () => finishTransaction({ purchase, isConsumable: false }),
      );
      await refreshEntitlements();
      setSuccess(true);
      setMessage(
        result.active
          ? `Đã kích hoạt gói ${result.tier.toUpperCase()}.`
          : "Giao dịch hợp lệ nhưng gói đã hết hạn.",
      );
    } catch (error) {
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể xác minh giao dịch. Google Play sẽ giữ giao dịch để thử lại.",
      );
    } finally {
      processingTokens.current.delete(token);
      setBusyProduct(null);
    }
  }

  async function purchase(product: ProductSubscription) {
    if (Platform.OS !== "android" || product.platform !== "android") return;
    const offerToken = product.subscriptionOffers.find(
      (offer) => typeof offer.offerTokenAndroid === "string",
    )?.offerTokenAndroid;
    if (!offerToken) {
      setSuccess(false);
      return setMessage("Google Play chưa trả về ưu đãi hợp lệ cho gói này.");
    }
    setBusyProduct(product.id);
    setSuccess(false);
    setMessage(null);
    try {
      const obfuscatedAccountId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        userId,
      );
      await requestPurchase({
        request: {
          google: {
            skus: [product.id],
            subscriptionOffers: [{ sku: product.id, offerToken }],
            obfuscatedAccountId,
          },
        },
        type: "subs",
      });
    } catch (error) {
      setBusyProduct(null);
      setMessage(error instanceof Error ? error.message : "Không mở được Google Play.");
    }
  }

  async function restore() {
    if (!connected || Platform.OS !== "android") return;
    setRestoring(true);
    setSuccess(false);
    setMessage(null);
    try {
      const purchases = await getAvailablePurchases({
        includeSuspendedAndroid: false,
      });
      const eligible = purchases.filter(
        (item) => isPicketSubscriptionId(item.productId) && item.purchaseToken,
      );
      if (eligible.length === 0) {
        setMessage("Không tìm thấy gói Picket đang hoạt động trên tài khoản Google Play này.");
        return;
      }
      for (const item of eligible) await verifyStorePurchase(item);
      await refreshEntitlements();
      setSuccess(true);
      setMessage("Đã khôi phục và đồng bộ gói từ Google Play.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể khôi phục giao dịch.");
    } finally {
      setRestoring(false);
    }
  }

  async function manageSubscription() {
    try {
      await deepLinkToSubscriptions({
        packageNameAndroid: "com.picket.mobile",
        skuAndroid: subscriptions[0]?.id ?? PICKET_SUBSCRIPTION_IDS[0],
      });
    } catch {
      setSuccess(false);
      setMessage("Không mở được trang quản lý gói Google Play.");
    }
  }

  const orderedProducts = [...subscriptions].sort(
    (left, right) =>
      PICKET_SUBSCRIPTION_IDS.indexOf(left.id as PicketSubscriptionId) -
      PICKET_SUBSCRIPTION_IDS.indexOf(right.id as PicketSubscriptionId),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Quay lại hồ sơ</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Gói Picket</Text>
        <Text style={styles.description}>
          Thanh toán do Google Play xử lý. Picket chỉ kích hoạt gói sau khi server xác minh giao dịch.
        </Text>

        {entitlements && (
          <View style={styles.currentPlan}>
            <Text style={styles.currentPlanTitle}>Gói hiện tại: {entitlements.tier.toUpperCase()}</Text>
            <Text style={styles.currentPlanText}>
              OCR cloud còn {entitlements.ocrFallbackRemaining}/{entitlements.ocrFallbackDailyLimit} lượt trong 24 giờ.
            </Text>
          </View>
        )}

        {Platform.OS !== "android" ? (
          <Text style={styles.notice}>Thanh toán trong ứng dụng hiện chỉ hỗ trợ Android.</Text>
        ) : !connected ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.mauve} />
            <Text style={styles.notice}>Đang kết nối Google Play…</Text>
          </View>
        ) : orderedProducts.length === 0 ? (
          <Text style={styles.notice}>
            Chưa tải được bảng giá. Bản cài phải được phát hành qua Google Play Internal testing và dùng tài khoản tester.
          </Text>
        ) : (
          orderedProducts.map((product) => {
            if (!isPicketSubscriptionId(product.id)) return null;
            const copy = planCopy[product.id];
            const displayPrice =
              product.subscriptionOffers?.find((offer) => offer.offerTokenAndroid)?.displayPrice ??
              product.displayPrice;
            return (
              <View key={product.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planNameBlock}>
                    <Text style={styles.planName}>{copy.name}</Text>
                    <Text style={styles.cadence}>{copy.cadence}</Text>
                  </View>
                  <Text style={styles.price}>{displayPrice}</Text>
                </View>
                <Text style={styles.planSummary}>{copy.summary}</Text>
                <Pressable
                  accessibilityLabel={`Chọn ${copy.name} ${copy.cadence}`}
                  disabled={busyProduct !== null || restoring}
                  onPress={() => void purchase(product)}
                  style={styles.primary}
                >
                  {busyProduct === product.id ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryText}>Chọn gói</Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}

        {message && (
          <Text accessibilityLiveRegion="polite" style={success ? styles.success : styles.error}>
            {message}
          </Text>
        )}
        <Pressable
          disabled={!connected || restoring || busyProduct !== null}
          onPress={() => void restore()}
          style={styles.secondary}
        >
          {restoring ? <ActivityIndicator color={colors.mauve} /> : <Text style={styles.secondaryText}>Khôi phục giao dịch</Text>}
        </Pressable>
        <Pressable
          disabled={Platform.OS !== "android"}
          onPress={() => void manageSubscription()}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Quản lý hoặc hủy gói trên Google Play</Text>
        </Pressable>
        <Text style={styles.footnote}>
          Không nhập thông tin thẻ vào Picket. Hoàn tiền và hủy gia hạn được xử lý theo chính sách Google Play.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { gap: 14, padding: 24, paddingBottom: 48 },
  back: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
  title: { color: colors.ink, fontSize: 32, fontWeight: "800", lineHeight: 38 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  currentPlan: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, gap: 6, padding: 16 },
  currentPlanTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  currentPlanText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  notice: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  planCard: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.large, borderWidth: 1, gap: 14, padding: 18 },
  planHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  planNameBlock: { flex: 1 },
  planName: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  cadence: { color: colors.muted, fontSize: 13, marginTop: 3 },
  price: { color: colors.mauve, fontSize: 17, fontWeight: "800" },
  planSummary: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 50 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  secondary: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
  linkButton: { alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.mauve, fontSize: 14, fontWeight: "700", textAlign: "center" },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  success: { color: colors.income, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
