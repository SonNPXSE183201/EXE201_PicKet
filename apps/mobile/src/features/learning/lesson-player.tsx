import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  blockAnswered, estimateIsClose, initialEstimate, quizBlocks, scoreLessonQuiz,
  type BlockLesson, type LessonAnswers, type LessonBlock, type LessonEstimateBlock, type LessonMythBlock, type LessonQuizBlock,
} from "@picket/domain";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { IconButton, PrimaryAction } from "@/core/ui/picket-ui";
import { figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { paperShape } from "@/core/theme/paper-foundations";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { EstimateSlider } from "./estimate-slider";

type Colors = ReturnType<typeof useAppTheme>["colors"];
const announce = (message: string) => { AccessibilityInfo.announceForAccessibility(message); };

/**
 * One lesson as a sequence of short blocks. Progress segments on top, the
 * primary action pinned at the bottom. Interactive blocks grade on tap.
 */
export function LessonPlayer({ lesson, initialAnswers, busy, onAnswersChange, onExit, onFinish }: {
  lesson: BlockLesson; initialAnswers: LessonAnswers; busy: boolean;
  onAnswersChange(answers: LessonAnswers): void; onExit(): void; onFinish(answers: LessonAnswers): void;
}) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<LessonAnswers>(initialAnswers);
  const scroll = useRef<{ scrollTo(options: { y: number; animated: boolean }): void } | null>(null);
  const block = lesson.blocks[index];
  const last = index === lesson.blocks.length - 1;
  const ready = blockAnswered(block, answers);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [index]);
  function answer(id: string, value: number) {
    if (busy || answers[id] !== undefined) return;
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onAnswersChange(next);
  }
  function advance() {
    if (busy || !ready) return;
    if (last) onFinish(answers);
    else setIndex(index + 1);
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
      <IconButton icon="close" label={t("exitLesson")} variant="surface" disabled={busy} onPress={onExit} />
      <ProgressSegments total={lesson.blocks.length} current={index} label={t("blockProgress", { current: index + 1, total: lesson.blocks.length })} />
      <IconButton icon="chevron-left" label={t("previousCard")} variant="surface" disabled={busy || index === 0} onPress={() => setIndex(Math.max(0, index - 1))} />
    </View>
    <ScrollView ref={scroll as never} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16, flexGrow: 1 }}>
      <Text numberOfLines={2} style={[figmaText.captionStrong, { color: c.muted }]}>{lesson.title}</Text>
      <BlockView key={block.id} block={block} lesson={lesson} answers={answers} disabled={busy} onAnswer={answer} />
    </ScrollView>
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.canvas }}>
      <PrimaryAction label={last ? t("finishLesson") : t("continue")} disabled={!ready} busy={busy} onPress={advance} />
    </View>
  </SafeAreaView>;
}

function ProgressSegments({ total, current, label }: { total: number; current: number; label: string }) {
  const { colors: c } = useAppTheme();
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 1, max: total, now: current + 1 }}
    style={{ flex: 1, flexDirection: "row", gap: 3, alignItems: "center" }}>
    {Array.from({ length: total }, (_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= current ? c.primary : c.disabledSurface }} />)}
  </View>;
}

function BlockView({ block, lesson, answers, disabled, onAnswer }: {
  block: LessonBlock; lesson: BlockLesson; answers: LessonAnswers; disabled: boolean; onAnswer(id: string, value: number): void;
}) {
  switch (block.type) {
    case "card": return <CardBlock block={block} />;
    case "myth": return <MythBlock block={block} answer={answers[block.id]} disabled={disabled} onAnswer={onAnswer} />;
    case "quiz": {
      const quizzes = quizBlocks(lesson);
      return <QuizBlock block={block} number={quizzes.indexOf(block) + 1} total={quizzes.length} answer={answers[block.id]} disabled={disabled} onAnswer={onAnswer} />;
    }
    case "estimate": return <EstimateBlock block={block} answer={answers[block.id]} disabled={disabled} onAnswer={onAnswer} />;
  }
}

