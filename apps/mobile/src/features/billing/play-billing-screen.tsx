import { PicketText as Text } from "@/core/ui/picket-text";
import { planScreenTitle } from "@/features/billing/billing-title";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { FigmaButton, Skeleton } from "@/core/ui/figma-ui";
import { BillingSection, CadenceToggle, CurrentPlanHero, IncludedList, PlanTiles, ThankYouCard, type PlanTileModel } from "@/features/billing/billing-ui";
import { figmaType } from "@picket/design-tokens";

import { useTranslation } from "react-i18next";
import type { billingVi } from "@/core/i18n/billing-resources";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
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
} from "expo-iap";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { useAuth } from "@/features/auth/auth-context";
import { verifyRestoredPurchases } from "@/features/billing/restore-results";
import { usePlayBilling } from "@/features/billing/play-billing-provider";
import {
  isPicketSubscriptionId,
  canStartPlayPurchase,
  verifyAndFinishPurchase,
} from "@/features/billing/billing-policy";

const planKeys: Record<
  PicketSubscriptionId,
  { name: string; cadence: string; summary: string }
> = {
  picket_plus_monthly: {
    name: "Picket Plus",
    cadence: "monthly",
    summary: "plusMonthly",
  },
  picket_plus_yearly: {
    name: "Picket Plus",
    cadence: "yearly",
    summary: "plusYearly",
  },
  picket_pro_monthly: {
    name: "Picket Pro",
    cadence: "monthly",
    summary: "proMonthly",
  },
  picket_pro_yearly: {
    name: "Picket Pro",
    cadence: "yearly",
    summary: "proYearly",
  },
};

function purchaseOffer(product:ProductSubscription){
  return product.subscriptionOffers?.find(offer=>
    typeof offer.offerTokenAndroid==="string"&&offer.offerTokenAndroid.trim().length>0&&
    typeof offer.displayPrice==="string"&&offer.displayPrice.trim().length>0);
}

export function PlayBillingScreen() {
  const { session } = useAuth();
  if (Platform.OS !== "android") return <Redirect href="/profile" />;
  if (!session) return <Redirect href={routes.login} />;
  return <BillingContent key={session.user.id} accessToken={session.access_token} userId={session.user.id} />;
}

