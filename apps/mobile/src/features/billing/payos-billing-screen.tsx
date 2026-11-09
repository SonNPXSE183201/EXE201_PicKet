import { useEffect, useRef, useState } from "react";
import { AppState, Linking, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  formatPaymentCountdown,
  formatVnd,
  openPaymentOrder,
  PAYMENT_ORDER_PHASE_LABELS,
  paymentOrderPhase,
  paymentSecondsLeft,
  type PaymentCustomer,
} from "@picket/domain";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { AuthField, AuthMessage } from "@/features/auth/auth-screen";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { planScreenTitle } from "@/features/billing/billing-title";
import { Chip, FigmaButton, ReceiptDivider, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { figmaType } from "@picket/design-tokens";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useTranslation } from "react-i18next";

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

type Phase = ReturnType<typeof paymentOrderPhase>;
const phaseTone = (phase: Phase) =>
  phase === "paid" ? "success" : phase === "pending" || phase === "verifying" || phase === "review" ? "warning" : "outline";

function PayosBillingContent({ token }: { token: string }) {
  const { t } = useTranslation("auth");
  const [data, setData] = useState<PaymentCustomer | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [tier, setTier] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmSku, setConfirmSku] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const verified = useRef(new Set<string>());
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
      ])
        .then(([next, entitlement]) => {
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
  const hasPending = Boolean(data?.orders.some((o) => o.status === "pending"));
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);
  // When a 15-minute link runs out, ask the server to re-read it at PayOS
  // (money may have arrived at the last second) instead of assuming expiry.
  useEffect(() => {
    const overdue = data?.orders.find(
      (o) =>
        o.status === "pending" &&
        paymentOrderPhase(o, now) === "verifying" &&
        !verified.current.has(o.id),
    );
    if (!overdue || inFlight.current) return;
    verified.current.add(overdue.id);
    void run(() => picketApi!.paymentAction(token, overdue.id, "refresh"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, now]);
  const open = data ? openPaymentOrder(data.orders, now) : undefined;
  function checkout(sku: string) {
    setConfirmSku(null);
    const code = promoCode.trim().toUpperCase() || undefined;
    // A retry reuses the key only for the same plan and the same code.
    const scope = `${sku}|${code ?? ""}`;
    void run(async () => {
      const requestKey = key.current.get(scope) ?? Crypto.randomUUID();
      key.current.set(scope, requestKey);
      const result = await picketApi!.paymentCheckout(token, sku, requestKey, code);
      key.current.delete(scope);
      return result;
    });
  }
  const { colors } = useMobileStyles(createStyles);
  const tones = [colors.pocketBlue, colors.pocketLilac];
  const paperCard = [{ backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6 }, figmaShadow("paper")];
  return (
    <PicketScreen>
      <TopAppBar title={planScreenTitle} />
      <Text style={[figmaType.bodySmall, { color: colors.muted, marginTop: 16 }]}>
        {t("Thanh toán trước qua PayOS. Không tự động gia hạn.")}
      </Text>
      {message ? <View style={{ marginTop: 16 }}><AuthMessage>{t(message)}</AuthMessage></View> : null}
      {tier && (
        <View style={[paperCard, { marginTop: 16, paddingVertical: 14, gap: 6 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{t("Gói hiện tại")}</Text>
            <Chip tone={tier === "free" ? "outline" : "success"} label={tier.toUpperCase()} />
          </View>
          {tier !== "free" && (
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
              {t("Bạn đang có gói trả phí. Có thể mua gói mới khi gói hiện tại hết hạn.")}
            </Text>
          )}
        </View>
      )}
      {!data && <View style={{ marginTop: 20, gap: 12 }}><Skeleton height={156} radius={22} /><Skeleton height={156} radius={22} /></View>}
      {data && !data.catalog.length && <Text style={[figmaType.bodySmall, { color: colors.muted, marginTop: 20 }]}>{t("Các gói PayOS chưa mở bán.")}</Text>}
      {!!data?.catalog.length && tier === "free" && (
        <View style={{ marginTop: 20 }}>
          <AuthField
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder={t("Mã ưu đãi (nếu có)")}
            autoCapitalize="characters"
            maxLength={32}
          />
        </View>
      )}
      <View style={{ marginTop: 20, gap: 14 }}>
        {data?.catalog.map((plan, index) => (
          <View key={plan.sku} style={[{ backgroundColor: tones[index % tones.length], borderRadius: 22, borderBottomLeftRadius: 10, padding: 16, gap: 10 }, figmaShadow("paper")]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{plan.tier === "pro" ? "Pro" : "Plus"}</Text>
              {plan.promotion && <Chip tone="success" label={`-${plan.promotion.percent}%`} />}
            </View>
            <Text style={[figmaType.bodySmall, { color: colors.text }]}>
              {t(plan.months === 12 ? "1 năm" : "1 tháng")} · {formatVnd(plan.amount)}
              {plan.promotion && plan.list_amount
                ? ` (${t("Giảm {{percent}}% từ {{price}}", { percent: plan.promotion.percent, price: formatVnd(plan.list_amount) })})`
                : ""}
            </Text>
            {plan.promotion && (
              <Text style={[figmaType.captionStrong, { color: colors.muted }]}>
                {plan.promotion.name}
                {plan.promotion.slotsLeft !== null
                  ? ` · ${t("Còn {{count}} suất", { count: plan.promotion.slotsLeft })}`
                  : ""}
                {plan.promotion.endsAt
                  ? ` · ${t("Đến {{date}}", { date: new Date(plan.promotion.endsAt).toLocaleDateString() })}`
                  : ""}
              </Text>
            )}
            <FigmaButton
              fullWidth
              label="Tạo thanh toán"
              disabled={busy || tier === null || tier !== "free"}
              onPress={() => (open ? setConfirmSku(plan.sku) : checkout(plan.sku))}
            />
          </View>
        ))}
      </View>
      {confirmSku && open && (
        <View style={[paperCard, { marginTop: 16, paddingVertical: 14, gap: 10 }]}>
          <Text style={[figmaType.bodySmall, { color: colors.text }]}>
            {t("Link thanh toán đang mở sẽ bị hủy. Mỗi lần mua dùng một link mới có hạn 15 phút.")}
          </Text>
          <FigmaButton fullWidth label="Hủy link cũ và tạo link mới" disabled={busy} onPress={() => checkout(confirmSku)} />
          <FigmaButton fullWidth variant="text" size="medium" label="Giữ link hiện tại" onPress={() => setConfirmSku(null)} />
        </View>
      )}
      <View style={{ marginTop: 24, gap: 8 }}>
        <Text accessibilityRole="header" style={[figmaType.overline, { color: colors.muted }]}>{t("Lịch sử thanh toán").toUpperCase()}</Text>
        {data?.orders.length ? (
          <View style={paperCard}>
            {data.orders.map((order, index) => {
              const phase = paymentOrderPhase(order, now);
              return (
                <View key={order.id}>
                  {index > 0 && <ReceiptDivider />}
                  <View style={{ paddingVertical: 12, gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <Text style={[figmaType.bodyStrong, { color: colors.text, flex: 1 }]}>#{order.order_code} · {formatVnd(order.amount)}</Text>
                      <Chip tone={phaseTone(phase)} label={t(PAYMENT_ORDER_PHASE_LABELS[phase])} />
                    </View>
                    {phase === "pending" && (
                      <>
                        <Text style={[figmaType.captionStrong, { color: colors.muted }]}>
                          {t("Link hết hạn sau")} {formatPaymentCountdown(paymentSecondsLeft(order, now))}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                          {order.checkout_url && (
                            <FigmaButton
                              size="medium"
                              label="Mở thanh toán"
                              disabled={busy}
                              onPress={() => void Linking.openURL(order.checkout_url!).catch(() => setMessage("Không mở được trình duyệt."))}
                            />
                          )}
                          <FigmaButton variant="outline" size="medium" label="Kiểm tra thanh toán" disabled={busy} onPress={() => void run(() => picketApi!.paymentAction(token, order.id, "refresh"))} />
                          <FigmaButton variant="text" size="medium" label="Hủy thanh toán" disabled={busy} onPress={() => void run(() => picketApi!.paymentAction(token, order.id, "cancel"))} />
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
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
