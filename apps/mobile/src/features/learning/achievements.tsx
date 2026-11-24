import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AppIcon } from "@/core/ui/app-icon";
import { figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { LearningProgress } from "./progress";
import type { PracticeEvent } from "./practice";
import { weeklyPractice } from "./progress-storage";
import { learningMilestones, type LearningMilestone } from "./milestones";

const ALL_MILESTONES: readonly LearningMilestone[] = [
  "firstLesson",
  "threeLessons",
  "reviewedLesson",
  "practicedWeek",
  "allLessons",
];

export function LearningAchievements({ owner, progress }: { owner: string; progress: LearningProgress }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const [events, setEvents] = useState<PracticeEvent[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void weeklyPractice.load(owner).then(value => {
        if (active) { setEvents(value); setFailed(false); }
      }).catch(() => {
        if (active) setFailed(true);
      });
    };
    refresh();
    const stop = weeklyPractice.subscribe(owner, refresh);
    return () => { active = false; stop(); };
  }, [owner]);

  const { xp, badges } = learningMilestones(owner, progress.completed, events);
  const earned = new Set(badges);

  return (
    <View style={[styles.card, figmaShadow("paper")]}>
      <Text accessibilityRole="header" style={styles.overline}>{t("achievements").toUpperCase()}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.xpLabel}>{t("learningXp", { count: xp })}</Text>
      <View style={styles.list}>
        {ALL_MILESTONES.map(id => {
          const done = earned.has(id);
          return (
            <View key={id} style={styles.row}>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={[styles.badgeIcon, { backgroundColor: done ? colors.successSurface : colors.selectedSurface }]}
              >
                <AppIcon name={done ? "check" : "lock-outline"} size={14} color={done ? colors.success : colors.muted} />
              </View>
              <Text style={[styles.rowLabel, !done && styles.rowLabelLocked]}>{t(id)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.notice}>{t("xpNotice")}</Text>
      {failed ? <Text accessibilityRole="alert" style={styles.error}>{t("storageError")}</Text> : null}
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
  xpLabel: {
    ...figmaText.titleSection,
    color: colors.text,
    flexShrink: 1,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    ...figmaText.bodySmall,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  rowLabelLocked: {
    color: colors.muted,
  },
  notice: {
    ...figmaText.micro,
    color: colors.muted,
    flexShrink: 1,
  },
  error: {
    ...figmaText.bodySmall,
    color: colors.expense,
    flexShrink: 1,
  },
});
