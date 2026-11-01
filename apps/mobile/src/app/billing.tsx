import { MaterialCommunityIcons } from "@expo/vector-icons";
import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

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
import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
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

export default function BillingScreen() {
  const { session } = useAuth();
  if (Platform.OS !== "android") return <Redirect href="/profile" />;
  if (!session) return <Redirect href={routes.login} />;
  return <BillingContent key={session.user.id} accessToken={session.access_token} userId={session.user.id} />;
}

function BillingContent({ accessToken, userId }: { accessToken: string; userId: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("billing");
  const [cadence, setCadence] = useState<"monthly" | "yearly">("monthly");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {!storeReady && <Text accessibilityLiveRegion="polite" style={{color:colors.muted}}>{t(checkingStore ? "checking" : "notReady")}</Text>}
        <View style={styles.topHeader}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.headerTitle}>Nâng cấp Picket Plus</Text>
        </View>
        <View style={styles.heroCenter}>
          <Text style={styles.heroMain}>Quản lý tài chính không giới hạn</Text>
          <Text style={styles.heroSubtitle}>Mở khóa trọn bộ tính năng cao cấp & OCR AI thông minh</Text>
        </View>
        {entitlements && <View style={styles.currentPlan}>
          <View style={styles.currentHeading}>
            <View style={styles.currentIcon}><MaterialCommunityIcons name={entitlements.tier === "pro" ? "crown-outline" : entitlements.tier === "plus" ? "star-four-points-outline" : "sprout-outline"} size={28} color={colors.ink} /></View>
            <View style={styles.flex}><Text style={styles.currentPlanTitle}>{t("current",{tier:entitlements.tier.toUpperCase()})}</Text><Text style={styles.currentPlanText}>{t("remainingLabel")}</Text></View>
            <Text style={styles.allowance}>{entitlements.ocrFallbackRemaining}<Text style={styles.allowanceTotal}>/{entitlements.ocrFallbackDailyLimit}</Text></Text>
          </View>
          <View style={styles.meter}><View style={[styles.meterFill,{width:`${Math.min(100,Math.max(0,entitlements.ocrFallbackRemaining/Math.max(1,entitlements.ocrFallbackDailyLimit)*100))}%`}]} /></View>
          <Text style={styles.currentPlanText}>{t("quota",{remaining:entitlements.ocrFallbackRemaining,limit:entitlements.ocrFallbackDailyLimit})}</Text>
          {entitlements.ocrFallbackRemaining===0&&<Text accessibilityLiveRegion="polite" style={styles.exhausted}>{t("exhausted")}</Text>}
        </View>}
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{t("compare")}</Text><MaterialCommunityIcons name="receipt-text-outline" size={24} color={colors.link} /></View>
        <View accessibilityRole="tablist" style={styles.cadenceTabs}>
          {(["monthly","yearly"] as const).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:cadence===value}} disabled={busyProduct!==null||restoring} onPress={()=>setCadence(value)} style={[styles.cadenceTab,cadence===value&&styles.cadenceSelected]}><Text style={[styles.cadenceText,cadence===value&&styles.cadenceSelectedText]}>{t(value==="monthly"?"monthlyTab":"yearlyTab")}</Text></Pressable>)}
        </View>
        {Platform.OS !== "android" ? (
          <Text style={styles.notice}>{t("androidOnly")}</Text>
        ) : !connected ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator accessibilityLabel={t("connecting")} color={colors.link} />
            <Text style={styles.notice}>{t("connecting")}</Text>
          </View>
        ) : orderedProducts.length === 0 ? (
          <Text style={styles.notice}>
            {t("pricesUnavailable")}
          </Text>
        ) : (
          orderedProducts.map((product) => {
            if (!isPicketSubscriptionId(product.id)) return null;
            const keys = planKeys[product.id];
            const isPro=product.id.startsWith("picket_pro_");
            const isCurrent=entitlements?.tier===(isPro?"pro":"plus");
            const copy = {name:keys.name,cadence:t(keys.cadence),summary:t(keys.summary)};
            const offer=purchaseOffer(product);
            const purchaseDisabled = catalogueLoading || !offer || !storeReady || !connected || busyProduct !== null || restoring;
            const displayPrice=offer?.displayPrice??t("priceUnavailable");
            return (
              <View key={product.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={[styles.planIcon,{backgroundColor:isPro?colors.pocketLilac:colors.pocketMint}]}><MaterialCommunityIcons name={isPro?"crown-outline":"star-four-points-outline"} size={28} color={colors.ink}/></View>
                  <View style={styles.planNameBlock}>
                    <Text style={styles.planName}>{copy.name}</Text>
                    <Text style={styles.cadence}>{copy.cadence}</Text>
                    {isCurrent&&<Text style={styles.currentBadge}>{t("currentBadge")}</Text>}
                  </View>
                  <Text style={styles.price}>{displayPrice}</Text>
                </View>
                <View style={styles.benefitRow}><MaterialCommunityIcons name="cloud-check-outline" size={21} color={colors.link}/><View style={styles.flex}><Text style={styles.benefitTitle}>{t("quotaAmount",{count:isPro?100:30})}</Text><Text style={styles.currentPlanText}>{t("quotaWindow")}</Text></View></View>
                <View style={styles.benefitRow}><MaterialCommunityIcons name="cellphone-check" size={21} color={colors.link}/><Text style={[styles.currentPlanText,styles.flex]}>{t("localIncluded")}</Text></View>
                <Text style={styles.cadence}>{t(cadence==="monthly"?"billedMonthly":"billedYearly")}</Text>
                <Pressable
                  accessibilityLabel={t("chooseLabel",{name:copy.name,cadence:copy.cadence})}
                  disabled={purchaseDisabled}
                  onPress={() => void purchase(product)}
                  style={[styles.primary, purchaseDisabled && styles.disabled]}
                >
                  {busyProduct === product.id ? (
                    <ActivityIndicator accessibilityLabel={t("buyingLabel",{name:copy.name,cadence:copy.cadence})} color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryText}>{t("choose")}</Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}

        <View style={styles.freeRow}><View style={styles.freeIcon}><MaterialCommunityIcons name="sprout-outline" size={25} color={colors.ink}/></View><View style={styles.flex}><Text style={styles.benefitTitle}>{t("freePlan")}</Text><Text style={styles.currentPlanText}>{t("freeAllowance")}</Text></View><MaterialCommunityIcons name="check-circle-outline" size={21} color={colors.income}/></View>
        <Text style={styles.notice}>{t("allIncluded")}</Text>
        <Text style={styles.sectionTitle}>{t("storeTools")}</Text>
        {message && (
          <Text accessibilityLiveRegion="polite" style={success ? styles.success : styles.error}>
            {t(message.key,{tier:message.tier})}
          </Text>
        )}
        {connected&&<Pressable
          accessibilityRole="button"
          disabled={catalogueLoading||restoring||busyProduct!==null}
          onPress={()=>{if(!catalogueBusy.current)setCatalogueAttempt(value=>value+1);}}
          style={styles.secondary}
        ><Text style={styles.secondaryText}>{t(catalogueLoading?"loadingPrices":"reloadPrices")}</Text></Pressable>}
        <Pressable
          disabled={!connected || restoring || busyProduct !== null}
          onPress={() => void restore()}
          style={styles.secondary}
        >
          {restoring ? <ActivityIndicator accessibilityLabel={t("restoring")} color={colors.link} /> : <Text style={styles.secondaryText}>{t("restore")}</Text>}
        </Pressable>
        <Pressable
          disabled={Platform.OS !== "android"}
          onPress={() => void manageSubscription()}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>{t("manage")}</Text>
        </Pressable>
        <Text style={styles.footnote}>
          {t("footnote")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  topHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  heroCenter: { alignItems: "center", marginTop: 6, gap: 4, marginBottom: 8 },
  heroMain: { color: colors.ink, fontSize: 18, fontWeight: "800", textAlign: "center" },
  heroSubtitle: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 18 },
  popularBadge: { position: "absolute", top: -12, right: 18, backgroundColor: colors.mauve, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  popularBadgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  headingGroup:{gap:8},
  flex: { flex: 1, minWidth: 0 },
  eyebrow: {color:colors.link,fontSize:11,fontWeight:"800",letterSpacing:1.1},
  intro: {color:colors.ink,fontSize:22,lineHeight:30,fontWeight:"800"},
  currentHeading:{flexDirection:"row",alignItems:"center",gap:12},
  currentIcon:{width:48,height:48,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:colors.surface},
  allowance:{color:colors.ink,fontSize:30,fontWeight:"800"},allowanceTotal:{fontSize:15,color:colors.muted},
  meter:{height:6,borderRadius:3,backgroundColor:colors.surface,overflow:"hidden",marginVertical:8},meterFill:{height:6,backgroundColor:colors.primary,borderRadius:3},
  exhausted:{color:colors.danger,fontSize:13,lineHeight:20},
  sectionHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:8},
  sectionTitle:{color:colors.ink,fontSize:18,fontWeight:"800"},
  cadenceTabs:{flexDirection:"row",backgroundColor:colors.elevated,borderRadius:paperShape.button,padding:4,gap:4},
  cadenceTab:{flex:1,alignItems:"center",justifyContent:"center",minHeight:48,borderRadius:paperShape.button},
  cadenceSelected:{backgroundColor:colors.primary},cadenceText:{color:colors.muted,fontSize:14,fontWeight:"700"},cadenceSelectedText:{color:colors.onPrimary},
  planIcon:{width:48,height:48,borderRadius:16,alignItems:"center",justifyContent:"center"},
  benefitRow:{flexDirection:"row",gap:10,alignItems:"center"},benefitTitle:{color:colors.ink,fontSize:15,fontWeight:"700"},
  currentBadge:{color:colors.link,fontSize:10,fontWeight:"800",letterSpacing:0.5,marginTop:4},
  freeRow:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},
  freeIcon:{width:44,height:44,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:colors.pocketBlue},

  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: paperSpace.section, padding: paperSpace.screen, paddingBottom: 48 },
  back: { color: colors.link, fontSize: 15, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", lineHeight: 38 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  currentPlan: { backgroundColor: colors.peach, borderColor: colors.peach, borderRadius: paperShape.card, borderWidth: 1, gap: 6, padding: 16 },
  currentPlanTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  currentPlanText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  notice: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  planCard: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: paperShape.card, borderWidth: 1, gap: 14, padding: paperControl.cardPadding },
  planHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  planNameBlock: { flex: 1, minWidth: 0 },
  planName: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  cadence: { color: colors.muted, fontSize: 13, marginTop: 3 },
  price: { color: colors.link, fontSize: 19, fontWeight: "800", flexShrink: 1, textAlign: "right" },
  planSummary: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: paperShape.button, justifyContent: "center", minHeight: paperControl.height },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  secondary: { alignItems: "center", borderColor: colors.primaryOutline, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height },
  secondaryText: { color: colors.link, fontSize: 15, fontWeight: "700" },
  linkButton: { alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.link, fontSize: 14, fontWeight: "700", textAlign: "center" },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  success: { color: colors.income, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
