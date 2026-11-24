import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { Redirect, router } from "expo-router";
import { LearningAiCard } from "@/features/learning/ai-card";
import { AssessmentDraftCard } from "@/features/learning/assessment-card";
import { LearningAchievements } from "@/features/learning/achievements";
import { useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { AppState, BackHandler, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { curriculumForLanguage } from "@/features/learning/curriculum";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { featureFlags } from "@/core/config/feature-flags";
import { guestOwnerId } from "@/core/local/guest-finance";
import { learningAttempts, learningDrafts, learningProgress } from "@/features/learning/progress-storage";
import type { LearningProgress } from "@/features/learning/progress";
import type { LearningDraft } from "@/features/learning/drafts";
import { WeeklyPractice } from "@/features/learning/weekly-practice";
import { FigmaHeader } from "@/features/settings/settings-figma";
import { lessonBlocksForLanguage, orderedLessons } from "@/features/learning/lesson-blocks";
import { LessonComplete, LessonPlayer } from "@/features/learning/lesson-player";
import { LessonPath, TodayLessonCard, type PathItemState } from "@/features/learning/learning-path";
import { blockAnswersFromLegacy, legacyQuizAnswers, lessonPathStates, type BlockLesson, type LessonAnswers } from "@picket/domain";

/** Financial-literacy course: bundled, self-reviewed content; cloud grading stays behind its own flag. */
export default function LearningPreview() {
  const { session, localMode } = useAuth();
  const owner = localMode ? guestOwnerId : session?.user.id;
  if (!featureFlags.learning || !owner) return <Redirect href="/" />;
  return <LearningSession key={owner} owner={owner} />;
}

type Completion = { lesson: BlockLesson; answers: LessonAnswers; xpEarned: number; review: boolean };

function LearningSession({ owner }: { owner: string }) {
  const { session, localMode } = useAuth();
  const attemptKey = useRef<{signature:string;key:string} | null>(null);
  const alive = useRef(true), operationBusy = useRef(false), progressRead = useRef(0);
  useEffect(() => { alive.current=true;return () => {alive.current=false;}; },[owner]);
  const canInteract = () => alive.current && !operationBusy.current;
  const { colors: c, language } = useAppTheme();
  const curriculum = curriculumForLanguage(language);
  const pack = lessonBlocksForLanguage(language);
  const lessons = orderedLessons(pack);
  const { t } = useTranslation("learning");
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draft, setDraft] = useState<LearningDraft | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<LessonAnswers>({});
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [reviewOffset,setReviewOffset]=useState<number|null>(null);
  const [reviews,setReviews]=useState<Awaited<ReturnType<typeof learningProgress.dueReviews>>>([]);
  useEffect(()=>{
    let active=true;
    const stop=learningProgress.subscribe(owner,()=>{
      const request=++progressRead.current;
      void learningProgress.load(owner).then(value=>{if(active && request===progressRead.current)setProgress(value);}).catch(()=>{if(active && request===progressRead.current)setStorageError(true);});
    });
    return()=>{active=false;stop();};
  },[owner]);
  useEffect(()=>{
    let active=true;
    let generation=0;
    const refresh=()=>{
      const request=++generation;
      void learningProgress.dueReviews(owner,new Date().toISOString().slice(0,10)).then(value=>{if(active && request===generation)setReviews(value);}).catch(()=>{if(active && request===generation)setStorageError(true);});
    };
    refresh();
    const subscription=AppState.addEventListener("change",state=>{if(state==="active")refresh();});
    const timer=setInterval(refresh,60000);
    return ()=>{active=false;subscription.remove();clearInterval(timer);};
  },[owner,progress]);
  useEffect(() => {
    let active = true;
    const request=++progressRead.current;
    void Promise.all([learningProgress.load(owner), learningDrafts.load(owner)]).then(([value,saved]) => {
      if (!active) return;
      if(request===progressRead.current)setProgress(value);
      setDraft(saved);
      setDraftReady(true);
    })
      .catch(() => { if (active) setStorageError(true); });
    return () => { active = false; };
  }, [owner]);
  const lesson = lessonId === null ? null : lessons.find(row => row.lessonId === lessonId) ?? null;
  const inLesson = !!lesson || !!completion;
  // Android back leaves the lesson first, then the screen.
  useEffect(() => {
    if (!inLesson) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (alive.current && !operationBusy.current) { setLessonId(null); setCompletion(null); setReviewOffset(null); setAnswers({}); }
      return true;
    });
    return () => subscription.remove();
  }, [inLesson]);
  async function retryStorage() {
    if(!canInteract())return;
    operationBusy.current=true;setSaving(true);
    const request=++progressRead.current;
    try {
      const [value,saved]=await Promise.all([learningProgress.load(owner),learningDrafts.load(owner)]);
      if(!alive.current || request!==progressRead.current)return;
      setProgress(value);
      // After hydration, current answers may be newer than the stored draft.
      if(!draftReady)setDraft(saved);
      setDraftReady(true);setStorageError(false);
    } catch { if(alive.current && request===progressRead.current)setStorageError(true); }
    finally { operationBusy.current=false;if(alive.current)setSaving(false); }
  }
  function openLesson(next: BlockLesson, offset: number | null = null) {
    if (!canInteract() || !draftReady) return;
    const resume = offset === null && draft?.lessonId === next.lessonId && draft.version === next.version;
    setAnswers(resume && draft ? blockAnswersFromLegacy(next, draft.answers) : {});
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
    operationBusy.current=true;
    progressRead.current++;
    setSaving(true);
    try {
      const selectedAnswers = legacyQuizAnswers(lesson, final) as number[];
      if (reviewOffset===null && !localMode && session?.user.id===owner && curriculum.publicationGate.publishable &&
          process.env.EXPO_PUBLIC_LEARNING_CLOUD_ENABLED==="true") {
        const signature=JSON.stringify([lesson.lessonId,lesson.version,selectedAnswers]);
        if(attemptKey.current?.signature!==signature)attemptKey.current={signature,key:Crypto.randomUUID()};
        await learningAttempts.enqueue(owner,{key:attemptKey.current.key,lessonId:lesson.lessonId,
          contentVersion:lesson.version,answers:selectedAnswers});
        if(!alive.current)return;
      }
      const before = progress.completed.find(row => row.lessonId === lesson.lessonId && row.version === lesson.version);
      const nextProgress=reviewOffset===null ? await learningProgress.complete(owner, lesson.lessonId, lesson.version) : await learningProgress.review(owner,lesson.lessonId,lesson.version,reviewOffset);
      if(!alive.current)return;
      progressRead.current++;
      setProgress(nextProgress);
      const added = before ? undefined : nextProgress.completed.find(row => row.lessonId === lesson.lessonId && row.version === lesson.version);
      setCompletion({ lesson, answers: final, xpEarned: reviewOffset === null ? added?.xp ?? 0 : 0, review: reviewOffset !== null });
      await learningDrafts.clearIfUnchanged(owner, {lessonId:lesson.lessonId,version:lesson.version,answers:selectedAnswers});
      if (alive.current && draft?.lessonId === lesson.lessonId) setDraft(null);
    }
    catch { if(alive.current)setStorageError(true); }
    finally { operationBusy.current=false;if(alive.current)setSaving(false); }
  }

  const order = lessons.map(row => row.lessonId);
  const completedIds = new Set(progress?.completed.map(row => row.lessonId) ?? []);
  const baseStates = lessonPathStates(order, completedIds);
  const states = new Map<string, PathItemState>(baseStates);
  const draftLesson = draft && !completedIds.has(draft.lessonId) && draft.answers.some(value => value !== null) ? draft.lessonId : null;
  if (draftLesson) states.set(draftLesson, "inProgress");
  const currentId = [...baseStates].find(([, state]) => state === "current")?.[0] ?? null;
  const today = lessons.find(row => row.lessonId === (draftLesson ?? currentId)) ?? null;
  const blocked = saving || !draftReady || !progress;

  if (completion) {
    const next = lessons.find(row => row.lessonId === currentId);
    return <LessonComplete lesson={completion.lesson} answers={completion.answers} xpEarned={completion.xpEarned} review={completion.review}
      lessonsDone={completedIds.size} lessonsTotal={lessons.length} hasNext={!completion.review && !!next}
      onNext={() => { if (next) openLesson(next); }} onBack={closeLesson} />;
  }
  if (lesson) {
    return <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <LessonPlayer key={`${lesson.lessonId}:${reviewOffset ?? "lesson"}`} lesson={lesson} initialAnswers={answers} busy={saving}
        onAnswersChange={changeAnswers} onExit={closeLesson} onFinish={final => void finish(final)} />
      {storageError ? <View style={{ position: "absolute", left: 16, right: 16, top: 72, gap: 8, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: paperShape.card, backgroundColor: c.dangerSurface }}>
        <Text accessibilityRole="alert" style={{ color: c.danger }}>{t("storageError")}</Text>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void retryStorage()} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: c.link, fontWeight: "700", flexShrink: 1 }}>{t("retryStorage")}</Text></Pressable>
      </View> : null}
    </View>;
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}><ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
    <FigmaHeader title={t("title")} backDisabled={saving} onBack={() => { if (canInteract()) router.back(); }} />
    <Text style={{ color: c.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 }}>{t("intro")}</Text>
    {storageError ? <View style={{ gap: 8 }}>
      <Text accessibilityRole="alert" style={{ color: c.danger }}>{t("storageError")}</Text>
      <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{disabled:saving}} onPress={()=>void retryStorage()} style={{minHeight:48,justifyContent:"center",paddingVertical:12,paddingHorizontal:16,borderWidth:1,borderColor:c.border,borderRadius:paperShape.button,backgroundColor:c.surface}}><Text style={{color:c.link,flexShrink:1}}>{t("retryStorage")}</Text></Pressable>
    </View> : !progress ? <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>{t("loading")}</Text> : null}
    <TodayLessonCard lesson={today} number={today ? order.indexOf(today.lessonId) + 1 : 0} stage={pack.stages.find(row => row.stageId === today?.stageId)}
      state={today ? states.get(today.lessonId) ?? "current" : "done"} done={completedIds.size} total={lessons.length} disabled={blocked}
      onStart={() => { if (today) openLesson(today); }} />
    {reviews.length>0 && <View style={{gap:12}}><Text accessibilityRole="header" style={{color:c.text,fontSize:20,fontWeight:"700"}}>{t("reviewTitle")}</Text>{reviews.map(review=>{
      const target = lessons.find(item=>item.lessonId===review.lessonId);
      return <Pressable key={`${review.lessonId}:${review.version}:${review.offset}`} accessibilityRole="button" disabled={blocked || !target} accessibilityState={{disabled:blocked || !target}} onPress={()=>{if(target)openLesson(target,review.offset);}} style={{minHeight:48,justifyContent:"center",paddingVertical:12,paddingHorizontal:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,borderRadius:paperShape.button}}><Text style={{color:c.link,flexShrink:1}}>{t("reviewOpen")} · {target?.title} · {review.dueDay}</Text></Pressable>;
    })}</View>}
    <LessonPath stages={pack.stages} lessons={lessons} states={states} disabled={blocked} onOpen={row => openLesson(row)} />
    {progress && <LearningAchievements owner={owner} progress={progress}/>}
    <WeeklyPractice owner={owner} />
    <LearningAiCard />
    <AssessmentDraftCard key={owner} owner={owner} />
    {!localMode&&session&&process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED==="true"&&<Pressable accessibilityRole="button" onPress={()=>router.push("/weekly-story-preview")} style={{minHeight:48,justifyContent:"center",paddingVertical:12,paddingHorizontal:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface,borderRadius:paperShape.button}}><Text style={{color:c.link,flexShrink:1}}>{t("storyTitle",{ns:"cashflow"})}</Text></Pressable>}
  </ScrollView></SafeAreaView>;
}
