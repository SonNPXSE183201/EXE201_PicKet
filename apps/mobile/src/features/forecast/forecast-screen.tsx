import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { forecastStatus, parseScenarioAmount, spendingPace } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ChoiceChip, TopAppBar } from "@/core/ui/picket-ui";
import { PicketScrollView } from "@/core/ui/picket-scroll-view";
import { Chip, FigmaButton, Notice, Skeleton, figmaText, figmaShadow } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { PlanChoiceCard } from "@/core/ui/plan-choice-card";
import type { PaperAssetId } from "@/core/theme/paper-assets";
import { localeFor, formatMoney } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { ForecastChart } from "./forecast-chart";
import { useMonthForecast } from "./use-month-forecast";

export function ForecastScreen() {
  const { t } = useTranslation("forecast");
  const { language } = useAppTheme();
  const { colors: c, styles } = useMobileStyles(createStyles);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const scenarioY = useRef(0);
  const [focused, setFocused] = useState(false);
  const [currencyChoice, setCurrency] = useState<string>();
  const [amountText, setAmountText] = useState("");
  const purchase = parseScenarioAmount(amountText) ?? undefined;
  const { settings, access, forecast, scenario, currency, currencies, hidden, initialLoading, settingsError, retry } = useMonthForecast({ currency: currencyChoice, purchase });
  useEffect(() => {
    if (!focused) return;
    const listener = Keyboard.addListener("keyboardDidShow", () => scroll.current?.scrollTo({ y: Math.max(0, scenarioY.current - 12), animated: true }));
    return () => listener.remove();
  }, [focused]);
  const money = (amount: number) => hidden ? "••••••" : formatMoney(amount, language, currency).replace(/^-/, "−");
  const date = (day: string) => new Intl.DateTimeFormat(localeFor(language), { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(day));
  const statusCopy = (s: ReturnType<typeof forecastStatus>) => s.kind === "ok" ? t("onTrack") : t(s.kind === "negative" ? "negativeDay" : "riskDay", { day: date(s.day) });
  const back = () => router.canGoBack() ? router.back() : router.replace(routes.home);
  let body: ReactNode;
  let actions: ReactNode;
  if (initialLoading) body = <View accessibilityState={{ busy: true }} style={styles.stack}>
    <View style={styles.hero}><View pointerEvents="none" style={styles.stitch} /><Skeleton width={120} height={10} radius={4} tone="onDark" /><Skeleton width="85%" height={34} radius={6} tone="onDark" /><Skeleton width={160} height={10} radius={4} tone="onDark" /><Skeleton width={110} height={24} radius={6} tone="onDark" /></View>
    <View style={styles.card}><Skeleton width={150} height={12} radius={4} /><Skeleton height={120} radius={6} /><Skeleton width={200} height={10} radius={4} /></View>
    <View style={styles.tiles}>{[0, 1].map(i => <View key={i} style={styles.tile}><Skeleton width={80} height={10} radius={4} /><Skeleton height={18} radius={4} /></View>)}</View>
  </View>;
  else if (settingsError) body = error();
  else if (access === "hidden") body = <Text style={styles.caption}>{t("disabled")}</Text>;
  else if (access === "signIn" || access === "locked") {
    const local = access === "signIn";
    body = <>
      <Hero art={local ? "receiptV2" : "monthCloseScene"} overline={t(local ? "localOverline" : "upgradeOverline")} title={t(local ? "signedOutTitle" : "upgradeTitle")} body={t(local ? "signInBody" : "upgradeBody")} />
      {local ? <Notice title={t("localDataTitle")} body={t("localDataBody")} /> : <>
        <View style={styles.card}><Text style={[styles.overline, { color: c.muted }]}>{t("benefits")}</Text>{(["benefitBalance", "benefitRisk", "benefitScenario"] as const).map(key => <View key={key} style={styles.benefit}><View style={styles.check}><AppIcon name="check" size={12} color={c.success} /></View><Text style={[styles.caption, { color: c.text, flex: 1 }]}>{t(key)}</Text></View>)}</View>
        <View style={styles.plans}><PlanChoiceCard plan="Plus" description={t("plusDescription")} /><PlanChoiceCard plan="Pro" description={t("proDescription")} /></View>
      </>}
    </>;
    actions = <><FigmaButton fullWidth label={t(local ? "signIn" : "viewPlans")} onPress={() => router.push(local ? routes.login : routes.billing)} /><FigmaButton fullWidth variant="text" size="medium" label={t(local ? "register" : "later")} onPress={local ? () => router.push(routes.register) : back} /></>;
  } else if (!forecast) body = error();
  else if (forecast.status === "insufficient-history") {
    const missing = Math.max(0, forecast.neededDays - forecast.historyDays);
    body = <><Text style={styles.caption}>{t("screenSubtitle")}</Text><View style={[styles.card, styles.center, { padding: 20 }]}>
      <PaperArt id="saveJar" style={{ width: 96, height: 96 }} /><Text style={[styles.heading, styles.centerText]}>{t("needMore")}</Text><Text style={[styles.caption, styles.centerText]}>{missing ? t("needMoreBody", { count: missing, have: forecast.historyDays, need: forecast.neededDays }) : t("needMonth")}</Text>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t("progress", { have: forecast.historyDays, need: forecast.neededDays })} accessibilityValue={{ min: 0, max: forecast.neededDays, now: Math.min(forecast.historyDays, forecast.neededDays) }} style={[styles.track, { alignSelf: "stretch" }]}><View style={[styles.fill, { width: `${Math.min(100, forecast.historyDays / forecast.neededDays * 100)}%` }]} /></View><Text style={styles.caption}>{t("progress", { have: forecast.historyDays, need: forecast.neededDays })}</Text>
    </View><Notice title={t("dailyTitle")} body={t("dailyBody")} /><Text style={styles.caption}>{t("shortDisclaimer")}</Text></>;
    actions = <FigmaButton fullWidth label={t("addTransaction")} onPress={() => router.push(routes.newTransaction)} />;
  } else {
    const shown = forecast;
    const what = scenario?.status === "ready" ? scenario : null;
    const status = forecastStatus(shown);
    const whatStatus = what ? forecastStatus(what) : null;
    const pace = spendingPace(shown);
    const spendMax = Math.max(1, shown.spentSoFar, shown.typicalSpentSoFar);
    body = <>
      <Text style={styles.caption}>{t("screenSubtitle")}</Text>
      {currencies.length > 1 && <View style={styles.currency} accessibilityLabel={t("currency")}>{currencies.map(code => <ChoiceChip key={code} checked={currency === code} label={code} onPress={() => { setCurrency(code); setAmountText(""); }} />)}</View>}
      <View style={styles.hero}><View pointerEvents="none" style={styles.stitch} /><PaperArt id="monthCloseScene" style={styles.heroArt} /><View style={styles.heroCopy}>
        <Text style={styles.heroLabel}>{t("expectedEnd", { day: date(shown.endDay) }).toUpperCase()}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.big}>{money(shown.expected)}</Text>
        {shown.monthsUsed > 1 && shown.low !== shown.high && <Text style={styles.heroBody}>{t("range", { low: money(shown.low), high: money(shown.high) })}</Text>}
      </View><Chip tone={status.kind === "ok" ? "success" : "warning"} label={statusCopy(status)} /></View>
      {status.kind !== "ok" && <Notice tone="warning" title={t("riskDay", { day: date(status.day) })} body={t("riskLowest", { amount: money(shown.lowest.expected), day: date(shown.lowest.day) })} />}
      <View style={styles.card}><Text style={styles.label}>{t("chartLabel")}</Text>{hidden ? <Text style={styles.caption}>{t("hidden")}</Text> : <ForecastChart path={shown.path} scenarioPath={what?.path} height={132} label={t("chartLabel")} todayLabel={t("today")} formatDay={date} lowestLabel={day => t("lowestDay", { day: date(day) })} riskLabel={day => t("zeroDay", { day: date(day) })} scenarioRiskDay={what?.negativeDay ?? what?.riskDay} legend={{ forecast: t("legendForecast"), range: t("legendRange"), scenario: t("legendScenario") }} dayLabel={point => t("chartDay", { day: date(point.day), amount: money(point.expected) })} />}</View>
      <View style={styles.tiles}><Tile label={t("balanceNow")} value={money(shown.balanceNow)} /><Tile label={t("lowestLabel")} value={money(shown.lowest.expected)} tone={shown.lowest.expected < 0 ? c.expense : undefined} note={date(shown.lowest.day)} /><Tile label={t("incomeLeft")} value={`+${money(shown.remainingIncome)}`} tone={c.income} /><Tile label={t("expenseLeft")} value={`−${money(shown.remainingExpense)}`} tone={c.expense} /></View>
      <View style={styles.card}><Text style={styles.overline}>{t("spendingTitle").toUpperCase()}</Text><Line label={t("spentToDay")} value={money(shown.spentSoFar)} /><View style={styles.track}><View style={[styles.fill, { backgroundColor: c.expense, width: `${shown.spentSoFar / spendMax * 100}%` }]} /></View><Line label={t("typicalToDay")} value={money(shown.typicalSpentSoFar)} /><View style={styles.track}><View style={[styles.fill, { backgroundColor: c.pocketBlue, width: `${shown.typicalSpentSoFar / spendMax * 100}%` }]} /></View>{pace !== null && <Text style={styles.caption}>{Math.abs(pace) < 5 ? t("paceSame") : t(pace > 0 ? "paceFaster" : "paceSlower", { percent: Math.abs(pace) })}</Text>}</View>
      <View onLayout={event => { scenarioY.current = event.nativeEvent.layout.y; }} style={styles.card}>
        <View style={styles.headRow}><Text style={[styles.heading, { flex: 1 }]}>{t("scenarioTitle")}</Text><Chip label={t("proBadge")} /></View>
        {settings.scenario ? <><Text style={styles.caption}>{t("scenarioHint")}</Text><View style={[styles.inputRow, focused && { borderColor: c.primary, borderWidth: 2 }]}><TextInput money borderless accessibilityLabel={t("scenarioAmount")} placeholder={t("scenarioAmount")} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} value={amountText} onChangeText={setAmountText} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.input} /><Text style={styles.caption}>{currency === "VND" ? "₫" : currency}</Text></View>{what && whatStatus && <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><Text style={styles.label}>{t("scenarioResult", { amount: money(what.expected) })}</Text>{whatStatus.kind !== "ok" && <Chip tone="warning" label={statusCopy(whatStatus)} />}<FigmaButton variant="text" size="medium" label={t("scenarioClear")} onPress={() => { setAmountText(""); Keyboard.dismiss(); }} /></View>}</> : <><View style={styles.locked}><AppIcon name="lock-outline" color={c.primary} size={20} /><Text style={[styles.caption, { color: c.text, flex: 1 }]}>{t("scenarioPro")}</Text></View><FigmaButton label={t("scenarioUpgrade")} size="medium" fullWidth onPress={() => router.push(routes.billing)} /></>}
      </View>
      <View style={{ gap: 8, paddingHorizontal: 4 }}><Text style={styles.caption}>{t("method", { count: shown.monthsUsed })}</Text>{shown.monthsUsed === 1 && <Text style={styles.caption}>{t("lowConfidence")}</Text>}<Text style={styles.caption}>{t("disclaimer")}</Text></View>
    </>;
  }
  function error() {
    return <View accessibilityRole="alert" style={styles.error}><View style={styles.errorIcon}><AppIcon name="alert-circle-outline" size={32} color={c.warning} /></View><Text style={[styles.heading, styles.centerText]}>{t("errorTitle")}</Text><Text style={[styles.caption, styles.centerText]}>{t("errorBody")}</Text><FigmaButton label={t("retry")} size="medium" onPress={retry} /><FigmaButton label={t("back")} variant="text" size="medium" onPress={back} /></View>;
  }
  return <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
    <View style={styles.topbar}><TopAppBar title={t("screenTitle")} onBack={back} style={{ marginBottom: 0 }} /></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><PicketScrollView ref={scroll} contentContainerStyle={[styles.stack, { paddingTop: 8, paddingBottom: 24 + insets.bottom }]}>{body}</PicketScrollView></KeyboardAvoidingView>
    {actions && <View style={[styles.actions, { paddingBottom: Math.max(12, insets.bottom) }]}>{actions}</View>}
  </SafeAreaView>;
}
function Hero({ art, overline, title, body }: { art: PaperAssetId; overline: string; title: string; body: string }) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={styles.hero}><View pointerEvents="none" style={styles.stitch} /><PaperArt id={art} style={styles.heroArt} /><View style={styles.heroCopy}><Text style={styles.heroLabel}>{overline}</Text><Text style={styles.heroTitle}>{title}</Text><Text style={styles.heroBody}>{body}</Text></View></View>;
}
function Tile({ label, value, tone, note }: { label: string; value: string; tone?: string; note?: string }) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={styles.tile}><Text style={styles.caption}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tileValue, tone ? { color: tone } : null]}>{value}</Text>{note && <Text style={styles.caption}>{note}</Text>}</View>;
}
function Line({ label, value }: { label: string; value: string }) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={styles.headRow}><Text style={[styles.caption, { flex: 1 }]}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label, { maxWidth: "55%" }]}>{value}</Text></View>;
}
const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas }, topbar: { paddingHorizontal: 20, paddingTop: 12 }, stack: { gap: 12 },
  card: { backgroundColor: c.paper, borderRadius: 18, padding: 16, gap: 10, ...figmaShadow("paper") },
  hero: { backgroundColor: c.camera, borderRadius: 28, padding: 24, gap: 6, minHeight: 168 }, stitch: { position: "absolute", top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 20, borderColor: c.onCamera, opacity: .5 },
  heroArt: { position: "absolute", top: 14, right: 16, width: 72, height: 72 }, heroCopy: { paddingRight: 72, gap: 6 },
  heroLabel: { ...figmaText.captionStrong, color: c.onCamera }, heroTitle: { ...figmaText.display, color: c.onCamera }, heroBody: { ...figmaText.bodySmall, color: c.onCamera }, big: { ...figmaText.amountHero, color: c.onCamera },
  heading: { ...figmaText.titleSection, color: c.text, flexShrink: 1 }, label: { ...figmaText.bodyStrong, color: c.text }, caption: { ...figmaText.bodySmall, color: c.muted }, overline: { ...figmaText.overline, color: c.primary },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, tile: { flexBasis: "45%", flexGrow: 1, flexShrink: 1, minWidth: 0, padding: 12, gap: 2, backgroundColor: c.paper, borderRadius: 16, ...figmaShadow("paper") }, tileValue: { ...figmaText.amountPocket, color: c.text },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, currency: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  track: { height: 8, borderRadius: 4, backgroundColor: c.selectedSurface, overflow: "hidden" }, fill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.canvas, borderColor: c.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 48 }, input: { ...figmaText.bodyStrong, flex: 1, minWidth: 0, minHeight: 46, color: c.text, paddingHorizontal: 0 }, locked: { backgroundColor: c.selectedSurface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", gap: 10, alignItems: "center" },
  center: { alignItems: "center" }, centerText: { textAlign: "center" }, plans: { flexDirection: "row", gap: 24 }, benefit: { flexDirection: "row", alignItems: "center", gap: 10 }, check: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.successSurface, alignItems: "center", justifyContent: "center" },
  actions: { paddingHorizontal: 20, paddingTop: 12, gap: 4, backgroundColor: c.canvas }, error: { alignItems: "center", paddingTop: 120, gap: 12 }, errorIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.warningSurface, alignItems: "center", justifyContent: "center" },
});
