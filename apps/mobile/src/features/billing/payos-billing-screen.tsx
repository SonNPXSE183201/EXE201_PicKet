import { useEffect, useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { Redirect } from "expo-router";
import * as Crypto from "expo-crypto";
import { formatVnd, type PaymentCustomer } from "@picket/domain";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import {
  AuthMessage,
  AuthScreen,
  PrimaryButton,
  TextLink,
} from "@/features/auth/auth-screen";
import { PicketText as Text } from "@/core/ui/picket-text";
import {useTranslation} from 'react-i18next';

export function PayosBillingScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/(auth)/login" />;
  return (
    <PayosBillingContent
      key={`${session.user.id}:${session.access_token}`}
      token={session.access_token}
    />
  );
}
function PayosBillingContent({ token }: { token: string }) {
  const {t}=useTranslation('auth');
  const [data, setData] = useState<PaymentCustomer | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [tier, setTier] = useState<string | null>(null);
  const key = useRef(new Map<string, string>()),
    active = useRef(true);
  const inFlight = useRef(false),
    readRevision = useRef(0);
  const tokenRef = useRef(token);
  async function run(action: () => Promise<PaymentCustomer>) {
    if (inFlight.current || !picketApi) return;
    inFlight.current = true;
    const scope = token;
    const revision = ++readRevision.current;
    setBusy(true);
    setMessage("");
    try {
      const [next, entitlement] = await Promise.all([
        action(),
        picketApi.currentEntitlements(token),
      ]);
      if (
        active.current &&
        tokenRef.current === scope &&
        readRevision.current === revision
      ) {
        setData(next);
        setTier(entitlement?.tier ?? "free");
      }
    } catch {
      if (active.current && tokenRef.current === scope)
        setMessage(
          "Không thể cập nhật thanh toán. Vui lòng kiểm tra kết nối và thử lại.",
        );
    } finally {
      inFlight.current = false;
      if (active.current && tokenRef.current === scope) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    tokenRef.current = token;
    function refresh() {
      if (inFlight.current) return;
      const revision = ++readRevision.current;
      if (!picketApi) return;
      void Promise.all([
        picketApi.paymentCustomer(token),
        picketApi.currentEntitlements(token),
      ]).then(([next, entitlement]) => {
          if (
            active.current &&
            tokenRef.current === token &&
            readRevision.current === revision
          ) {
            setData(next);
            setTier(entitlement?.tier ?? "free");
          }
        })
        .catch(() => {
          if (active.current && readRevision.current === revision)
            setMessage("Không thể tải gói thanh toán.");
        });
    }
    refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      active.current = false;
      listener.remove();
    };
  }, [token]);
  return (
    <AuthScreen
      title="Gói dịch vụ"
      subtitle="Thanh toán trước qua PayOS. Không tự động gia hạn."
    >
      {message && <AuthMessage>{message}</AuthMessage>}
      {tier && <Text>{t("Gói hiện tại")}: {tier.toUpperCase()}</Text>}
      {tier && tier !== "free" && <Text>{t("Bạn đang có gói trả phí. Có thể mua gói mới khi gói hiện tại hết hạn.")}</Text>}
      {!data && <Text>{t('Đang tải…')}</Text>}
      {data && !data.catalog.length && <Text>{t('Các gói PayOS chưa mở bán.')}</Text>}
      {data?.catalog.map((plan) => (
        <View key={plan.sku}>
          <Text>
            {plan.tier.toUpperCase()} ·{" "}
            {t(plan.months === 12 ? "1 năm" : "1 tháng")} ·{" "}
            {formatVnd(plan.amount)}
          </Text>
          <PrimaryButton
            label="Tạo thanh toán"
            disabled={
              busy ||
              tier === null || tier !== "free" ||
              data.orders.some(
                (o) =>
                  o.status === "pending" &&
                  Date.parse(o.expires_at) > Date.now(),
              )
            }
            onPress={() =>
              void run(async () => {
                const requestKey =
                  key.current.get(plan.sku) ?? Crypto.randomUUID();
                key.current.set(plan.sku, requestKey);
                const result = await picketApi!.paymentCheckout(token, plan.sku, requestKey);
                key.current.delete(plan.sku);
                return result;
              })
            }
          />
        </View>
      ))}
      <Text accessibilityRole="header">{t('Lịch sử thanh toán')}</Text>
      {data?.orders.map((order) => (
        <View key={order.id}>
          <Text>
            #{order.order_code} · {formatVnd(order.amount)} ·{" "}
            {t(order.status === "paid"
              ? "Đã thanh toán"
              : order.status === "review"
                ? "Cần đối soát"
                : order.status === "pending"
                  ? "Chờ thanh toán"
                  : order.status === "cancelled"
                    ? "Đã hủy"
                    : "Hết hạn")}
          </Text>
          {order.status === "pending" && (
            <>
              {order.checkout_url && (
                <PrimaryButton
                  label="Mở thanh toán"
                  disabled={busy}
                  onPress={() =>
                    void Linking.openURL(order.checkout_url!).catch(() =>
                      setMessage("Không mở được trình duyệt."),
                    )
                  }
                />
              )}
              <TextLink
                label="Kiểm tra thanh toán"
                onPress={() =>
                  void run(() =>
                    picketApi!.paymentAction(token, order.id, "refresh"),
                  )
                }
              />
              <PrimaryButton
                label="Hủy thanh toán"
                disabled={busy}
                onPress={() =>
                  void run(() => picketApi!.paymentAction(token, order.id, "cancel"))
                }
              />
            </>
          )}
        </View>
      ))}
      <TextLink
        label="Tải lại"
        onPress={() => void run(() => picketApi!.paymentCustomer(token))}
      />
    </AuthScreen>
  );
}
