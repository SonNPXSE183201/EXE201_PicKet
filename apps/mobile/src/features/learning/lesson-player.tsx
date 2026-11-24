import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  blockAnswered, coarseEstimateStep, countWords, estimateIsClose, initialEstimate, quizBlocks, scoreLessonQuiz, snapEstimate,
  type BlockLesson, type LessonAnswers, type LessonBlock, type LessonEstimateBlock, type LessonMythBlock, type LessonQuizBlock,
} from "@picket/domain";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { IconButton } from "@/core/ui/picket-ui";
import { Chip, ConfirmDialog, FigmaButton, Notice, SelectIndicator, figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { EstimateSlider } from "./estimate-slider";

const announce = (message: string) => { AccessibilityInfo.announceForAccessibility(message); };

function readingSeconds(words: number) {
  return Math.max(5, Math.round((words / 2.4) / 5) * 5);
}

/**
 * One lesson as a sequence of short cards. Single progress bar on top,
 * primary + optional previous-card actions pinned at the bottom, exit dialog on close.
 */
export function LessonPlayer({ lesson, initialAnswers, initialIndex = 0, busy, onAnswersChange, onExit, onFinish }: {
  lesson: BlockLesson; initialAnswers: LessonAnswers; initialIndex?: number; busy: boolean;
  onAnswersChange(answers: LessonAnswers): void; onExit(): void; onFinish(answers: LessonAnswers): void;
}) {
  const { language } = useAppTheme();
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, lesson.blocks.length - 1)));
  const [answers, setAnswers] = useState<LessonAnswers>(initialAnswers);
  const [estimateGuesses, setEstimateGuesses] = useState<Record<string, number>>({});
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const scroll = useRef<{ scrollTo(options: { y: number; animated: boolean }): void } | null>(null);

  const block = lesson.blocks[index];
  const total = lesson.blocks.length;
  const last = index === total - 1;
  const ready = blockAnswered(block, answers);
  const quizzes = quizBlocks(lesson);
  const quizNumber = block.type === "quiz" ? quizzes.indexOf(block) + 1 : 0;
  const progressLabel = block.type === "quiz"
    ? t("quizCardProgress", { quiz: quizNumber, quizTotal: quizzes.length, current: index + 1, total })
    : t("blockProgress", { current: index + 1, total });

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [index]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (exitConfirmOpen) {
        setExitConfirmOpen(false);
        return true;
      }
      if (!busy) setExitConfirmOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [busy, exitConfirmOpen]);

  function answer(id: string, value: number) {
    if (busy || answers[id] !== undefined) return;
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onAnswersChange(next);
  }

  function revealEstimate(estimateBlock: LessonEstimateBlock) {
    if (busy || answers[estimateBlock.id] !== undefined) return;
    const guess = estimateGuesses[estimateBlock.id] ?? initialEstimate(estimateBlock);
    answer(estimateBlock.id, guess);
    const money = (value: number) => formatMoney(value, language, estimateBlock.unit);
    const result = t(estimateIsClose(estimateBlock, guess) ? "estimateClose" : "estimateFar", { answer: money(estimateBlock.answer) });
    announce(`${result} ${estimateBlock.explanation}`);
  }

  function advance() {
    if (busy || !ready) return;
    if (last) onFinish(answers);
    else setIndex(index + 1);
  }

  const estimatePending = block.type === "estimate" && !ready;
  const primaryLabel = estimatePending ? t("estimateCheck") : last ? t("finishLesson") : t("continue");
  const primaryDisabled = estimatePending ? busy : !ready;
  const onPrimaryPress = () => {
    if (block.type === "estimate" && !ready) revealEstimate(block);
    else advance();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <LessonHeader
        current={index + 1}
        total={total}
        label={progressLabel}
        closeLabel={t("exitLesson")}
        disabled={busy}
        onClose={() => setExitConfirmOpen(true)}
      />
      <ScrollView ref={scroll as never} contentContainerStyle={styles.body}>
        <BlockView
          key={block.id}
          block={block}
          lesson={lesson}
          quizNumber={quizNumber}
          quizTotal={quizzes.length}
          answers={answers}
          estimateGuess={block.type === "estimate" ? (estimateGuesses[block.id] ?? initialEstimate(block)) : 0}
          disabled={busy}
          onAnswer={answer}
          onEstimateGuessChange={(id, value) => setEstimateGuesses(prev => ({ ...prev, [id]: value }))}
        />
      </ScrollView>
      <LessonActionBar
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
        busy={busy}
        onPrimary={onPrimaryPress}
        secondaryLabel={index > 0 ? t("previousCard") : undefined}
        onSecondary={index > 0 ? () => setIndex(Math.max(0, index - 1)) : undefined}
      />
      <ConfirmDialog
        visible={exitConfirmOpen}
        title={t("exitDialogTitle")}
        body={t("exitDialogBody")}
        cancelLabel={t("exitDialogStay")}
        confirmLabel={t("exitDialogLeave")}
        onCancel={() => setExitConfirmOpen(false)}
        onConfirm={() => { setExitConfirmOpen(false); onExit(); }}
      />
    </SafeAreaView>
  );
}

