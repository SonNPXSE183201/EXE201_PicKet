import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { BlockLesson, BlockStage, LessonPathState } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { Chip, FigmaButton, figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

/** Path state plus "in progress" for the lesson that has a saved draft. */
export type PathItemState = LessonPathState | "inProgress";
const stateKey = { done: "stateDone", current: "stateCurrent", inProgress: "stateInProgress", locked: "stateLocked" } as const;
/** About 15 seconds per block, never under two minutes. */
export const lessonMinutes = (lesson: BlockLesson) => Math.max(2, Math.round(lesson.blocks.length * 15 / 60));
/** Lesson kind derived from content blocks (no invented difficulty). */
export const lessonKindKey = (lesson: BlockLesson): "lessonKindBasic" | "lessonKindPractice" =>
  lesson.blocks.some(block => block.type === "estimate") ? "lessonKindPractice" : "lessonKindBasic";

export function TodayLessonCard({ lesson, state, draftCard, draftTotal, disabled, onStart }: {
  lesson: BlockLesson | null; state: PathItemState; draftCard?: number; draftTotal?: number; disabled: boolean; onStart(): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const ctaKey = state === "inProgress" ? "continueLesson" : state === "done" ? "replayLesson" : "startLesson";
  const subtitle = lesson
    ? state === "inProgress" && draftCard && draftTotal
      ? t("minutesDraft", { count: lessonMinutes(lesson), current: draftCard, total: draftTotal })
      : t("minutes", { count: lessonMinutes(lesson) })
    : t("allDoneBody");

  return (
    <View style={styles.heroCard}>
      <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.heroStitch} />
      <PaperArt id="moneyBloomScene" style={styles.heroArt} />
      <View style={styles.heroCopy}>
        <Text accessibilityRole={lesson ? undefined : "header"} style={styles.heroOverline}>
          {t(lesson ? "todayLesson" : "allDoneTitle").toUpperCase()}
        </Text>
        {lesson ? <Text accessibilityRole="header" style={styles.heroTitle}>{lesson.title}</Text> : null}
        <Text style={styles.heroMeta}>{subtitle}</Text>
      </View>
      {lesson ? (
        <View style={styles.heroAction}>
          <FigmaButton variant="coral" size="medium" label={t(ctaKey)} disabled={disabled} onPress={onStart} />
        </View>
      ) : null}
    </View>
  );
}

export function LearningProgressCard({ done, total, xp }: { done: number; total: number; xp: number }) {
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;

  return (
    <View style={[styles.progressCard, figmaShadow("paper")]}>
      <View style={styles.progressRow}>
        <Text style={styles.progressCount}>{t("lessonsDone", { done, total })}</Text>
        <Chip label={t("learningXp", { count: xp })} tone="neutral" style={styles.pillChip} />
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("lessonsDone", { done, total })}
        accessibilityValue={{ min: 0, max: total, now: done }}
        style={styles.progressTrack}
      >
        <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

export function LessonPath({ stages, lessons, states, disabled, onOpen }: {
  stages: BlockStage[]; lessons: BlockLesson[]; states: Map<string, PathItemState>; disabled: boolean; onOpen(lesson: BlockLesson): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const byId = new Map(lessons.map(lesson => [lesson.lessonId, lesson]));
  const number = new Map(lessons.map((lesson, i) => [lesson.lessonId, i + 1]));
  const groups = stages.length
    ? [...stages].sort((a, b) => a.order - b.order)
    : [{ stageId: "all", order: 1, title: t("pathTitle"), lessonIds: lessons.map(l => l.lessonId) }];
  const visibleIds = groups.flatMap(stage => stage.lessonIds.filter(id => byId.has(id)));
  const finalLessonId = visibleIds[visibleIds.length - 1];

  return (
    <View style={styles.pathWrap}>
      {groups.map((stage, stageIndex) => {
        const stageLessons = stage.lessonIds
          .map(id => byId.get(id))
          .filter((item): item is BlockLesson => Boolean(item));
        if (!stageLessons.length) return null;
        return (
          <View key={stage.stageId} style={[styles.stageGroup, stageIndex > 0 && styles.stageGroupSpaced]}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageOverline}>{`${t("stage")} ${stage.order}`.toUpperCase()}</Text>
              <Text accessibilityRole="header" style={styles.stageTitle}>{stage.title}</Text>
            </View>
            <View>
              {stageLessons.map((lesson, i) => {
                const state = states.get(lesson.lessonId) ?? "locked";
                const isLastInStage = i === stageLessons.length - 1;
                const isOverallLast = lesson.lessonId === finalLessonId;
                return (
                  <PathRow
                    key={lesson.lessonId}
                    lesson={lesson}
                    state={state}
                    isLastInStage={isLastInStage}
                    isOverallLast={isOverallLast}
                    disabled={disabled || state === "locked"}
                    label={t("lessonA11y", { number: number.get(lesson.lessonId), title: lesson.title, state: t(stateKey[state]) })}
                    onPress={() => onOpen(lesson)}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PathRow({ lesson, state, isLastInStage, isOverallLast, disabled, label, onPress }: {
  lesson: BlockLesson; state: PathItemState; isLastInStage: boolean; isOverallLast: boolean; disabled: boolean; label: string; onPress(): void;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");

  const nodeStyle = state === "done"
    ? { backgroundColor: colors.successSurface }
    : state === "inProgress"
      ? { backgroundColor: colors.paper, borderWidth: 3, borderColor: colors.primary }
      : state === "current"
        ? { backgroundColor: colors.primary }
        : { backgroundColor: colors.selectedSurface };

  const iconName = state === "done"
    ? "check"
    : state === "inProgress"
      ? "flash-outline"
      : state === "current"
        ? "chevron-right"
        : "lock-outline";
  const iconSize = state === "locked" ? 18 : 20;
  const iconColor = state === "done"
    ? colors.success
    : state === "inProgress"
      ? colors.primary
      : state === "current"
        ? colors.onPrimary
        : colors.muted;

  const subtitle = state === "locked"
    ? t("stateLocked")
    : t("lessonMeta", { count: lessonMinutes(lesson), kind: t(lessonKindKey(lesson)) });

  return (
    <View style={styles.pathRow}>
      <View style={styles.railCol}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.railNode, nodeStyle]}>
          <AppIcon name={iconName} size={iconSize} color={iconColor} />
        </View>
        {!isOverallLast ? (
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.railConnector,
              { backgroundColor: state === "done" ? colors.success : colors.border },
              isLastInStage && styles.railConnectorStageEnd,
            ]}
          />
        ) : null}
      </View>

      <Pressable
        clipFeedback={false}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.lessonCard,
          figmaShadow("paper"),
          state === "current" && styles.lessonCardCurrent,
          !isLastInStage && styles.lessonCardSpaced,
        ]}
      >
        <Text style={[styles.lessonTitle, state === "locked" && styles.lessonTitleLocked]}>{lesson.title}</Text>
        <Text style={styles.lessonMeta}>{subtitle}</Text>
        {state === "done" ? <Chip label={t("stateDone")} tone="success" /> : null}
        {state === "inProgress" ? <Chip label={t("stateInProgress")} tone="warning" /> : null}
        {state === "current" ? <Chip label={t("stateCurrent")} tone="neutral" style={styles.pillChip} /> : null}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.camera,
    borderRadius: 28,
    padding: 24,
    gap: 6,
  },
  heroStitch: {
    position: "absolute",
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.onCamera,
    opacity: 0.35,
  },
  heroArt: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 72,
    height: 72,
  },
  heroCopy: {
    paddingRight: 76,
    gap: 6,
    minWidth: 0,
  },
  heroOverline: {
    ...figmaText.captionStrong,
    color: colors.onCamera,
    flexShrink: 1,
  },
  heroTitle: {
    ...figmaText.display,
    color: colors.onCamera,
    flexShrink: 1,
  },
  heroMeta: {
    ...figmaText.bodySmall,
    color: colors.onCamera,
    opacity: 0.92,
    flexShrink: 1,
  },
  heroAction: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  progressCard: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  progressCount: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  pillChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.selectedSurface,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pathWrap: {
    gap: 12,
  },
  stageGroup: {
    gap: 12,
  },
  stageGroupSpaced: {
    paddingTop: 8,
  },
  stageHeader: {
    gap: 0,
  },
  stageOverline: {
    ...figmaText.overline,
    color: colors.primary,
  },
  stageTitle: {
    ...figmaText.titleSection,
    color: colors.text,
    flexShrink: 1,
  },
  pathRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  railCol: {
    width: 44,
    alignItems: "center",
  },
  railNode: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  railConnector: {
    width: 3,
    flex: 1,
    minHeight: 16,
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  railConnectorStageEnd: {
    marginBottom: 0,
  },
  lessonCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    justifyContent: "center",
  },
  lessonCardCurrent: {
    padding: 14,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  lessonCardSpaced: {
    marginBottom: 12,
  },
  lessonTitle: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flexShrink: 1,
  },
  lessonTitleLocked: {
    color: colors.muted,
  },
  lessonMeta: {
    ...figmaText.bodySmall,
    color: colors.muted,
    flexShrink: 1,
  },
});
