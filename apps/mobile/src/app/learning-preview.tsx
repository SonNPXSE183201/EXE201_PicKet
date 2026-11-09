import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { Redirect, router } from "expo-router";
import { LearningAiCard } from "@/features/learning/ai-card";
import { AssessmentDraftCard } from "@/features/learning/assessment-card";
import { LearningAchievements } from "@/features/learning/achievements";
import { useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { AppState, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { curriculumForLanguage, gradeQuiz } from "@/features/learning/curriculum";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { featureFlags } from "@/core/config/feature-flags";
import { guestOwnerId } from "@/core/local/guest-finance";
import { learningAttempts, learningDrafts, learningProgress } from "@/features/learning/progress-storage";
import type { LearningProgress } from "@/features/learning/progress";
import { NeedsWantsPractice } from "@/features/learning/needs-wants";
import { WeeklyPractice } from "@/features/learning/weekly-practice";
import { figmaShadow } from "@/core/ui/figma-ui";
import { FigmaHeader } from "@/features/settings/settings-figma";

/** Financial-literacy course: bundled, self-reviewed content; cloud grading stays behind its own flag. */
export default function LearningPreview() {
  const { session, localMode } = useAuth();
  const owner = localMode ? guestOwnerId : session?.user.id;
  if (!featureFlags.learning || !owner) return <Redirect href="/" />;
  return <LearningSession key={owner} owner={owner} />;
}

function LearningSession({ owner }: { owner: string }) {
  const { session, localMode } = useAuth();
  const attemptKey = useRef<{signature:string;key:string} | null>(null);
  const alive = useRef(true), operationBusy = useRef(false), progressRead = useRef(0);
  useEffect(() => { alive.current=true;return () => {alive.current=false;}; },[owner]);
  const canInteract = () => alive.current && !operationBusy.current;
  const { colors: c, language } = useAppTheme();
  const curriculum = curriculumForLanguage(language);
  const { t } = useTranslation("learning");
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [lessonIndex, setLessonIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [reviewOffset,setReviewOffset]=useState<number|null>(null);
  const [reviewSaved,setReviewSaved]=useState(false);
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
    void Promise.all([learningProgress.load(owner), learningDrafts.load(owner)]).then(([value,draft]) => {
      if (!active) return;
      if(request===progressRead.current)setProgress(value);
      if (draft) {
        setLessonIndex(curriculumForLanguage("vi").lessons.findIndex(row => row.lessonId === draft.lessonId));
        setAnswers(Object.fromEntries(draft.answers.flatMap((answer,i) => answer === null ? [] : [[i,answer]])));
      }
      setDraftReady(true);
    })
      .catch(() => { if (active) setStorageError(true); });
    return () => { active = false; };
  }, [owner]);
  const lesson = lessonIndex === null ? null : curriculum.lessons[lessonIndex];
  useEffect(() => {
    if (!draftReady || !lesson || storageError || submitted) return;
    let active = true;
    void learningDrafts.save(owner, { lessonId: lesson.lessonId, version: lesson.version, answers: lesson.questions.map((_,i) => answers[i] ?? null) })
      .catch(() => { if (active) setStorageError(true); });
    return () => { active = false; };
  }, [answers, draftReady, lesson, owner, storageError, submitted]);
  async function retryStorage() {
    if(!canInteract())return;
    operationBusy.current=true;setSaving(true);
    const request=++progressRead.current;
    try {
      const [value,draft]=await Promise.all([learningProgress.load(owner),learningDrafts.load(owner)]);
      if(!alive.current || request!==progressRead.current)return;
      setProgress(value);
      // After hydration, current answers may be newer than the stored draft.
      if(!draftReady && draft){
        setLessonIndex(curriculumForLanguage("vi").lessons.findIndex(row=>row.lessonId===draft.lessonId));
        setAnswers(Object.fromEntries(draft.answers.flatMap((answer,i)=>answer===null?[]:[[i,answer]])));
      }
      setDraftReady(true);setStorageError(false);
    } catch { if(alive.current && request===progressRead.current)setStorageError(true); }
    finally { operationBusy.current=false;if(alive.current)setSaving(false); }
  }
  const result = lesson && submitted ? gradeQuiz(lesson, lesson.questions.map((_,i) => answers[i])) : null;
  const complete = lesson?.questions.every((_,i) => answers[i] !== undefined) ?? false;
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}><ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
    <FigmaHeader title={lesson?.title ?? t("title")} backDisabled={saving} onBack={() => { if(!canInteract())return; if (lesson) { setLessonIndex(null); setAnswers({}); setSubmitted(false); setReviewOffset(null);setReviewSaved(false); } else router.back(); }} />
    <Text style={{ color: c.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 }}>{t("intro")}</Text>
    {!lesson && progress && <LearningAchievements owner={owner} progress={progress}/>}
    {!lesson && reviews.length>0 && <View style={{gap:12}}><Text accessibilityRole="header" style={{color:c.text,fontSize:22,fontWeight:"700"}}>{t("reviewTitle")}</Text>{reviews.map(review=><Pressable key={`${review.lessonId}:${review.version}:${review.offset}`} accessibilityRole="button" disabled={saving || !draftReady} accessibilityState={{disabled:saving || !draftReady}} onPress={()=>{if(!canInteract() || !draftReady)return;setLessonIndex(curriculum.lessons.findIndex(item=>item.lessonId===review.lessonId));setReviewOffset(review.offset);setReviewSaved(false);setAnswers({});setSubmitted(false);}} style={{padding:16,backgroundColor:c.surface,borderRadius:paperShape.button}}><Text style={{color:c.link}}>{t("reviewOpen")} · {curriculum.lessons.find(item=>item.lessonId===review.lessonId)?.title} · {review.dueDay}</Text></Pressable>)}</View>}
    <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>{storageError ? t("storageError") : progress ? `${progress.completed.length}/${curriculum.lessons.length}` : t("loading")}</Text>
    {storageError && <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{disabled:saving}} onPress={()=>void retryStorage()} style={{minHeight:48,padding:14,backgroundColor:c.surface}}><Text style={{color:c.link}}>{t("retryStorage")}</Text></Pressable>}
    {!lesson ? curriculum.lessons.map((item,i) => { const stage = i===0 || curriculum.lessons[i-1].stageId!==item.stageId ? curriculum.stages?.find(row=>row.stageId===item.stageId) : undefined; return <View key={item.lessonId} style={{ gap: 12 }}>{stage && <View style={{ gap: 2, paddingTop: 8 }}><Text style={{ color: c.link, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" }}>{t("stage", { defaultValue: "Chặng" })} {stage.order}</Text><Text accessibilityRole="header" style={{ color: c.text, fontSize: 16, fontWeight: "800", lineHeight: 26 }}>{stage.title}</Text><Text style={{ color: c.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 }}>{stage.summary}</Text></View>}<Pressable accessibilityRole="button" disabled={saving || !draftReady} accessibilityState={{disabled:saving || !draftReady}} onPress={() => { if(!canInteract() || !draftReady)return;setLessonIndex(i); setAnswers({}); setSubmitted(false); }} style={[{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, minHeight: 56, gap: 2 }, figmaShadow("paper")]}><Text style={{ color: c.text, fontSize: 14, fontWeight: "700", lineHeight: 21 }}>{i+1}. {item.title}</Text><Text style={{ color: c.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 }}>{item.objective}</Text></Pressable></View>; }) : <>
      <Text style={{ color: c.muted }}>{lesson.objective}</Text>
      <Text style={{ color: c.text, lineHeight: 25 }}>{lesson.body}</Text>
      <Text style={{ color: c.text, lineHeight: 24, backgroundColor: c.elevated, padding: 16 }}>{lesson.workedExample.description}</Text>
      {lesson.questions.map((question,i) => <View key={`${lesson.lessonId}:${i}`} style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ color: c.text, fontWeight: "700" }}>{i+1}. {question.prompt}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={question.prompt} style={{ gap: 8 }}>{question.choices.map((choice,j) => <Pressable key={j} accessibilityRole="radio" disabled={submitted || saving} accessibilityState={{ checked: answers[i] === j, disabled: submitted || saving }} onPress={() => {if(!canInteract() || submitted)return;setAnswers(old => ({ ...old, [i]: j }));}} style={{ minHeight: 48, padding: 14, borderRadius: paperShape.button, borderWidth: 1, borderColor: answers[i] === j ? c.primary : c.border, backgroundColor: c.surface }}><Text style={{ color: c.text }}>{choice.text}</Text>{submitted && <Text style={{ color: c.muted, marginTop: 8 }}>{choice.explanation}</Text>}</Pressable>)}</View>
      </View>)}
      {!submitted && <Pressable accessibilityRole="button" disabled={!complete} accessibilityState={{ disabled: !complete }} onPress={() => {if(canInteract() && complete)setSubmitted(true);}} style={{ minHeight: 52, padding: 16, borderRadius: paperShape.button, backgroundColor: complete ? c.primary : c.disabledSurface }}><Text style={{ color: complete ? c.onPrimary : c.disabledText }}>{t("explanations")}</Text></Pressable>}
      {result && <><Text accessibilityLiveRegion="polite" style={{ color: c.text }}>{t("result", {correct: result.correct, total: result.total})}</Text><Pressable accessibilityRole="button" disabled={saving} accessibilityState={{disabled:saving}} onPress={() => { if(!canInteract())return; setSubmitted(false); setAnswers({}); }}><Text style={{ color: c.link }}>{t("retry")}</Text></Pressable></>}
      {result && <Pressable accessibilityRole="button" disabled={!progress || saving || storageError} accessibilityState={{ disabled: !progress || saving || storageError }} onPress={async () => {
        if(!canInteract() || !progress || storageError)return;
        operationBusy.current=true;
        progressRead.current++;
        setSaving(true);
        try {
          if (reviewOffset===null && !localMode && session?.user.id===owner && curriculum.publicationGate.publishable &&
              process.env.EXPO_PUBLIC_LEARNING_CLOUD_ENABLED==="true") {
            const selectedAnswers=lesson.questions.map((_,i)=>answers[i]);
            const signature=JSON.stringify([lesson.lessonId,lesson.version,selectedAnswers]);
            if(attemptKey.current?.signature!==signature)attemptKey.current={signature,key:Crypto.randomUUID()};
            await learningAttempts.enqueue(owner,{key:attemptKey.current.key,lessonId:lesson.lessonId,
              contentVersion:lesson.version,answers:selectedAnswers});
            if(!alive.current)return;
          }
          const nextProgress=reviewOffset===null ? await learningProgress.complete(owner, lesson.lessonId, lesson.version) : await learningProgress.review(owner,lesson.lessonId,lesson.version,reviewOffset);
          if(!alive.current)return;
          progressRead.current++;
          setProgress(nextProgress);
          if(reviewOffset!==null)setReviewSaved(true);
          await learningDrafts.clearIfUnchanged(owner, {lessonId:lesson.lessonId,version:lesson.version,answers:lesson.questions.map((_,i)=>answers[i] ?? null)});
        }
        catch { if(alive.current)setStorageError(true); }
        finally { operationBusy.current=false;if(alive.current)setSaving(false); }
      }} style={{ minHeight: 48, padding: 14, backgroundColor: c.surface }}><Text style={{ color: c.link }}>{t(reviewOffset===null?"saveCompletion":"reviewSave")}</Text></Pressable>}
      {reviewSaved && <Text accessibilityLiveRegion="polite" style={{color:c.text}}>{t("reviewSaved")}</Text>}
      <Text style={{ color: c.text }}>{lesson.optionalAction.text}</Text>
      <Text style={{ color: c.muted }}>{t("optionalPractice")}</Text>
      <Text style={{ color: c.muted }}>{lesson.sources.join("\n")}</Text>
      <NeedsWantsPractice />
    </>}
    {!lesson && <WeeklyPractice owner={owner} />}
    {!lesson && <LearningAiCard />}
    {!lesson && <AssessmentDraftCard key={owner} owner={owner} />}
    {!lesson&&!localMode&&session&&process.env.EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED==="true"&&<Pressable accessibilityRole="button" onPress={()=>router.push("/weekly-story-preview")} style={{minHeight:48,padding:16,backgroundColor:c.surface,borderRadius:paperShape.button}}><Text style={{color:c.link}}>{t("storyTitle",{ns:"cashflow"})}</Text></Pressable>}
  </ScrollView></SafeAreaView>;
}