function LessonHeader({ current, total, label, closeLabel, disabled, onClose }: {
  current: number; total: number; label: string; closeLabel: string; disabled: boolean; onClose(): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;

  return (
    <View style={styles.header}>
      <IconButton icon="close" label={closeLabel} variant="surface" disabled={disabled} onPress={onClose} />
      <View style={styles.headerProgressCol}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{ min: 1, max: total, now: current }}
          style={styles.headerTrack}
        >
          <View style={[styles.headerFill, { width: `${ratio * 100}%` }]} />
        </View>
        <Text numberOfLines={1} style={styles.headerMeta}>{label}</Text>
      </View>
    </View>
  );
}

function LessonActionBar({ primaryLabel, primaryDisabled, busy, onPrimary, secondaryLabel, onSecondary }: {
  primaryLabel: string; primaryDisabled: boolean; busy: boolean; onPrimary(): void; secondaryLabel?: string; onSecondary?: () => void;
}) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.actionBar}>
      <FigmaButton variant="primary" size="large" fullWidth label={primaryLabel} disabled={primaryDisabled} busy={busy} onPress={onPrimary} />
      {secondaryLabel && onSecondary ? (
        <FigmaButton variant="text" size="medium" label={secondaryLabel} disabled={busy} onPress={onSecondary} style={styles.secondaryAction} />
      ) : null}
    </View>
  );
}

function BlockView({ block, lesson, quizNumber, quizTotal, answers, estimateGuess, disabled, onAnswer, onEstimateGuessChange }: {
  block: LessonBlock; lesson: BlockLesson; quizNumber: number; quizTotal: number;
  answers: LessonAnswers; estimateGuess: number; disabled: boolean;
  onAnswer(id: string, value: number): void;
  onEstimateGuessChange(id: string, value: number): void;
}) {
  switch (block.type) {
    case "card":
      return <CardBlock block={block} lessonTitle={lesson.title} />;
    case "myth":
      return <MythBlock block={block} answer={answers[block.id]} disabled={disabled} onAnswer={onAnswer} />;
    case "quiz":
      return <QuizBlock block={block} number={quizNumber} total={quizTotal} answer={answers[block.id]} disabled={disabled} onAnswer={onAnswer} />;
    case "estimate":
      return (
        <EstimateBlock
          block={block}
          guess={estimateGuess}
          answer={answers[block.id]}
          disabled={disabled}
          onGuessChange={value => onEstimateGuessChange(block.id, value)}
        />
      );
  }
}

