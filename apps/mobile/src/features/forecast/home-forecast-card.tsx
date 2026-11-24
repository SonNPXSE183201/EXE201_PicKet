import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { forecastStatus } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Chip, FigmaButton, Skeleton, figmaText, figmaShadow } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { localeFor, formatMoney } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMonthForecast } from "./use-month-forecast";

export function HomeForecastCard() {
  const { t } = useTranslation("forecast");
  const { language } = useAppTheme();
  const { colors: c, styles } = useMobileStyles(createStyles);
  const { access, forecast, currency, initialLoading, settingsError, hidden } = useMonthForecast();
  if (access === "hidden") return null;
  const money = (amount: number) => hidden ? "••••••" : formatMoney(amount, language, currency).replace(/^-/, "−");
  const open = () => router.push(routes.forecast);
  const overline = <Text style={styles.overline}>{t("overline").toUpperCase()}</Text>;
  if (initialLoading) return <View accessibilityState={{ busy: true }} style={styles.card}><Skeleton height={16} width="60%" /><Skeleton height={26} /><Skeleton height={18} width="80%" /></View>;
  if (settingsError) return <View style={styles.card}>{overline}<Text accessibilityRole="alert" style={styles.caption}>{t("unavailable")}</Text></View>;
  if (access === "locked" || access === "signIn") {
    const content = <><View style={styles.icon}><AppIcon name={access === "locked" ? "lock-outline" : "account-outline"} size={22} color={c.primary} /></View><View style={styles.copy}>{overline}<Text style={styles.strong}>{t(access === "locked" ? "lockedTitle" : "signedOutTitle")}</Text><Text style={styles.caption}>{t(access === "locked" ? "lockedBody" : "signedOutBody")}</Text>{access === "locked" ? <Chip tone="outline" label={t("plansBadge")} /> : <FigmaButton variant="text" size="medium" label={t("signIn")} onPress={() => router.push(routes.login)} style={{ alignSelf: "flex-start", paddingHorizontal: 8 }} />}</View></>;
    return access === "locked" ? <Pressable accessibilityRole="button" accessibilityLabel={t("lockedTitle")} onPress={open} style={[styles.card, styles.row]}>{content}</Pressable> : <View style={[styles.card, styles.row]}>{content}</View>;
  }
  if (!forecast) return <View style={styles.card}>{overline}<Text accessibilityRole="alert" style={styles.caption}>{t("unavailable")}</Text></View>;
  if (forecast.status === "insufficient-history") {
    const missing = Math.max(0, forecast.neededDays - forecast.historyDays);
    return <View style={styles.card}>{overline}<Text style={styles.strong}>{t("needMore")}</Text><Text style={styles.caption}>{missing ? t("homeNeedMoreBody", { count: missing }) : t("needMonth")}</Text><View accessible accessibilityRole="progressbar" accessibilityLabel={t("progress", { have: forecast.historyDays, need: forecast.neededDays })} accessibilityValue={{ min: 0, max: forecast.neededDays, now: Math.min(forecast.historyDays, forecast.neededDays) }} style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, forecast.historyDays / forecast.neededDays * 100)}%` }]} /></View><Text style={styles.progress}>{t("progress", { have: forecast.historyDays, need: forecast.neededDays })}</Text></View>;
  }
  const status = forecastStatus(forecast);
  const statusText = status.kind === "ok" ? t("onTrack") : t(status.kind === "negative" ? "negativeDay" : "riskDay", { day: new Intl.DateTimeFormat(localeFor(language), { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(status.day)) });
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t("open")}. ${statusText}`} onPress={open} style={styles.card}>
    <View style={styles.heading}>{overline}<AppIcon name="chevron-right" size={20} color={c.text} /></View>
    <Text style={styles.caption}>{t("homeAmount")}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, forecast.expected < 0 && { color: c.expense }]}>{money(forecast.expected)}</Text>
    {forecast.monthsUsed > 1 && forecast.low !== forecast.high && <Text style={styles.caption}>{t("range", { low: money(forecast.low), high: money(forecast.high) })}</Text>}
    <Chip tone={status.kind === "ok" ? "success" : "warning"} label={statusText} />
  </Pressable>;
}
const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  card: { backgroundColor: c.paper, borderRadius: 18, padding: 16, gap: 8, overflow: "hidden", ...figmaShadow("paper") },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.selectedSurface, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 4 }, heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  overline: { ...figmaText.overline, color: c.primary, flexShrink: 1, flexGrow: 1 },
  strong: { ...figmaText.bodyStrong, color: c.text }, amount: { ...figmaText.amountLarge, color: c.text },
  caption: { ...figmaText.bodySmall, color: c.muted }, progress: { ...figmaText.captionStrong, color: c.muted },
  track: { height: 8, borderRadius: 4, backgroundColor: c.selectedSurface, overflow: "hidden" }, fill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
});
