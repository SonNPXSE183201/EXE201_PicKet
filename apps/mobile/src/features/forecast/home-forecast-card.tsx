import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { Chip, SectionHeader, Skeleton } from "@/core/ui/figma-ui";
import { formatCalendarDate, formatMoney } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { ForecastChart } from "./forecast-chart";
import { forecastStatus } from "./forecast-copy";
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
    return (
      <View style={styles.section}>
        <SectionHeader overline={t("overline")} title={t("needMore")} />
        <View style={styles.empty}>
          <View style={styles.spark}><AppIcon name="chart-timeline-variant" size={22} color={c.primary} /></View>
          <Text style={[styles.caption, { flex: 1 }]}>
            {missing > 0 ? t("needMoreBody", { count: missing, have: forecast.historyDays, need: forecast.neededDays }) : t("needMonth")}
          </Text>
        </View>
      </View>
    );
  }
  const status = forecastStatus(forecast);
  const statusText = status.kind === "ok" ? t("onTrack") : t(status.kind === "negative" ? "negativeDay" : "riskDay", { day: formatCalendarDate(status.day, language) });
  return (
    <View style={styles.section}>
      <SectionHeader overline={t("overline")} title={t("title", { amount: money(forecast.expected) })} action="link" actionLabel={t("open")} onAction={open} />
      <Pressable accessibilityRole="button" accessibilityLabel={t("open")} onPress={open} style={styles.card}>
        <View style={styles.row}>
          <Chip tone={status.kind === "ok" ? "success" : "warning"} label={statusText} />
        </View>
        {forecast.monthsUsed > 1 && forecast.low !== forecast.high && (
          <Text style={styles.caption}>{t("range", { low: money(forecast.low), high: money(forecast.high) })}</Text>
        )}
        {hidden ? <Text style={styles.caption}>{t("hidden")}</Text> : <ForecastChart path={forecast.path} height={64} label={t("chartLabel")} />}
      </Pressable>
    </View>
  );
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  section: { gap: 12 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 24, padding: 16, gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  caption: { color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  empty: { borderWidth: 1, borderStyle: "dashed", borderColor: c.controlBorder, borderRadius: 24, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  spark: { width: 40, height: 40, backgroundColor: c.pocketCoral, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
