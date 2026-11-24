import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { BlockLesson, BlockStage, LessonPathState } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { PrimaryAction } from "@/core/ui/picket-ui";
import { figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { paperShape } from "@/core/theme/paper-foundations";
import { useAppTheme } from "@/features/settings/appearance-provider";

/** Path state plus "in progress" for the lesson that has a saved draft. */
export type PathItemState = LessonPathState | "inProgress";
const stateKey = { done: "stateDone", current: "stateCurrent", inProgress: "stateInProgress", locked: "stateLocked" } as const;
/** About 15 seconds per block, never under two minutes. */
export const lessonMinutes = (lesson: BlockLesson) => Math.max(2, Math.round(lesson.blocks.length * 15 / 60));

export function TodayLessonCard({ lesson, number, stage, state, done, total, disabled, onStart }: {
  lesson: BlockLesson | null; number: number; stage?: BlockStage; state: PathItemState; done: number; total: number; disabled: boolean; onStart(): void;
}) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const ratio = total ? done / total : 0;
  return <View style={[{ gap: 12, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: paperShape.card, backgroundColor: c.surface }, figmaShadow("paper")]}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <Text style={[figmaText.overline, { flexGrow: 1, flexShrink: 1, minWidth: 0, color: c.link, textTransform: "uppercase" }]}>{lesson ? t("todayLesson") : t("allDoneTitle")}</Text>
      <Text style={[figmaText.captionStrong, { flexShrink: 1, color: c.muted }]}>{t("lessonsDone", { done, total })}</Text>
    </View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t("lessonsDone", { done, total })} accessibilityValue={{ min: 0, max: total, now: done }}
      style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: c.disabledSurface }}>
      <View style={{ width: `${ratio * 100}%`, height: 8, backgroundColor: c.primary }} />
    </View>
    {lesson ? <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          {stage ? <Text style={[figmaText.bodySmall, { flexShrink: 1, color: c.muted }]}>{t("stage")} {stage.order} · {stage.title}</Text> : null}
          <Text accessibilityRole="header" style={[figmaText.display, { flexShrink: 1, color: c.text }]}>{number}. {lesson.title}</Text>
        </View>
        <PaperArt id="education" style={{ width: 72, height: 72 }} />
      </View>
      <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>{lesson.objective}</Text>
      <Text style={[figmaText.captionStrong, { color: c.muted }]}>{t("minutes", { count: lessonMinutes(lesson) })}</Text>
      <PrimaryAction label={t(state === "inProgress" ? "continueLesson" : state === "done" ? "replayLesson" : "startLesson")} disabled={disabled} onPress={onStart} />
    </> : <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>{t("allDoneBody")}</Text>}
  </View>;
}

export function LessonPath({ stages, lessons, states, disabled, onOpen }: {
  stages: BlockStage[]; lessons: BlockLesson[]; states: Map<string, PathItemState>; disabled: boolean; onOpen(lesson: BlockLesson): void;
}) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const byId = new Map(lessons.map(lesson => [lesson.lessonId, lesson]));
  const number = new Map(lessons.map((lesson, i) => [lesson.lessonId, i + 1]));
  const groups = stages.length ? [...stages].sort((a, b) => a.order - b.order) : [{ stageId: "all", order: 1, title: t("pathTitle"), lessonIds: lessons.map(l => l.lessonId) }];
  return <View style={{ gap: 20 }}>
    <Text accessibilityRole="header" style={[figmaText.titleSection, { color: c.text }]}>{t("pathTitle")}</Text>
    {groups.map(stage => <View key={stage.stageId} style={{ gap: 4 }}>
      <Text style={[figmaText.overline, { color: c.link, textTransform: "uppercase" }]}>{t("stage")} {stage.order}</Text>
      <Text accessibilityRole="header" style={[figmaText.bodyStrong, { color: c.text, marginBottom: 6 }]}>{stage.title}</Text>
      {stage.lessonIds.map((id, i) => {
        const lesson = byId.get(id);
        if (!lesson) return null;
        const state = states.get(id) ?? "locked";
        return <PathRow key={id} lesson={lesson} number={number.get(id) ?? 0} state={state} last={i === stage.lessonIds.length - 1}
          disabled={disabled || state === "locked"} label={t("lessonA11y", { number: number.get(id), title: lesson.title, state: t(stateKey[state]) })}
          stateLabel={t(stateKey[state])} onPress={() => onOpen(lesson)} />;
      })}
    </View>)}
  </View>;
}

function PathRow({ lesson, number, state, last, disabled, label, stateLabel, onPress }: {
  lesson: BlockLesson; number: number; state: PathItemState; last: boolean; disabled: boolean; label: string; stateLabel: string; onPress(): void;
}) {
  const { colors: c } = useAppTheme();
  const active = state === "current" || state === "inProgress";
  const icon = state === "done" ? "check" : state === "locked" ? "lock-outline" : "school-outline";
  const nodeBackground = state === "done" ? c.success : active ? c.primary : c.disabledSurface;
  const nodeColor = state === "locked" ? c.disabledText : c.onPrimary;
  return <View style={{ flexDirection: "row", gap: 12 }}>
    <View style={{ width: 40, alignItems: "center" }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: nodeBackground }}>
        <AppIcon name={icon} size={20} color={state === "done" ? c.surface : nodeColor} />
      </View>
      {!last ? <View style={{ flex: 1, width: 2, minHeight: 12, backgroundColor: state === "done" ? c.success : c.border }} /> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={{ flex: 1, minWidth: 0, minHeight: 56, marginBottom: last ? 0 : 8, justifyContent: "center", gap: 2, paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: paperShape.button, borderWidth: active ? 2 : 1, borderColor: active ? c.primary : c.border,
        backgroundColor: state === "locked" ? c.canvas : c.surface }}>
      <Text style={[figmaText.bodyStrong, { flexShrink: 1, color: state === "locked" ? c.muted : c.text }]}>{number}. {lesson.title}</Text>
      <Text style={[figmaText.bodySmall, { flexShrink: 1, color: state === "done" ? c.success : active ? c.link : c.muted }]}>{stateLabel}</Text>
    </Pressable>
  </View>;
}
