import { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PicketText as Text } from "@/core/ui/picket-text";
import { FigmaButton, figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { formatCalendarDate } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { weekStartForDay, type PracticeEvent } from "./practice";
import { weeklyPractice } from "./progress-storage";

export function WeeklyPractice({ owner }: { owner: string }) {
  const { language } = useAppTheme();
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");

  const currentWeek = () => {
    const date = new Date();
    return weekStartForDay(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  };
  const [week, setWeek] = useState(currentWeek);

  useEffect(() => {
    const refresh = () => setWeek(currentWeek());
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    const timer = setInterval(refresh, 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);

  const [events, setEvents] = useState<PracticeEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void weeklyPractice.load(owner).then(value => {
        if (active) { setEvents(value); setError(false); }
      }).catch(() => {
        if (active) setError(true);
      });
    };
    refresh();
    const stop = weeklyPractice.subscribe(owner, refresh);
    return () => { active = false; stop(); };
  }, [owner, revision]);

  const current = events?.find(row => row.weekStart === week);

  async function record(skipped: boolean) {
    setBusy(true);
    try { setEvents(await weeklyPractice.record(owner, week, skipped)); }
    catch { setError(true); }
    finally { setBusy(false); }
  }

  const disabled = events === null || error || busy || current?.skipped === false;
  const statusText = error
    ? t("storageError")
    : current
      ? current.skipped
        ? t("weeklySkipped")
        : t("weeklyComplete")
      : "";

  return (
    <View style={[styles.card, figmaShadow("paper")]}>
      <Text style={styles.overline}>{t("weeklyTitle").toUpperCase()}</Text>
      <Text accessibilityRole="header" style={styles.title}>{t("weekOf", { date: formatCalendarDate(week, language) })}</Text>
      <Text style={styles.body}>{t("weeklyTask")}</Text>
      <Text style={styles.muted}>{t("optionalPractice")}</Text>
      {statusText ? (
        <Text accessibilityLiveRegion="polite" style={error ? styles.errorText : styles.statusText}>{statusText}</Text>
      ) : null}
      {error ? (
        <FigmaButton variant="text" size="medium" label={t("Thử lại", { ns: "common" })} onPress={() => setRevision(value => value + 1)} style={styles.inlineBtn} />
      ) : null}
      <View style={styles.actions}>
        <FigmaButton variant="outline" size="medium" fullWidth label={t("weeklySave")} disabled={disabled} onPress={() => void record(false)} />
        <FigmaButton variant="text" size="medium" label={t("weeklySkip")} disabled={disabled} onPress={() => void record(true)} style={styles.centeredBtn} />
      </View>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  overline: {
    ...figmaText.overline,
    color: colors.primary,
  },
  title: {
    ...figmaText.titleSection,
    color: colors.text,
    flexShrink: 1,
  },
  body: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flexShrink: 1,
  },
  muted: {
    ...figmaText.bodySmall,
    color: colors.muted,
    flexShrink: 1,
  },
  statusText: {
    ...figmaText.bodySmall,
    color: colors.success,
    flexShrink: 1,
  },
  errorText: {
    ...figmaText.bodySmall,
    color: colors.expense,
    flexShrink: 1,
  },
  actions: {
    gap: 6,
    paddingTop: 4,
  },
  inlineBtn: {
    alignSelf: "flex-start",
  },
  centeredBtn: {
    alignSelf: "center",
  },
});