function Panel({ children, tone = "surface" }: { children: React.ReactNode; tone?: "surface" | "elevated" }) {
  const { colors: c } = useAppTheme();
  return <View style={[{ gap: 14, padding: 20, borderRadius: paperShape.card, backgroundColor: tone === "surface" ? c.surface : c.elevated }, figmaShadow("paper")]}>{children}</View>;
}

function Overline({ children }: { children: string }) {
  const { colors: c } = useAppTheme();
  return <Text style={[figmaText.overline, { color: c.link, textTransform: "uppercase" }]}>{children}</Text>;
}

function CardBlock({ block }: { block: Extract<LessonBlock, { type: "card" }> }) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const label = t(block.kind === "objective" ? "objectiveLabel" : block.kind === "summary" ? "summaryLabel" : "conceptLabel");
  return <Panel tone={block.kind === "summary" ? "elevated" : "surface"}>
    <Overline>{label}</Overline>
    {block.text ? <Text accessibilityRole={block.kind === "objective" ? "header" : "text"}
      style={block.kind === "objective" ? [figmaText.display, { color: c.text }] : { color: c.text, fontSize: 17, lineHeight: 27 }}>{block.text}</Text> : null}
    {block.points?.map(point => <View key={point} style={{ flexDirection: "row", gap: 10 }}>
      <AppIcon name="check" size={22} color={c.success} />
      <Text style={{ flex: 1, color: c.text, fontSize: 16, lineHeight: 25 }}>{point}</Text>
    </View>)}
  </Panel>;
}

/** Large selectable answer row (radio semantics). */
function Choice({ label, selected, state, disabled, onPress, colors: c }: {
  label: string; selected: boolean; state: "idle" | "right" | "wrong" | "dimmed"; disabled: boolean; onPress(): void; colors: Colors;
}) {
  const border = state === "right" ? c.success : state === "wrong" ? c.danger : selected ? c.primary : c.border;
  const background = state === "right" ? c.successSurface : state === "wrong" ? c.dangerSurface : c.surface;
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16,
      borderRadius: paperShape.button, borderWidth: state === "idle" || state === "dimmed" ? 1 : 2, borderColor: border, backgroundColor: background }}>
    <Text style={{ flex: 1, color: state === "dimmed" ? c.muted : c.text, fontSize: 15, lineHeight: 22, fontWeight: "600" }}>{label}</Text>
    {state === "right" ? <AppIcon name="check-circle" size={22} color={c.success} /> : state === "wrong" ? <AppIcon name="close" size={22} color={c.danger} /> : null}
  </Pressable>;
}

function Feedback({ right, title, body }: { right: boolean; title: string; body: string }) {
  const { colors: c } = useAppTheme();
  return <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 16, borderRadius: paperShape.card, backgroundColor: right ? c.successSurface : c.warningSurface }}>
    <Text style={[figmaText.bodyStrong, { color: right ? c.success : c.warning }]}>{title}</Text>
    <Text style={{ color: c.text, fontSize: 15, lineHeight: 23 }}>{body}</Text>
  </View>;
}

function MythBlock({ block, answer, disabled, onAnswer }: { block: LessonMythBlock; answer?: number; disabled: boolean; onAnswer(id: string, value: number): void }) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  // 0 = myth, 1 = fact.
  const correct = block.answer === "myth" ? 0 : 1;
  const done = answer !== undefined;
  const right = answer === correct;
  function choose(value: number) {
    if (done || disabled) return;
    onAnswer(block.id, value);
    announce(`${t(value === correct ? "mythRight" : "mythWrong")} ${t("rememberLabel")}: ${block.explanation}`);
  }
  const options = [t("mythChoice"), t("factChoice")];
  return <View style={{ gap: 14 }}>
    <Panel>
      <Overline>{t("mythTitle")}</Overline>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 19, lineHeight: 28, fontWeight: "700" }}>“{block.statement}”</Text>
    </Panel>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("mythTitle")} style={{ flexDirection: "row", gap: 12 }}>
      {options.map((label, value) => <View key={label} style={{ flex: 1 }}>
        <Choice label={label} selected={answer === value} disabled={disabled || done} colors={c} onPress={() => choose(value)}
          state={!done ? "idle" : value === correct ? "right" : answer === value ? "wrong" : "dimmed"} />
      </View>)}
    </View>
    {done ? <Feedback right={right} title={t(right ? "mythRight" : "mythWrong")} body={`${t("rememberLabel")}: ${block.explanation}`} /> : null}
  </View>;
}

