import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { Redirect, router } from "expo-router";
import { LearningAiCard } from "@/features/learning/ai-card";
import { AssessmentDraftCard } from "@/features/learning/assessment-card";
import { LearningAchievements } from "@/features/learning/achievements";
import { useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { AppState, BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { curriculumForLanguage } from "@/features/learning/curriculum";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { featureFlags } from "@/core/config/feature-flags";
import { guestOwnerId } from "@/core/local/guest-finance";
import { learningAttempts, learningDrafts, learningProgress, weeklyPractice } from "@/features/learning/progress-storage";
import type { LearningProgress } from "@/features/learning/progress";
import type { LearningDraft } from "@/features/learning/drafts";
import type { PracticeEvent } from "@/features/learning/practice";
import { learningMilestones } from "@/features/learning/milestones";
import { WeeklyPractice } from "@/features/learning/weekly-practice";
import { TopAppBar } from "@/core/ui/picket-ui";
import { FigmaButton, Notice, figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { lessonBlocksForLanguage, orderedLessons } from "@/features/learning/lesson-blocks";
import { LessonComplete, LessonPlayer } from "@/features/learning/lesson-player";
import { LearningProgressCard, LessonPath, TodayLessonCard, type PathItemState } from "@/features/learning/learning-path";
import { blockAnswersFromLegacy, legacyQuizAnswers, lessonPathStates, type BlockLesson, type LessonAnswers } from "@picket/domain";

/** Financial-literacy course: bundled, self-reviewed content; cloud grading stays behind its own flag. */
export default function LearningPreview() {
  const { session, localMode } = useAuth();
  const owner = localMode ? guestOwnerId : session?.user.id;
  if (!featureFlags.learning || !owner) return <Redirect href="/" />;
  return <LearningSession key={owner} owner={owner} />;
}

type Completion = { lesson: BlockLesson; answers: LessonAnswers; xpEarned: number; review: boolean };

function resumeCardIndex(lesson: BlockLesson, answers: LessonAnswers): number {
  let lastAnswered = -1;
  lesson.blocks.forEach((block, idx) => {
    if (answers[block.id] !== undefined) lastAnswered = idx;
  });
  if (lastAnswered < 0) return 0;
  return Math.min(lesson.blocks.length - 1, lastAnswered + 1);
}

function LearningSession({ owner }: { owner: string }) {
  const { session, localMode } = useAuth();
  const attemptKey = useRef<{ signature: string; key: string } | null>(null);
  const alive = useRef(true), operationBusy = useRef(false), progressRead = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, [owner]);
  const canInteract = () => alive.current && !operationBusy.current;
  const { language } = useAppTheme();
  const { styles } = useMobileStyles(createStyles);
  const curriculum = curriculumForLanguage(language);
  const pack = lessonBlocksForLanguage(language);
  const lessons = orderedLessons(pack);
  const { t } = useTranslation("learning");
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [practiceEvents, setPracticeEvents] = useState<PracticeEvent[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draft, setDraft] = useState<LearningDraft | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [initialCardIndex, setInitialCardIndex] = useState(0);
  const [answers, setAnswers] = useState<LessonAnswers>({});
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [reviewOffset, setReviewOffset] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof learningProgress.dueReviews>>>([]);

  useEffect(() => {
    let active = true;
    const stop = learningProgress.subscribe(owner, () => {
      const request = ++progressRead.current;
      void learningProgress.load(owner).then(value => {
        if (active && request === progressRead.current) setProgress(value);
      }).catch(() => {
        if (active && request === progressRead.current) setStorageError(true);
      });
    });
    return () => { active = false; stop(); };
  }, [owner]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void weeklyPractice.load(owner).then(value => {
        if (active) setPracticeEvents(value);
      }).catch(() => undefined);
    };
    refresh();
    const stop = weeklyPractice.subscribe(owner, refresh);
    return () => { active = false; stop(); };
  }, [owner]);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = () => {
      const request = ++generation;
      void learningProgress.dueReviews(owner, new Date().toISOString().slice(0, 10)).then(value => {
        if (active && request === generation) setReviews(value);
      }).catch(() => {
        if (active && request === generation) setStorageError(true);
      });
    };
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    const timer = setInterval(refresh, 60000);
    return () => { active = false; subscription.remove(); clearInterval(timer); };
  }, [owner, progress]);

  useEffect(() => {
    let active = true;
    const request = ++progressRead.current;
    void Promise.all([learningProgress.load(owner), learningDrafts.load(owner)]).then(([value, saved]) => {
      if (!active) return;
      if (request === progressRead.current) setProgress(value);
      setDraft(saved);
      setDraftReady(true);
    }).catch(() => { if (active) setStorageError(true); });
    return () => { active = false; };
  }, [owner]);

  const lesson = lessonId === null ? null : lessons.find(row => row.lessonId === lessonId) ?? null;

  // Android back on completion returns to the learning path; inside LessonPlayer it opens the exit dialog.
  useEffect(() => {
    if (!completion) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (alive.current && !operationBusy.current) {
        setLessonId(null);
        setCompletion(null);
        setReviewOffset(null);
        setAnswers({});
      }
      return true;
    });
    return () => subscription.remove();
  }, [completion]);

  async function retryStorage() {
    if (!canInteract()) return;
    operationBusy.current = true; setSaving(true);
    const request = ++progressRead.current;
    try {
      const [value, saved] = await Promise.all([learningProgress.load(owner), learningDrafts.load(owner)]);
      if (!alive.current || request !== progressRead.current) return;
      setProgress(value);
      if (!draftReady) setDraft(saved);
      setDraftReady(true); setStorageError(false);
    } catch { if (alive.current && request === progressRead.current) setStorageError(true); }
    finally { operationBusy.current = false; if (alive.current) setSaving(false); }
  }

  function openLesson(next: BlockLesson, offset: number | null = null) {
    if (!canInteract() || !draftReady) return;
    const resume = offset === null && draft?.lessonId === next.lessonId && draft.version === next.version;
    const restored = resume && draft ? blockAnswersFromLegacy(next, draft.answers) : {};
    setAnswers(restored);
    setInitialCardIndex(resume ? resumeCardIndex(next, restored) : 0);
    setReviewOffset(offset);
    setCompletion(null);
    setLessonId(next.lessonId);
  }

  function closeLesson() {
    if (!canInteract()) return;
    setLessonId(null); setCompletion(null); setReviewOffset(null); setAnswers({});
  }

  function changeAnswers(next: LessonAnswers) {
    setAnswers(next);
    if (!lesson || reviewOffset !== null || storageError || !draftReady) return;
    const saved = { lessonId: lesson.lessonId, version: lesson.version, answers: legacyQuizAnswers(lesson, next) };
    setDraft(saved);
    void learningDrafts.save(owner, saved).catch(() => { if (alive.current) setStorageError(true); });
  }

  async function finish(final: LessonAnswers) {
    if (!lesson || !canInteract() || !progress || storageError) return;
    operationBusy.current = true;
    progressRead.current++;
    setSaving(true);
    try {
      const selectedAnswers = legacyQuizAnswers(lesson, final) as number[];
      if (reviewOffset === null && !localMode && session?.user.id === owner && curriculum.publicationGate.publishable &&
        process.env.EXPO_PUBLIC_LEARNING_CLOUD_ENABLED === "true") {
        const signature = JSON.stringify([lesson.lessonId, lesson.version, selectedAnswers]);
        if (attemptKey.current?.signature !== signature) attemptKey.current = { signature, key: Crypto.randomUUID() };
        await learningAttempts.enqueue(owner, {
          key: attemptKey.current.key,
          lessonId: lesson.lessonId,
          contentVersion: lesson.version,
          answers: selectedAnswers,
        });
        if (!alive.current) return;
      }
      const before = progress.completed.find(row => row.lessonId === lesson.lessonId && row.version === lesson.version);
      const nextProgress = reviewOffset === null
        ? await learningProgress.complete(owner, lesson.lessonId, lesson.version)
        : await learningProgress.review(owner, lesson.lessonId, lesson.version, reviewOffset);
      if (!alive.current) return;
      progressRead.current++;
      setProgress(nextProgress);
      const added = before ? undefined : nextProgress.completed.find(row => row.lessonId === lesson.lessonId && row.version === lesson.version);
      setCompletion({ lesson, answers: final, xpEarned: reviewOffset === null ? added?.xp ?? 0 : 0, review: reviewOffset !== null });
      await learningDrafts.clearIfUnchanged(owner, { lessonId: lesson.lessonId, version: lesson.version, answers: selectedAnswers });
      if (alive.current && draft?.lessonId === lesson.lessonId) setDraft(null);
    } catch { if (alive.current) setStorageError(true); }
    finally { operationBusy.current = false; if (alive.current) setSaving(false); }
  }

  const order = lessons.map(row => row.lessonId);
  const completedIds = new Set(progress?.completed.map(row => row.lessonId) ?? []);
  const baseStates = lessonPathStates(order, completedIds);
  const states = new Map<string, PathItemState>(baseStates);
  const draftLesson = draft && !completedIds.has(draft.lessonId) && draft.answers.some(value => value !== null) ? draft.lessonId : null;
  if (draftLesson) states.set(draftLesson, "inProgress");
  const currentId = [...baseStates].find(([, state]) => state === "current")?.[0] ?? null;
  const today = lessons.find(row => row.lessonId === (draftLesson ?? currentId)) ?? null;
  const todayState = today ? states.get(today.lessonId) ?? "current" : "done";
  const todayDraftAnswers = today && todayState === "inProgress" && draft ? blockAnswersFromLegacy(today, draft.answers) : null;
  const todayDraftCard = today && todayDraftAnswers ? resumeCardIndex(today, todayDraftAnswers) + 1 : undefined;
  const totalXp = progress ? learningMilestones(owner, progress.completed, practiceEvents).xp : 0;
  const blocked = saving || !draftReady || !progress;

  if (completion) {
    const next = lessons.find(row => row.lessonId === currentId);
    return (
      <LessonComplete
        lesson={completion.lesson}
        answers={completion.answers}
        xpEarned={completion.xpEarned}
        totalXp={totalXp}
        review={completion.review}
        lessonsDone={completedIds.size}
        lessonsTotal={lessons.length}
        hasNext={!completion.review && !!next}
        onNext={() => { if (next) openLesson(next); }}
        onBack={closeLesson}
      />
    );
  }

  if (lesson) {
    return (
      <View style={styles.screen}>
        <LessonPlayer
          key={`${lesson.lessonId}:${reviewOffset ?? "lesson"}`}
          lesson={lesson}
          initialAnswers={answers}
          initialIndex={initialCardIndex}
          busy={saving}
          onAnswersChange={changeAnswers}
          onExit={closeLesson}
          onFinish={final => void finish(final)}
        />
        {storageError ? (
          <View style={styles.floatingError}>
            <Notice
              tone="warning"
              body={t("storageError")}
              liveRegion="assertive"
              action={<FigmaButton variant="text" size="medium" label={t("retryStorage")} disabled={saving} onPress={() => void retryStorage()} style={styles.inlineAction} />}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.fixedTopBar}>
        <TopAppBar title={t("title")} backDisabled={saving} onBack={() => { if (canInteract()) router.back(); }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {storageError ? (
          <Notice
            tone="warning"
            body={t("storageError")}
            liveRegion="assertive"
            action={<FigmaButton variant="outline" size="medium" label={t("retryStorage")} disabled={saving} onPress={() => void retryStorage()} style={styles.inlineAction} />}
          />
        ) : !progress ? (
          <Text accessibilityLiveRegion="polite" style={styles.loadingText}>{t("loading")}</Text>
        ) : null}

        <TodayLessonCard
          lesson={today}
          state={todayState}
          draftCard={todayDraftCard}
          draftTotal={today?.blocks.length}
          disabled={blocked}
          onStart={() => { if (today) openLesson(today); }}
        />

        <LearningProgressCard done={completedIds.size} total={lessons.length} xp={totalXp} />

        {reviews.length > 0 ? (
          <View style={[styles.reviewCard, figmaShadow("paper")]}>
            <Text style={styles.reviewOverline}>{t("reviewTitle").toUpperCase()}</Text>
            {reviews.map(review => {
              const target = lessons.find(item => item.lessonId === review.lessonId);
              if (!target) return null;
              return (
                <View key={`${review.lessonId}:${review.version}:${review.offset}`} style={styles.reviewItem}>
                  <Text style={styles.reviewItemTitle}>{target.title}</Text>
                  <Text style={styles.reviewItemMeta}>{t("reviewDueMeta", { days: review.offset })}</Text>
                  <FigmaButton
                    variant="outline"
                    size="medium"
                    label={t("reviewOpen")}
                    disabled={blocked}
                    onPress={() => openLesson(target, review.offset)}
                    style={styles.inlineAction}
                  />
                </View>
              );
            })}
          </View>
        ) : null}

        <LessonPath stages={pack.stages} lessons={lessons} states={states} disabled={blocked} onOpen={row => openLesson(row)} />

        {progress ? <LearningAchievements owner={owner} progress={progress} /> : null}
        <WeeklyPractice owner={owner} />
        <LearningAiCard />
        <AssessmentDraftCard key={owner} owner={owner} />
        {!localMode && session && process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED === "true" ? (
          <FigmaButton variant="outline" size="large" fullWidth label={t("storyTitle", { ns: "cashflow" })} onPress={() => router.push("/weekly-story-preview")} />
        ) : null}
        <Text style={styles.disclaimerText}>{t("intro")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  fixedTopBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 12,
  },
  loadingText: {
    ...figmaText.bodySmall,
    color: colors.muted,
  },
  floatingError: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 72,
  },
  inlineAction: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  reviewCard: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  reviewOverline: {
    ...figmaText.overline,
    color: colors.primary,
  },
  reviewItem: {
    gap: 4,
  },
  reviewItemTitle: {
    ...figmaText.bodyStrong,
    color: colors.text,
    flexShrink: 1,
  },
  reviewItemMeta: {
    ...figmaText.bodySmall,
    color: colors.muted,
    flexShrink: 1,
  },
  disclaimerText: {
    ...figmaText.bodySmall,
    color: colors.muted,
    paddingTop: 4,
    flexShrink: 1,
  },
});