function CardBlock({ block, lessonTitle }: { block: Extract<LessonBlock, { type: "card" }>; lessonTitle: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const label = t(block.kind === "objective" ? "objectiveLabel" : block.kind === "summary" ? "summaryLabel" : "conceptLabel");
  const words = countWords(block.text ?? "") + (block.points?.reduce((sum, point) => sum + countWords(point), 0) ?? 0);

  return (
    <View style={[styles.card, figmaShadow("paper")]}>
      <PaperArt id="saveJar" style={styles.cardArt} />
      <Text style={styles.overline}>{label.toUpperCase()}</Text>
      <Text accessibilityRole="header" style={styles.cardTitle}>{lessonTitle}</Text>
      {block.text ? <Text style={styles.cardText}>{block.text}</Text> : null}
      {block.points?.map(point => (
        <View key={point} style={styles.pointRow}>
          <View style={styles.pointIcon}><AppIcon name="check" size={18} color={colors.success} /></View>
          <Text style={styles.pointText}>{point}</Text>
        </View>
      ))}
      {words > 0 ? <Text style={styles.readingMeta}>{t("cardReadingMeta", { words, seconds: readingSeconds(words) })}</Text> : null}
    </View>
  );
}

function MythBlock({ block, answer, disabled, onAnswer }: {
  block: LessonMythBlock; answer?: number; disabled: boolean; onAnswer(id: string, value: number): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  // 0 = myth, 1 = fact.
  const correct = block.answer === "myth" ? 0 : 1;
  const done = answer !== undefined;
  const right = answer === correct;

  function choose(value: number) {
    if (done || disabled) return;
    onAnswer(block.id, value);
    announce(`${t(value === correct ? "quizCorrect" : "quizWrong")} ${t(value === correct ? "mythRight" : "mythWrong")} ${t("rememberLabel")}: ${block.explanation}`);
  }

  const options = [t("mythChoice"), t("factChoice")];

  return (
    <View style={styles.blockStack}>
      <View style={[styles.card, figmaShadow("paper")]}>
        <Text style={styles.overline}>{t("mythTitle").toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.cardTitle}>{`"${block.statement}"`}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t("mythTitle")} style={styles.mythRow}>
          {options.map((optionLabel, value) => {
            const selected = answer === value;
            const dimmed = done && !selected;
            return (
              <Pressable
                key={optionLabel}
                accessibilityRole="radio"
                accessibilityLabel={optionLabel}
                accessibilityState={{ checked: selected, disabled: disabled || done }}
                disabled={disabled || done}
                onPress={() => choose(value)}
                style={[
                  styles.mythButton,
                  selected ? styles.mythButtonSelected : styles.mythButtonOutline,
                  dimmed && styles.mythButtonDimmed,
                ]}
              >
                <Text style={[styles.mythButtonLabel, selected && styles.mythButtonLabelSelected]}>{optionLabel}</Text>
              </Pressable>
            );
          })}
        </View>
        {!done ? <Text style={styles.hintText}>{t("mythHint")}</Text> : null}
      </View>

      {done ? (
        <>
          <Notice
            tone={right ? "success" : "warning"}
            title={t(right ? "quizCorrect" : "quizWrong")}
            body={t(right ? "mythRight" : "mythWrong")}
            liveRegion="polite"
          />
          <View style={[styles.rememberCard, figmaShadow("paper")]}>
            <Text style={styles.rememberOverline}>{t("rememberLabel").toUpperCase()}</Text>
            <Text style={styles.cardText}>{block.explanation}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function QuizBlock({ block, number, total, answer, disabled, onAnswer }: {
  block: LessonQuizBlock; number: number; total: number; answer?: number; disabled: boolean; onAnswer(id: string, value: number): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const done = answer !== undefined;
  const right = answer === block.correctIndex;

  function choose(value: number) {
    if (done || disabled) return;
    onAnswer(block.id, value);
    const ok = value === block.correctIndex;
    const extra = ok ? "" : ` ${t("correctAnswer", { answer: block.choices[block.correctIndex].text })}.`;
    announce(`${t(ok ? "quizCorrect" : "quizWrong")}${extra} ${block.choices[value].explanation}`);
  }

  return (
    <View style={styles.blockStack}>
      <View style={[styles.card, figmaShadow("paper")]}>
        <Text style={styles.overline}>{t("quizLabel", { current: number, total }).toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.cardTitle}>{block.prompt}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={block.prompt} style={styles.choicesCol}>
          {block.choices.map((choice, value) => {
            const selected = answer === value;
            const isCorrect = value === block.correctIndex;
            const isRightRow = done && isCorrect;
            const isWrongRow = done && selected && !isCorrect;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={choice.text}
                accessibilityState={{ checked: selected, disabled: disabled || done }}
                disabled={disabled || done}
                onPress={() => choose(value)}
                style={[
                  styles.choiceRow,
                  isRightRow && styles.choiceRowRight,
                  isWrongRow && styles.choiceRowWrong,
                ]}
              >
                <SelectIndicator checked={selected} shape="circle" />
                <Text style={styles.choiceText}>{choice.text}</Text>
              </Pressable>
            );
          })}
        </View>
        {!done ? <Text style={styles.hintText}>{t("chooseAnswer")}</Text> : null}
      </View>

      {done ? (
        <Notice
          tone={right ? "success" : "warning"}
          title={t(right ? "quizCorrect" : "quizWrong")}
          body={right
            ? block.choices[answer].explanation
            : `${t("correctAnswer", { answer: block.choices[block.correctIndex].text })}. ${block.choices[answer].explanation}`}
          liveRegion="polite"
        />
      ) : null}
    </View>
  );
}

function EstimateBlock({ block, guess, answer, disabled, onGuessChange }: {
  block: LessonEstimateBlock; guess: number; answer?: number; disabled: boolean; onGuessChange(value: number): void;
}) {
  const { language } = useAppTheme();
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const done = answer !== undefined;
  const currentValue = done ? answer : guess;
  const money = (value: number) => formatMoney(value, language, block.unit);
  const close = done && estimateIsClose(block, answer);
  const coarse = coarseEstimateStep(block.min, block.max, block.step);
  const nudge = (direction: 1 | -1) => {
    if (!disabled && !done) onGuessChange(snapEstimate(currentValue + direction * coarse, block.min, block.max, block.step));
  };

  return (
    <View style={styles.blockStack}>
      <View style={[styles.card, figmaShadow("paper")]}>
        <Text style={styles.overline}>{t("estimateTitle").toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.cardTitle}>{block.prompt}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.estimateValue}>
          {t("estimateGuess", { value: money(currentValue) })}
        </Text>
        <EstimateSlider
          value={currentValue}
          min={block.min}
          max={block.max}
          step={block.step}
          answer={done ? block.answer : undefined}
          disabled={disabled || done}
          label={block.prompt}
          format={money}
          onChange={onGuessChange}
        />
        {!done ? <Text style={styles.hintText}>{t("estimateHint")}</Text> : null}
        {!done ? (
          <View style={styles.estimateButtonsRow}>
            <FigmaButton
              variant="outline"
              size="large"
              label={t("decrease")}
              disabled={disabled || currentValue <= block.min}
              onPress={() => nudge(-1)}
              style={styles.estimateButton}
            />
            <FigmaButton
              variant="outline"
              size="large"
              label={t("increase")}
              disabled={disabled || currentValue >= block.max}
              onPress={() => nudge(1)}
              style={styles.estimateButton}
            />
          </View>
        ) : null}
      </View>

      {done ? (
        <Notice
          tone={close ? "success" : "info"}
          title={close ? t("estimateCloseTitle") : t("estimateFar", { answer: money(block.answer) })}
          body={close ? t("estimateAnswerBody", { answer: money(block.answer), explanation: block.explanation }) : block.explanation}
          liveRegion="polite"
        />
      ) : null}
    </View>
  );
}

/** End-of-lesson summary. Streaks are not tracked yet, so none is shown. */
export function LessonComplete({ lesson, answers, xpEarned, totalXp, review, lessonsDone, lessonsTotal, hasNext, onNext, onBack }: {
  lesson: BlockLesson; answers: LessonAnswers; xpEarned: number; totalXp?: number; review: boolean; lessonsDone: number; lessonsTotal: number;
  hasNext: boolean; onNext(): void; onBack(): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learning");
  const score = scoreLessonQuiz(lesson, answers);
  const title = t(review ? "completeReview" : "completeTitle");
  const xpSummary = totalXp ?? lessonsDone * 20;

  useEffect(() => {
    announce(`${title} ${xpEarned > 0 ? t("xpEarned", { count: xpEarned }) : ""}`);
  }, [title, xpEarned, t]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.completeBody}>
        <View style={styles.completeHero}>
          <PaperArt id="moneyBloomScene" style={styles.completeArt} />
          <Text accessibilityRole="header" style={styles.completeTitle}>{title}</Text>
          {xpEarned > 0 ? <Chip label={t("xpEarned", { count: xpEarned })} tone="success" /> : null}
          {score.total > 0 ? (
            <Text style={styles.completeScore}>{t("quizScore", { correct: score.correct, total: score.total })}</Text>
          ) : null}
          {xpEarned === 0 && !review ? <Text style={styles.completeSubnote}>{t("xpAlready")}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <StatCard
            value={`${lessonsDone}/${lessonsTotal}`}
            caption={t("statLessons")}
            a11y={t("lessonsDone", { done: lessonsDone, total: lessonsTotal })}
          />
          <StatCard
            value={`${xpSummary}`}
            caption={t("statXp")}
            a11y={t("learningXp", { count: xpSummary })}
          />
        </View>

        <Notice tone="info" title={t("xpNoticeTitle")} body={t("xpNoticeCompleteBody")} />

        <View style={[styles.rememberCard, figmaShadow("paper")]}>
          <Text style={styles.overline}>{t("tryAction").toUpperCase()}</Text>
          <Text style={styles.cardText}>{lesson.optionalAction}</Text>
          <Text style={styles.hintText}>{t("optionalPractice")}</Text>
        </View>

        {lesson.sources.length > 0 ? (
          <View style={styles.sourcesWrap}>
            <Text style={styles.sourcesTitle}>{t("sourcesTitle")}</Text>
            {lesson.sources.map(url => (
              <Text key={url} selectable numberOfLines={1} style={styles.sourceUrl}>{url}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actionBar}>
        {hasNext ? (
          <>
            <FigmaButton variant="primary" size="large" fullWidth label={t("nextLesson")} onPress={onNext} />
            <FigmaButton variant="text" size="medium" label={t("backToPath")} onPress={onBack} style={styles.secondaryAction} />
          </>
        ) : (
          <FigmaButton variant="primary" size="large" fullWidth label={t("backToPath")} onPress={onBack} />
        )}
      </View>
    </SafeAreaView>
  );
}

function StatCard({ value, caption, a11y }: { value: string; caption: string; a11y: string }) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <View accessible accessibilityLabel={a11y} style={[styles.statCard, figmaShadow("paper")]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.statValue}>{value}</Text>
      <Text style={styles.statCaption}>{caption}</Text>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.canvas,
  },
  headerProgressCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  headerTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.selectedSurface,
  },
  headerFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  headerMeta: {
    ...figmaText.micro,
    color: colors.muted,
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
    flexGrow: 1,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
    backgroundColor: colors.canvas,
  },
  secondaryAction: {
    alignSelf: "center",
  },
  blockStack: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  cardArt: {
    width: 112,
    height: 112,
  },
  overline: {
    ...figmaText.overline,
    color: colors.primary,
  },
  cardTitle: {
    ...figmaText.titleSection,
    color: colors.text,
    flexShrink: 1,
  },
  cardText: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flexShrink: 1,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointIcon: {
    paddingTop: 2,
  },
  pointText: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  readingMeta: {
    ...figmaText.micro,
    color: colors.muted,
    flexShrink: 1,
  },
  hintText: {
    ...figmaText.bodySmall,
    color: colors.muted,
    flexShrink: 1,
  },
  mythRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  mythButton: {
    flex: 1,
    flexBasis: 120,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mythButtonOutline: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mythButtonSelected: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  mythButtonDimmed: {
    opacity: 0.5,
  },
  mythButtonLabel: {
    ...figmaText.button,
    color: colors.text,
    textAlign: "center",
    flexShrink: 1,
  },
  mythButtonLabelSelected: {
    color: colors.onPrimary,
  },
  rememberCard: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  rememberOverline: {
    ...figmaText.overline,
    color: colors.muted,
  },
  choicesCol: {
    gap: 8,
  },
  choiceRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  choiceRowRight: {
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.successSurface,
  },
  choiceRowWrong: {
    borderWidth: 2,
    borderColor: colors.expense,
    backgroundColor: colors.warningSurface,
  },
  choiceText: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  estimateValue: {
    ...figmaText.amountLarge,
    color: colors.primary,
    flexShrink: 1,
  },
  estimateButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  estimateButton: {
    flex: 1,
    flexBasis: 120,
    minWidth: 0,
  },
  completeBody: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    gap: 12,
    flexGrow: 1,
  },
  completeHero: {
    alignItems: "center",
    gap: 12,
  },
  completeArt: {
    width: 140,
    height: 140,
  },
  completeTitle: {
    ...figmaText.display,
    color: colors.text,
    textAlign: "center",
    flexShrink: 1,
  },
  completeScore: {
    ...figmaText.bodyStrong,
    color: colors.text,
    textAlign: "center",
    flexShrink: 1,
  },
  completeSubnote: {
    ...figmaText.bodySmall,
    color: colors.muted,
    textAlign: "center",
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 14,
    gap: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    ...figmaText.amountLarge,
    color: colors.primary,
    textAlign: "center",
    flexShrink: 1,
  },
  statCaption: {
    ...figmaText.bodySmall,
    color: colors.muted,
    textAlign: "center",
    flexShrink: 1,
  },
  sourcesWrap: {
    gap: 4,
    paddingTop: 4,
  },
  sourcesTitle: {
    ...figmaText.captionStrong,
    color: colors.muted,
  },
  sourceUrl: {
    ...figmaText.bodySmall,
    color: colors.muted,
    flexShrink: 1,
  },
});