function QuizBlock({ block, number, total, answer, disabled, onAnswer }: {
  block: LessonQuizBlock; number: number; total: number; answer?: number; disabled: boolean; onAnswer(id: string, value: number): void;
}) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const done = answer !== undefined;
  const right = answer === block.correctIndex;
  function choose(value: number) {
    if (done || disabled) return;
    onAnswer(block.id, value);
    const ok = value === block.correctIndex;
    const extra = ok ? "" : ` ${t("correctAnswer", { answer: block.choices[block.correctIndex].text })}`;
    announce(`${t(ok ? "quizCorrect" : "quizWrong")} ${block.choices[value].explanation}${extra}`);
  }
  return <View style={{ gap: 14 }}>
    <Panel>
      <Overline>{t("quizLabel", { current: number, total })}</Overline>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 19, lineHeight: 28, fontWeight: "700" }}>{block.prompt}</Text>
      {!done ? <Text style={[figmaText.bodySmall, { color: c.muted }]}>{t("chooseAnswer")}</Text> : null}
    </Panel>
    <View accessibilityRole="radiogroup" accessibilityLabel={block.prompt} style={{ gap: 10 }}>
      {block.choices.map((choice, value) => <Choice key={value} label={choice.text} selected={answer === value} disabled={disabled || done} colors={c}
        onPress={() => choose(value)} state={!done ? "idle" : value === block.correctIndex ? "right" : answer === value ? "wrong" : "dimmed"} />)}
    </View>
    {done ? <Feedback right={right} title={t(right ? "quizCorrect" : "quizWrong")}
      body={right ? block.choices[answer].explanation : `${block.choices[answer].explanation}\n${t("correctAnswer", { answer: block.choices[block.correctIndex].text })}. ${block.choices[block.correctIndex].explanation}`} /> : null}
  </View>;
}

function EstimateBlock({ block, answer, disabled, onAnswer }: { block: LessonEstimateBlock; answer?: number; disabled: boolean; onAnswer(id: string, value: number): void }) {
  const { colors: c, language } = useAppTheme();
  const { t } = useTranslation("learning");
  const [guess, setGuess] = useState(() => answer ?? initialEstimate(block));
  const done = answer !== undefined;
  const money = (value: number) => formatMoney(value, language, block.unit);
  const close = done && estimateIsClose(block, answer);
  function reveal() {
    if (done || disabled) return;
    onAnswer(block.id, guess);
    const result = t(estimateIsClose(block, guess) ? "estimateClose" : "estimateFar", { answer: money(block.answer) });
    announce(`${result} ${block.explanation}`);
  }
  return <View style={{ gap: 14 }}>
    <Panel>
      <Overline>{t("estimateTitle")}</Overline>
      <Text accessibilityRole="header" style={{ color: c.text, fontSize: 19, lineHeight: 28, fontWeight: "700" }}>{block.prompt}</Text>
      <Text accessibilityLiveRegion="polite" style={[figmaText.amountPocket, { color: c.primary, textAlign: "center" }]}>{t("estimateGuess", { value: money(done ? answer : guess) })}</Text>
      <EstimateSlider value={done ? answer : guess} min={block.min} max={block.max} step={block.step} disabled={disabled || done}
        label={block.prompt} format={money} onChange={setGuess} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[figmaText.bodySmall, { color: c.muted }]}>{money(block.min)}</Text>
        <Text style={[figmaText.bodySmall, { color: c.muted }]}>{money(block.max)}</Text>
      </View>
      {!done ? <Text style={[figmaText.bodySmall, { color: c.muted }]}>{t("estimateHint")}</Text> : null}
    </Panel>
    {done
      ? <Feedback right={close} title={t(close ? "estimateClose" : "estimateFar", { answer: money(block.answer) })} body={block.explanation} />
      : <Pressable accessibilityRole="button" disabled={disabled} onPress={reveal}
          style={{ minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: paperShape.button, borderWidth: 1, borderColor: c.primaryOutline, backgroundColor: c.surface }}>
          <Text style={[figmaText.button, { color: c.link }]}>{t("estimateCheck")}</Text>
        </Pressable>}
  </View>;
}