function BillingContent({ accessToken, userId }: { accessToken: string; userId: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("billing");
  const [cadence, setCadence] = useState<"monthly" | "yearly">("monthly");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{key:keyof typeof billingVi;tier?:string} | null>(null);
  const [success, setSuccess] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [availability, setAvailability] = useState<{ token: string; ready: boolean } | null>(null);
  const storeReady = availability?.token === accessToken && availability.ready;
  const checkingStore = Boolean(picketApi) && availability?.token !== accessToken;
  const processingTokens = useRef(new Set<string>());
  const [catalogueAttempt,setCatalogueAttempt]=useState(0);
  const [catalogueLoading,setCatalogueLoading]=useState(false);
  const catalogueBusy=useRef(false);
  const entitlementRead = useRef(0);
  const operationScope = useRef({active:true,token:accessToken,restoring:false,purchasing:false,controller:new AbortController()});
  useEffect(()=>{
    const scope={active:true,token:accessToken,restoring:false,purchasing:false,controller:new AbortController()};
    operationScope.current=scope;
    void Promise.resolve().then(()=>{
      if(!scope.active)return;
      if(!scope.restoring)setRestoring(false);
      if(!scope.purchasing)setBusyProduct(null);
    });
    return()=>{scope.active=false;scope.controller.abort();};
  },[accessToken]);

  const {
    connected,
    subscriptions,
    fetchProducts,
    finishTransaction,
    requestPurchase,
    revision,
  } = usePlayBilling({
    onPurchaseSuccess: (purchase) => {
      void verifyStorePurchase(purchase);
    },
    onPurchaseError: (error) => {
      if(!operationScope.current.active||operationScope.current.token!==accessToken)return;
      operationScope.current.purchasing=false;
      setBusyProduct(null);
      setSuccess(false);
      setMessage(
        error.code === "user-cancelled"
          ? {key:"cancelled"}
          : {key:"purchaseError"},
      );
    },
    onError: () => {
      setMessage({key:"connectionError"});
    },
  });

  useEffect(() => {
    const controller=new AbortController();
    let active=true;
    if (!picketApi) return () => controller.abort();
    void picketApi.billingAvailability(accessToken, controller.signal)
      .then(status => {
        if (active) setAvailability({ token: accessToken, ready: canStartPlayPurchase("android", true, status) });
      })
      .catch(() => {
        if (active) setAvailability({ token: accessToken, ready: false });
      });
    return ()=>{active=false;controller.abort();};
  },[accessToken]);

  useEffect(() => {
    if (!connected || Platform.OS !== "android") return;
    let active=true;
    catalogueBusy.current=true;
    void Promise.resolve().then(async()=>{
      if(!active)return;
      setCatalogueLoading(true);
      setMessage(value=>value?.key==="connectionError"?null:value);
      try{await fetchProducts({ skus: [...PICKET_SUBSCRIPTION_IDS], type: "subs" });}
      catch{if(active)setMessage({key:"connectionError"});}
      finally{if(active){catalogueBusy.current=false;setCatalogueLoading(false);}}
    });
    return()=>{active=false;catalogueBusy.current=false;};
  }, [connected, fetchProducts,catalogueAttempt]);

  useEffect(() => {
    if (!picketApi) return;
    let active = true;
    const request=++entitlementRead.current;
    void picketApi
      .currentEntitlements(accessToken)
      .then((value) => {
        if (active&&request===entitlementRead.current) {
          setEntitlements(value);
          if(revision>0){setBusyProduct(null);operationScope.current.purchasing=false;setMessage(null);}
        }
      })
      .catch(() => {
        if (active&&request===entitlementRead.current) setEntitlements(null);
      });
    return () => {
      active = false;
    };
  }, [accessToken,revision]);

  async function refreshEntitlements(current:()=>boolean) {
    if (!picketApi) return;
    const request=++entitlementRead.current;
    const value=await picketApi.currentEntitlements(accessToken);
    if(current()&&request===entitlementRead.current)setEntitlements(value);
  }

  async function verifyStorePurchase(purchase: Purchase) {
    const scope=operationScope.current;
    const current=()=>scope.active&&operationScope.current===scope&&scope.token===accessToken;
    if(!current())return false;
    const token = purchase.purchaseToken;
    if (!token || processingTokens.current.has(token)) return false;
    processingTokens.current.add(token);
    setBusyProduct(purchase.productId);
    setSuccess(false);
    setMessage({key:"verifying"});
    try {
      const api = picketApi;
      if (!api) throw new Error("Chưa kích hoạt được gói. Hãy thử lại sau.");
      const result = await verifyAndFinishPurchase(
        purchase,
        (request) => {
          if(!current())throw new Error("Billing session changed");
          return api.verifyPlayPurchase(accessToken, request,scope.controller.signal);
        },
        () => {
          if(!current())throw new Error("Billing session changed");
          return finishTransaction({ purchase, isConsumable: false });
        },
      );
      if(!current())return false;
      try {
        await refreshEntitlements(current);
      } catch {
        if(current()){setSuccess(false);setMessage({key:"refreshError"});}
        return true;
      }
      if(!current())return false;
      setSuccess(true);
      setMessage(
        result.active
          ? {key:"activated",tier:result.tier.toUpperCase()}
          : {key:"expired"},
      );
      return true;
    } catch {
      if(!current())return false;
      setSuccess(false);
      setMessage(
        {key:"verifyError"},
      );
      return false;
    } finally {
      processingTokens.current.delete(token);
      if(current()){scope.purchasing=false;setBusyProduct(null);}
    }
  }

  async function purchase(product: ProductSubscription) {
    if (Platform.OS !== "android" || product.platform !== "android") return;
    const scope=operationScope.current;
    const current=()=>scope.active&&operationScope.current===scope&&scope.token===accessToken;
    if(!current()||catalogueBusy.current||scope.purchasing||scope.restoring||processingTokens.current.size>0)return;
    if(!canStartPlayPurchase(Platform.OS,connected,{newPurchasesEnabled:storeReady})) {
      setSuccess(false);setMessage({key:"notReady"});return;
    }
    const offerToken = purchaseOffer(product)?.offerTokenAndroid;
    if (!offerToken) {
      setSuccess(false);
      return setMessage({key:"offerMissing"});
    }
    scope.purchasing=true;
    setBusyProduct(product.id);
    setSuccess(false);
    setMessage(null);
    try {
      const obfuscatedAccountId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        userId,
      );
      if(!current())return;
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
    } catch {
      if(current()){scope.purchasing=false;setBusyProduct(null);setMessage({key:"openError"});}
    }
  }

  async function restore() {
    if (!connected || Platform.OS !== "android") return;
    const scope=operationScope.current;
    const current=()=>scope.active&&operationScope.current===scope&&scope.token===accessToken;
    if(!current()||scope.restoring||scope.purchasing||processingTokens.current.size>0)return;
    scope.restoring=true;
    setRestoring(true);
    setSuccess(false);
    setMessage(null);
    let purchasesVerified=false;
    try {
      const purchases = await getAvailablePurchases({
        includeSuspendedAndroid: false,
      });
      if(!current())return;
      const eligible = purchases.filter(
        (item) => isPicketSubscriptionId(item.productId) && item.purchaseToken,
      );
      if (eligible.length === 0) {
        setMessage({key:"restoreEmpty"});
        return;
      }
      const restored = await verifyRestoredPurchases(eligible, item=>current()?verifyStorePurchase(item):Promise.resolve(false));
      if(!current())return;
      purchasesVerified=restored.verified>0;
      await refreshEntitlements(current);
      if(!current())return;
      setSuccess(restored.failed === 0 && restored.verified > 0);
      setMessage(restored.failed === 0
        ? {key:"restoreSuccess"}
        : restored.verified > 0
          ? {key:"restorePartial"}
          : {key:"restoreFailed"});
    } catch {
      if(current())setMessage({key:purchasesVerified?"refreshError":"restoreError"});
    } finally {
      scope.restoring=false;
      if(current())setRestoring(false);
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
      setMessage({key:"manageError"});
    }
  }

  const orderedProducts = subscriptions.filter(
    product => product.id.endsWith(cadence) && (product.platform !== "android" ||
      !product.productStatusAndroid || product.productStatusAndroid === "ok"),
  ).sort(
    (left, right) =>
      PICKET_SUBSCRIPTION_IDS.indexOf(left.id as PicketSubscriptionId) -
      PICKET_SUBSCRIPTION_IDS.indexOf(right.id as PicketSubscriptionId),
  );

  const tier = entitlements?.tier ?? "free";
  const selectedProduct = orderedProducts.find((product) => product.id === selectedId) ?? orderedProducts[0];
  const tiles: PlanTileModel[] = orderedProducts.filter((product) => isPicketSubscriptionId(product.id)).map((product) => {
    const keys = planKeys[product.id as PicketSubscriptionId];
    const isPro = product.id.startsWith("picket_pro_");
    return {
      id: product.id,
      tier: isPro ? "pro" : "plus",
      name: keys.name,
      quota: t("quotaAmount", { count: isPro ? 100 : 30 }),
      price: purchaseOffer(product)?.displayPrice ?? t("priceUnavailable"),
      note: t(keys.cadence),
      current: entitlements?.tier === (isPro ? "pro" : "plus"),
    };
  });
  const selectedKeys = selectedProduct && isPicketSubscriptionId(selectedProduct.id) ? planKeys[selectedProduct.id] : null;
  const purchaseDisabled = !selectedProduct || catalogueLoading || !purchaseOffer(selectedProduct) || !storeReady || !connected || busyProduct !== null || restoring;

  return (
    <PicketScreen>
      <TopAppBar title={planScreenTitle} />
      <View style={styles.content}>
        {!storeReady && <Text accessibilityLiveRegion="polite" style={styles.notice}>{t(checkingStore ? "checking" : "notReady")}</Text>}
        {entitlements ? (
          <CurrentPlanHero
            label={t("current", { tier: entitlements.tier.toUpperCase() })}
            headline={t("quotaHeadline", { remaining: entitlements.ocrFallbackRemaining, limit: entitlements.ocrFallbackDailyLimit })}
            meter={entitlements.ocrFallbackRemaining / Math.max(1, entitlements.ocrFallbackDailyLimit)}
            caption={t("remainingLabel")}
            warning={entitlements.ocrFallbackRemaining === 0 ? t("exhausted") : null}
          />
        ) : (
          <Skeleton height={150} radius={28} />
        )}
        {tier !== "free" && <ThankYouCard title={t("thanksTitle")} body={t("thanksBody", { tier: tier.toUpperCase() })} />}
        {tier !== "pro" && (
          <>
            <CadenceToggle
              value={cadence}
              disabled={busyProduct !== null || restoring}
              onChange={(value) => { setCadence(value); setSelectedId(null); }}
              monthlyLabel={t("monthlyTab")}
              yearlyLabel={t("yearlyTab")}
            />
            {Platform.OS !== "android" ? (
              <Text style={styles.notice}>{t("androidOnly")}</Text>
            ) : !connected ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator accessibilityLabel={t("connecting")} color={colors.link} />
                <Text style={styles.notice}>{t("connecting")}</Text>
              </View>
            ) : tiles.length === 0 ? (
              <Text style={styles.notice}>{t("pricesUnavailable")}</Text>
            ) : (
              <>
                <PlanTiles plans={tiles} selectedId={selectedProduct?.id ?? null} onSelect={setSelectedId} disabled={busyProduct !== null || restoring} currentLabel={t("currentBadge")} />
                <Text style={styles.notice}>{t(cadence === "monthly" ? "billedMonthly" : "billedYearly")}</Text>
                <FigmaButton
                  fullWidth
                  busy={busyProduct !== null && busyProduct === selectedProduct?.id}
                  disabled={purchaseDisabled}
                  label={t("upgrade", { name: selectedKeys?.name ?? "" })}
                  onPress={() => { if (selectedProduct) void purchase(selectedProduct); }}
                />
              </>
            )}
          </>
        )}
        <IncludedList title={t("includedTitle")} items={[t("localIncluded"), t("includedUnlimited"), t("includedSync")]} />
        {message && (
          <Text accessibilityLiveRegion="polite" style={success ? styles.success : styles.error}>
            {t(message.key,{tier:message.tier})}
          </Text>
        )}
        <BillingSection title={t("storeTools")}>
          {Platform.OS === "android" && tier !== "free" && (
            <FigmaButton fullWidth variant="outline" size="medium" label={t("manage")} onPress={() => void manageSubscription()} />
          )}
          {connected && (
            <FigmaButton
              fullWidth
              variant="outline"
              size="medium"
              disabled={catalogueLoading || restoring || busyProduct !== null}
              label={t(catalogueLoading ? "loadingPrices" : "reloadPrices")}
              onPress={() => { if (!catalogueBusy.current) setCatalogueAttempt((value) => value + 1); }}
            />
          )}
          <FigmaButton
            fullWidth
            variant="text"
            size="medium"
            busy={restoring}
            disabled={!connected || restoring || busyProduct !== null}
            label={t("restore")}
            onPress={() => void restore()}
          />
          {Platform.OS === "android" && tier === "free" && (
            <FigmaButton fullWidth variant="text" size="medium" label={t("manage")} onPress={() => void manageSubscription()} />
          )}
          <Text style={styles.footnote}>{t("footnote")}</Text>
        </BillingSection>
      </View>
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  content: { gap: 16, marginTop: 16, paddingBottom: 32 },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  notice: { ...figmaType.bodySmall, color: colors.muted },
  footnote: { ...figmaType.captionStrong, color: colors.muted, textAlign: "center" },
  error: { ...figmaType.bodySmall, color: colors.danger },
  success: { ...figmaType.bodyStrong, color: colors.income },
});
