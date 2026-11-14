import { useEffect, useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as ExpoLinking from "expo-linking";
import { AppState, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  formatPaymentCountdown,
  formatVnd,
  openPaymentOrder,
  PAYMENT_ORDER_PHASE_LABELS,
  paymentOrderPhase,
  paymentSecondsLeft,
  type Entitlements,
  type PaymentCustomer,
} from "@picket/domain";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { AuthField, AuthMessage } from "@/features/auth/auth-screen";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { planScreenTitle } from "@/features/billing/billing-title";
import { BillingSection, CadenceToggle, CurrentPlanHero, IncludedList, PlanTiles, ThankYouCard, type Cadence, type PlanTileModel } from "@/features/billing/billing-ui";
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
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
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
      // Read entitlements only after the action: a refresh may be what grants the plan.
      const next = await action();
      const entitlement = await picketApi.currentEntitlements(token);
      if (
        active.current &&
        tokenRef.current === scope &&
        readRevision.current === revision
      ) {
        setData(next);
        setTier(entitlement?.tier ?? "free");
        setQuota(quotaOf(entitlement));
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
        setQuota(quotaOf(entitlement));
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
  /** Pull to refresh: re-reads a pending order at PayOS (money may have just arrived), then the plan. */
  function pullToRefresh() {
    const pending = open?.status === "pending" ? open : undefined;
    return run(() => (pending ? picketApi!.paymentAction(token, pending.id, "refresh") : picketApi!.paymentCustomer(token)));
  }
  /** PayOS opens in an in-app browser tab; when it returns to the app the order is re-read at PayOS
      and the plan is refreshed, so the screen never keeps showing the old tier. */
  async function openCheckout(orderId: string, url: string) {
    try {
      await WebBrowser.openAuthSessionAsync(url, ExpoLinking.createURL("billing"));
    } catch {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        setMessage("Không mở được trang thanh toán.");
        return;
      }
    }
    await run(() => picketApi!.paymentAction(token, orderId, "refresh"));
  }
  function checkout(sku: string) {
    setConfirmSku(null);
    const code = promoCode.trim().toUpperCase() || undefined;
    // A retry reuses the key only for the same plan and the same code.
    const scope = `${sku}|${code ?? ""}`;
    void run(async () => {
      const requestKey = key.current.get(scope) ?? Crypto.randomUUID();
      key.current.set(scope, requestKey);
      const result = await picketApi!.paymentCheckout(token, sku, requestKey, code, "app");
      key.current.delete(scope);
      return result;
    });
  }
  const { colors } = useMobileStyles(createStyles);
  const paid = tier !== null && tier !== "free";
  const tierName = (value: string) => (value === "pro" ? "Pro" : value === "plus" ? "Plus" : t("Miễn phí"));
  const hasYearly = Boolean(data?.catalog.some((plan) => plan.months === 12));
  const plans = (data?.catalog ?? []).filter((plan) => !hasYearly || plan.months === (cadence === "yearly" ? 12 : 1));
  const selected = plans.find((plan) => plan.sku === selectedSku) ?? plans[0];
  const tiles: PlanTileModel[] = plans.map((plan) => ({
    id: plan.sku,
    tier: plan.tier,
    name: tierName(plan.tier),
    quota: t("{{count}} lượt / 24 giờ", { count: plan.tier === "pro" ? 100 : 30 }),
    price: `${formatVnd(plan.amount)}${plan.months === 12 ? t(" / năm") : t(" / tháng")}`,
    badge: plan.promotion ? `-${plan.promotion.percent}%` : null,
    note: plan.promotion && plan.list_amount
      ? [
          t("Giảm {{percent}}% từ {{price}}", { percent: plan.promotion.percent, price: formatVnd(plan.list_amount) }),
          plan.promotion.name,
          plan.promotion.slotsLeft !== null ? t("Còn {{count}} suất", { count: plan.promotion.slotsLeft }) : "",
          plan.promotion.endsAt ? t("Đến {{date}}", { date: new Date(plan.promotion.endsAt).toLocaleDateString() }) : "",
        ].filter(Boolean).join(" · ")
      : null,
  }));
  return (
    <PicketScreen onRefresh={pullToRefresh}>
      <TopAppBar title={planScreenTitle} />
      <View style={{ marginTop: 16, gap: 16 }}>
        {message ? <AuthMessage>{t(message)}</AuthMessage> : null}
        {tier ? (
          <CurrentPlanHero
            label={t("Gói hiện tại · {{tier}}", { tier: paid ? tier.toUpperCase() : tierName(tier) })}
            headline={quota ? t("{{remaining}}/{{limit}} lượt", { remaining: quota.remaining, limit: quota.limit }) : tierName(tier)}
            meter={quota ? quota.remaining / Math.max(1, quota.limit) : null}
            caption={paid ? t("Thanh toán trước qua PayOS. Không tự động gia hạn.") : t("Lượt quét cloud hôm nay")}
          />
        ) : (
          <Skeleton height={150} radius={28} />
        )}
        {paid && (
          <ThankYouCard
            title={t("Cảm ơn bạn đã ủng hộ Picket!")}
            body={t("Bạn đang có gói trả phí. Có thể mua gói mới khi gói hiện tại hết hạn.")}
          />
        )}
        {!data && <Skeleton height={168} radius={18} />}
        {data && !data.catalog.length && <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{t("Các gói PayOS chưa mở bán.")}</Text>}
        {!paid && !!tiles.length && (
          <>
            {hasYearly && (
              <CadenceToggle
                value={cadence}
                disabled={busy}
                onChange={(value) => { setCadence(value); setSelectedSku(null); }}
                monthlyLabel={t("Theo tháng")}
                yearlyLabel={t("Theo năm")}
              />
            )}
            <PlanTiles plans={tiles} selectedId={selected?.sku ?? null} onSelect={setSelectedSku} disabled={busy} currentLabel={t("Gói hiện tại")} />
            <AuthField
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder={t("Mã ưu đãi (nếu có)")}
              autoCapitalize="characters"
              maxLength={32}
            />
          </>
        )}
        <IncludedList
          title={t("Gói nào cũng có")}
          items={[t("Quét hoá đơn trên máy, không trừ lượt"), t("Thu chi, ví, túi ngân sách không giới hạn"), t("Đồng bộ và sao lưu dữ liệu")]}
        />
        {!paid && selected && (
          <FigmaButton
            fullWidth
            label={t("Nâng cấp lên {{name}}", { name: tierName(selected.tier) })}
            disabled={busy || tier === null}
            onPress={() => (open ? setConfirmSku(selected.sku) : checkout(selected.sku))}
          />
        )}
        {confirmSku && open && (
          <View style={[{ backgroundColor: colors.paper, borderRadius: 18, padding: 16, gap: 10 }, figmaShadow("paper")]}>
            <Text style={[figmaType.bodySmall, { color: colors.text }]}>
              {t("Link thanh toán đang mở sẽ bị hủy. Mỗi lần mua dùng một link mới có hạn 15 phút.")}
            </Text>
            <FigmaButton fullWidth label="Hủy link cũ và tạo link mới" disabled={busy} onPress={() => checkout(confirmSku)} />
            <FigmaButton fullWidth variant="text" size="medium" label="Giữ link hiện tại" onPress={() => setConfirmSku(null)} />
          </View>
        )}
        {!!data?.orders.length && (
          <BillingSection title={t("Lịch sử thanh toán")}>
            {data.orders.map((order, index) => {
              const phase = paymentOrderPhase(order, now);
              return (
                <View key={order.id}>
                  {index > 0 && <ReceiptDivider />}
                  <View style={{ paddingVertical: 8, gap: 8 }}>
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
                              onPress={() => void openCheckout(order.id, order.checkout_url!)}
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
          </BillingSection>
        )}
      </View>
    </PicketScreen>
  );
}

function quotaOf(entitlement: Partial<Entitlements> | null | undefined) {
  return typeof entitlement?.ocrFallbackRemaining === "number" && typeof entitlement.ocrFallbackDailyLimit === "number"
    ? { remaining: entitlement.ocrFallbackRemaining, limit: entitlement.ocrFallbackDailyLimit }
    : null;
}

const createStyles = (_colors: MobileThemeColors) => StyleSheet.create({});