/** End-of-lesson summary. Streaks are not tracked yet, so none is shown. */
export function LessonComplete({ lesson, answers, xpEarned, review, lessonsDone, lessonsTotal, hasNext, onNext, onBack }: {
  lesson: BlockLesson; answers: LessonAnswers; xpEarned: number; review: boolean; lessonsDone: number; lessonsTotal: number;
  hasNext: boolean; onNext(): void; onBack(): void;
}) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const score = scoreLessonQuiz(lesson, answers);
  const title = t(review ? "completeReview" : "completeTitle");
  useEffect(() => { announce(`${title} ${xpEarned > 0 ? t("xpEarned", { count: xpEarned }) : ""}`); }, [title, xpEarned, t]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}>
      <View style={{ alignItems: "center", gap: 12, paddingTop: 24 }}>
        <PaperArt id="moneyBloomScene" style={{ width: 140, height: 140 }} />
        <Text accessibilityRole="header" style={[figmaText.display, { color: c.text, textAlign: "center" }]}>{title}</Text>
        <Text style={[figmaText.bodyStrong, { color: c.muted, textAlign: "center" }]}>{lesson.title}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Stat value={xpEarned > 0 ? t("xpEarned", { count: xpEarned }) : "0"} caption="XP" a11y={t("xpEarned", { count: xpEarned })} />
        <Stat value={`${score.correct}/${score.total}`} caption={t("statQuiz")} a11y={t("quizScore", { correct: score.correct, total: score.total })} />
        <Stat value={`${lessonsDone}/${lessonsTotal}`} caption={t("statLessons")} a11y={t("lessonsDone", { done: lessonsDone, total: lessonsTotal })} />
      </View>
      {xpEarned === 0 && !review ? <Text style={[figmaText.bodySmall, { color: c.muted }]}>{t("xpAlready")}</Text> : null}
      <Panel tone="elevated">
        <Overline>{t("tryAction")}</Overline>
        <Text style={{ color: c.text, fontSize: 15, lineHeight: 23 }}>{lesson.optionalAction}</Text>
        <Text style={[figmaText.bodySmall, { color: c.muted }]}>{t("optionalPractice")}</Text>
      </Panel>
      <View style={{ gap: 4 }}>
        <Text style={[figmaText.captionStrong, { color: c.muted }]}>{t("sourcesTitle")}</Text>
        {lesson.sources.map(url => <Text key={url} selectable numberOfLines={1} style={[figmaText.bodySmall, { color: c.muted }]}>{url}</Text>)}
      </View>
    </ScrollView>
    <View style={{ gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: c.border }}>
      {hasNext ? <PrimaryAction label={t("nextLesson")} onPress={onNext} /> : null}
      <Pressable accessibilityRole="button" onPress={onBack} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: paperShape.button, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
        <Text style={[figmaText.button, { color: c.link }]}>{t("backToPath")}</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

function Stat({ value, caption, a11y }: { value: string; caption: string; a11y: string }) {
  const { colors: c } = useAppTheme();
  return <View accessible accessibilityLabel={a11y} style={{ flex: 1, alignItems: "center", gap: 2, padding: 12, borderRadius: paperShape.card, backgroundColor: c.surface }}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[figmaText.amountPocket, { color: c.text }]}>{value}</Text>
    <Text numberOfLines={2} style={[figmaText.micro, { color: c.muted, textAlign: "center" }]}>{caption}</Text>
  </View>;
}
