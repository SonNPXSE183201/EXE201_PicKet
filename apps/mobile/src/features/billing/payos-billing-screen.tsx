import { useEffect, useRef, useState } from "react";
import { AppState, Linking, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import * as Crypto from "expo-crypto";
import { formatVnd, type PaymentCustomer } from "@picket/domain";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { AuthMessage } from "@/features/auth/auth-screen";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { planScreenTitle } from "@/features/billing/billing-title";
import { Chip, FigmaButton, ReceiptDivider, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { figmaType } from "@picket/design-tokens";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
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
      const next = await action();
      if (
        active.current &&
        tokenRef.current === scope &&
        readRevision.current === revision
      )
        setData(next);
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
      void picketApi
        ?.paymentCustomer(token)
        .then((next) => {
          if (
            active.current &&
            tokenRef.current === token &&
            readRevision.current === revision
          )
            setData(next);
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
  const { colors } = useMobileStyles(createStyles);
  const hasPending = () => data?.orders.some((o) => o.status === "pending" && Date.parse(o.expires_at) > Date.now()) ?? false;
  const tones = [colors.pocketBlue, colors.pocketLilac];
  const statusLabel = (status: string) => t(status === "paid" ? "Đã thanh toán" : status === "review" ? "Cần đối soát" : status === "pending" ? "Chờ thanh toán" : status === "cancelled" ? "Đã hủy" : "Hết hạn");
  return (
    <PicketScreen>
      <TopAppBar title={planScreenTitle} />
      <Text style={[figmaType.bodySmall, { color: colors.muted, marginTop: 16 }]}>Thanh toán trước qua PayOS. Không tự động gia hạn.</Text>
      {message ? <View style={{ marginTop: 16 }}><AuthMessage>{message}</AuthMessage></View> : null}
      {!data && <View style={{ marginTop: 20, gap: 12 }}><Skeleton height={156} radius={22} /><Skeleton height={156} radius={22} /></View>}
      {data && !data.catalog.length && <Text style={[figmaType.bodySmall, { color: colors.muted, marginTop: 20 }]}>{t('Các gói PayOS chưa mở bán.')}</Text>}
      <View style={{ marginTop: 20, gap: 14 }}>
        {data?.catalog.map((plan, index) => (
          <View key={plan.sku} style={[{ backgroundColor: tones[index % tones.length], borderRadius: 22, borderBottomLeftRadius: 10, padding: 16, gap: 10 }, figmaShadow("paper")]}>
            <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{plan.tier === "pro" ? "Pro" : "Plus"}</Text>
            <Text style={[figmaType.bodySmall, { color: colors.text }]}>{t(plan.months === 12 ? "1 năm" : "1 tháng")} · {formatVnd(plan.amount)}</Text>
            <FigmaButton
              fullWidth
              label="Tạo thanh toán"
              disabled={busy || hasPending()}
              onPress={() =>
                void run(() => {
                  const requestKey = key.current.get(plan.sku) ?? Crypto.randomUUID();
                  key.current.set(plan.sku, requestKey);
                  return picketApi!.paymentCheckout(token, plan.sku, requestKey);
                })
              }
            />
          </View>
        ))}
      </View>
      <View style={{ marginTop: 24, gap: 8 }}>
        <Text accessibilityRole="header" style={[figmaType.overline, { color: colors.muted }]}>{t('Lịch sử thanh toán').toUpperCase()}</Text>
        {data?.orders.length ? (
          <View style={[{ backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6 }, figmaShadow("paper")]}>
            {data.orders.map((order, index) => (
              <View key={order.id}>
                {index > 0 && <ReceiptDivider />}
                <View style={{ paddingVertical: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={[figmaType.bodyStrong, { color: colors.text, flex: 1 }]}>#{order.order_code} · {formatVnd(order.amount)}</Text>
                    <Chip tone={order.status === "paid" ? "success" : order.status === "pending" || order.status === "review" ? "warning" : "outline"} label={statusLabel(order.status)} />
                  </View>
                  {order.status === "pending" && (
                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      {order.checkout_url && (
                        <FigmaButton
                          size="medium"
                          label="Mở thanh toán"
                          disabled={busy}
                          onPress={() => void Linking.openURL(order.checkout_url!).catch(() => setMessage("Không mở được trình duyệt."))}
                        />
                      )}
                      <FigmaButton variant="outline" size="medium" label="Kiểm tra thanh toán" onPress={() => void run(() => picketApi!.paymentAction(token, order.id, "refresh"))} />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 16, alignItems: "center" }}>
        <FigmaButton variant="text" size="medium" label="Tải lại" onPress={() => void run(() => picketApi!.paymentCustomer(token))} />
      </View>
    </PicketScreen>
  );
}

const createStyles = (_colors: MobileThemeColors) => StyleSheet.create({});
