import { useState } from "react";
import { Redirect, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { PicketText as Text } from "@/core/ui/picket-text";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { Chip } from "@/core/ui/figma-ui";
import { formatCalendarDate, formatMoney } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { ForecastChart } from "@/features/forecast/forecast-chart";
import { forecastStatus, parseScenarioAmount, spendingPace } from "@picket/domain";
import { useMonthForecast } from "@/features/forecast/use-month-forecast";

export default function ForecastScreen() {
  const { t } = useTranslation("forecast");
  const { language } = useAppTheme();
  const { session, localMode } = useAuth();
  const { colors: c, styles } = useMobileStyles(createStyles);
  const [currencyChoice, setCurrency] = useState<string>();
  const [amountText, setAmountText] = useState("");
  const purchase = parseScenarioAmount(amountText) ?? undefined;
  const { settings, forecast, scenario, currency, currencies, hidden } = useMonthForecast({ currency: currencyChoice, purchase });
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const money = (amount: number) => (hidden ? "••••••" : formatMoney(amount, language, currency));
  const date = (day: string) => formatCalendarDate(day, language);

  let body;
  if (!settings.enabled) body = <Text style={styles.caption}>{t("disabled")}</Text>;
  else if (!forecast) body = <Text accessibilityRole="alert" style={styles.caption}>{t("unavailable")}</Text>;
  else if (forecast.status === "insufficient-history") {
    const missing = Math.max(0, forecast.neededDays - forecast.historyDays);
    const ratio = Math.min(1, forecast.neededDays > 0 ? forecast.historyDays / forecast.neededDays : 0);
    body = (
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>{t("needMore")}</Text>
        <Text style={styles.caption}>{missing > 0 ? t("needMoreBody", { count: missing, have: forecast.historyDays, need: forecast.neededDays }) : t("needMonth")}</Text>
        <View accessible accessibilityRole="progressbar" accessibilityLabel={t("progress", { have: forecast.historyDays, need: forecast.neededDays })} accessibilityValue={{ min: 0, max: forecast.neededDays, now: Math.min(forecast.historyDays, forecast.neededDays) }} style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>
        <Text style={styles.caption}>{t("progress", { have: forecast.historyDays, need: forecast.neededDays })}</Text>
      </View>
    );
  } else {
    const shown = forecast;
    const pace = spendingPace(shown);
    const what = scenario?.status === "ready" ? scenario : null;
    const whatStatus = what ? forecastStatus(what) : null;
    const s = forecastStatus(shown);
    const spendMax = Math.max(1, shown.spentSoFar, shown.typicalSpentSoFar);
    body = <>
      <View style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.overline}>{t("expectedEnd", { day: date(shown.endDay) }).toUpperCase()}</Text>
          <Chip tone={s.kind === "ok" ? "success" : "warning"} label={s.kind === "ok" ? t("onTrack") : t(s.kind === "negative" ? "negativeDay" : "riskDay", { day: date(s.day) })} style={styles.status} />
        </View>
        <Text accessibilityRole="header" style={[styles.big, shown.expected < 0 && { color: c.expense }]}>{money(shown.expected)}</Text>
        {shown.monthsUsed > 1 && shown.low !== shown.high && <Text style={styles.caption}>{t("range", { low: money(shown.low), high: money(shown.high) })}</Text>}
        {hidden ? <Text style={styles.caption}>{t("hidden")}</Text> : (
          <ForecastChart path={shown.path} height={132} label={t("chartLabel")} todayLabel={t("today")} legend={{ forecast: t("legendForecast"), range: t("legendRange") }} dayLabel={point => t("chartDay", { day: date(point.day), amount: money(point.expected) })} />
        )}
      </View>

      <View style={styles.tiles}>
        <Tile styles={styles} label={t("balanceNow")} value={money(shown.balanceNow)} />
        <Tile styles={styles} label={t("lowestLabel")} value={money(shown.lowest.expected)} tone={shown.lowest.expected < 0 ? c.expense : undefined} note={date(shown.lowest.day)} />
        <Tile styles={styles} label={t("incomeLeft")} value={`+${money(shown.remainingIncome)}`} tone={c.income} />
        <Tile styles={styles} label={t("expenseLeft")} value={`−${money(shown.remainingExpense)}`} tone={c.expense} />
      </View>

      <View style={styles.card}>
        <Text style={styles.overline}>{t("spendingTitle").toUpperCase()}</Text>
        <Line styles={styles} label={t("spentToDay")} value={money(shown.spentSoFar)} />
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((shown.spentSoFar / spendMax) * 100)}%` }]} /></View>
        <Line styles={styles} label={t("typicalToDay")} value={money(shown.typicalSpentSoFar)} />
        <View style={styles.track}><View style={[styles.fill, { backgroundColor: c.muted, width: `${Math.round((shown.typicalSpentSoFar / spendMax) * 100)}%` }]} /></View>
        {pace !== null && <Text style={styles.caption}>{Math.abs(pace) < 5 ? t("paceSame") : t(pace > 0 ? "paceFaster" : "paceSlower", { percent: Math.abs(pace) })}</Text>}
        <Text style={styles.caption}>{t("method", { count: shown.monthsUsed })}</Text>
        {shown.monthsUsed === 1 && <Text style={styles.caption}>{t("lowConfidence")}</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.headRow}>
          <Text accessibilityRole="header" style={[styles.heading, { flex: 1 }]}>{t("scenarioTitle")}</Text>
          <Chip tone="neutral" size="small" label={t("proBadge")} />
        </View>
        {settings.scenario ? <>
          <Text style={styles.caption}>{t("scenarioHint")}</Text>
          <TextInput money accessibilityLabel={t("scenarioAmount")} placeholder={t("scenarioAmount")} placeholderTextColor={c.muted} keyboardType="number-pad" value={amountText} onChangeText={setAmountText} style={styles.input} />
          {what && whatStatus && <>
            <Text style={[styles.label, what.expected < 0 && { color: c.expense }]}>{t("scenarioResult", { amount: money(what.expected) })}</Text>
            {whatStatus.kind !== "ok" && <Chip tone="warning" label={t(whatStatus.kind === "negative" ? "negativeDay" : "riskDay", { day: date(whatStatus.day) })} />}
            <Pressable accessibilityRole="button" onPress={() => setAmountText("")} style={styles.linkButton}><Text style={styles.link}>{t("scenarioClear")}</Text></Pressable>
          </>}
        </> : <>
          <Text style={styles.caption}>{t("scenarioPro")}</Text>
          {!localMode && <Pressable accessibilityRole="button" onPress={() => router.push(routes.billing)} style={styles.linkButton}><Text style={styles.link}>{t("scenarioUpgrade")}</Text></Pressable>}
        </>}
      </View>
    </>;
  }

  return (
    <PicketScreen>
      <TopAppBar title={t("screenTitle")} subtitle={t("screenSubtitle")} />
      {currencies.length > 1 && (
        <View style={[styles.row, { marginTop: 12 }]} accessibilityLabel={t("currency")}>
          {currencies.map(code => <ChoiceChip key={code} checked={currency === code} label={code} onPress={() => setCurrency(code)} />)}
        </View>
      )}
      <View style={styles.stack}>{body}</View>
      <Text style={[styles.caption, { marginTop: 16, marginBottom: 32 }]}>{t("disclaimer")}</Text>
    </PicketScreen>
  );
}

function Tile({ styles, label, value, tone, note }: { styles: ReturnType<typeof createStyles>; label: string; value: string; tone?: string; note?: string }) {
  return <View style={styles.tile}><Text style={styles.caption}>{label}</Text><Text style={[styles.tileValue, tone ? { color: tone } : null]}>{value}</Text>{note ? <Text style={styles.caption}>{note}</Text> : null}</View>;
}

function Line({ styles, label, value, tone }: { styles: ReturnType<typeof createStyles>; label: string; value: string; tone?: string }) {
  return <View style={styles.line}><Text style={styles.lineLabel}>{label}</Text><Text style={[styles.lineValue, tone ? { color: tone } : null]}>{value}</Text></View>;
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  stack: { gap: 16, marginTop: 16 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 24, padding: 16, gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  overline: { flex: 1, color: c.primary, fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 0.4 },
  status: { flexShrink: 1, maxWidth: "60%" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { flexBasis: "47%", flexGrow: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 14, gap: 4 },
  tileValue: { color: c.text, fontSize: 16, lineHeight: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: 4, backgroundColor: c.selectedSurface, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  linkButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  big: { color: c.text, fontSize: 30, lineHeight: 38, fontWeight: "800", fontVariant: ["tabular-nums"] },
  heading: { color: c.text, fontSize: 16, lineHeight: 22, fontWeight: "700" },
  label: { color: c.text, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  caption: { color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  link: { color: c.link, fontSize: 13, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineLabel: { color: c.muted, fontSize: 13, flex: 1 },
  lineValue: { color: c.text, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  input: { borderWidth: 1, borderColor: c.controlBorder, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, color: c.text, fontSize: 16 },
});
