import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Chip, SectionHeader, Skeleton } from "@/core/ui/figma-ui";
import { formatCalendarDate, formatMoney } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { paperAssets } from "@/core/theme/paper-assets";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { ForecastChart } from "./forecast-chart";
import { forecastStatus } from "@picket/domain";
import { useMonthForecast } from "./use-month-forecast";

/** Home: month-end balance estimate. Hidden entirely when admins switch the forecast off. */
export function HomeForecastCard() {
  const { t } = useTranslation("forecast");
  const { language } = useAppTheme();
  const { colors: c, styles } = useMobileStyles(createStyles);
  const { settings, forecast, currency, initialLoading, hidden } = useMonthForecast();
  if (!settings.enabled) return null;
  const money = (amount: number) => (hidden ? "••••••" : formatMoney(amount, language, currency));
  const open = () => router.push(routes.forecast);

  if (initialLoading) {
    return <View style={styles.section}><SectionHeader overline={t("overline")} title={t("screenSubtitle")} /><Skeleton height={120} radius={24} /></View>;
  }
  if (!forecast) {
    return <View style={styles.section}><SectionHeader overline={t("overline")} title={t("screenTitle")} /><Text accessibilityRole="alert" style={styles.caption}>{t("unavailable")}</Text></View>;
  }
  if (forecast.status === "insufficient-history") {
    const missing = Math.max(0, forecast.neededDays - forecast.historyDays);
    const ratio = Math.min(1, forecast.neededDays > 0 ? forecast.historyDays / forecast.neededDays : 0);
    return (
      <View style={styles.section}>
        <SectionHeader overline={t("overline")} title={t("needMore")} />
        <View style={styles.empty}>
          <View style={styles.emptyRow}>
            <Image accessible={false} source={paperAssets.rhythmEmptyScene} style={styles.art} resizeMode="contain" />
            <Text style={[styles.caption, { flex: 1 }]}>
              {missing > 0 ? t("needMoreBody", { count: missing, have: forecast.historyDays, need: forecast.neededDays }) : t("needMonth")}
            </Text>
          </View>
          <View accessible accessibilityRole="progressbar" accessibilityLabel={t("progress", { have: forecast.historyDays, need: forecast.neededDays })} accessibilityValue={{ min: 0, max: forecast.neededDays, now: Math.min(forecast.historyDays, forecast.neededDays) }} style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
          <Text style={styles.caption}>{t("progress", { have: forecast.historyDays, need: forecast.neededDays })}</Text>
        </View>
      </View>
    );
  }
  const status = forecastStatus(forecast);
  const statusText = status.kind === "ok" ? t("onTrack") : t(status.kind === "negative" ? "negativeDay" : "riskDay", { day: formatCalendarDate(status.day, language) });
  return (
    <View style={styles.section}>
      <SectionHeader overline={t("overline")} title={t("title", { amount: money(forecast.expected) })} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${t("open")}. ${statusText}`} onPress={open} style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.overline}>{t("expectedEnd", { day: formatCalendarDate(forecast.endDay, language) }).toUpperCase()}</Text>
          <Chip tone={status.kind === "ok" ? "success" : "warning"} label={statusText} style={styles.status} />
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { flexShrink: 1 }, forecast.expected < 0 && { color: c.expense }]}>{money(forecast.expected)}</Text>
          <Image accessible={false} source={paperAssets.moneyBloomScene} style={styles.art} resizeMode="contain" />
        </View>
        {forecast.monthsUsed > 1 && forecast.low !== forecast.high && (
          <Text style={styles.caption}>{t("range", { low: money(forecast.low), high: money(forecast.high) })}</Text>
        )}
        {hidden ? <Text style={styles.caption}>{t("hidden")}</Text> : <ForecastChart path={forecast.path} height={72} label={t("chartLabel")} />}
        <Text style={styles.link}>{t("open")}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  section: { gap: 12 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 24, padding: 16, gap: 10, minHeight: 44 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  overline: { flex: 1, color: c.primary, fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 0.4 },
  status: { flexShrink: 1, maxWidth: "60%" },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  amount: { color: c.text, fontSize: 28, lineHeight: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },
  caption: { color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  link: { color: c.link, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center", paddingVertical: 12 },
  empty: { borderWidth: 1, borderStyle: "dashed", borderColor: c.controlBorder, borderRadius: 24, padding: 12, gap: 10 },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  art: { width: 64, height: 64 },
  track: { height: 8, borderRadius: 4, backgroundColor: c.selectedSurface, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
});
