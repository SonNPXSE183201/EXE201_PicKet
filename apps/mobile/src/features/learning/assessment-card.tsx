import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/core/i18n/formatters";
import { PrimaryAction, DangerAction } from "@/core/ui/picket-ui";
import { PicketTextInput } from "@/core/ui/picket-text-input";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { assessmentCase, assessmentCriteria, MAX_ASSESSMENT_ANSWER } from "./assessment-draft";
import { assessmentDrafts } from "./assessment-storage";

type Status = "loading" | "empty" | "pending" | "saving" | "saved" | "saveError" | "clearError" | "clearing" | "tooLong";
/** Development authoring surface; free text has no network/provider path. */
export function AssessmentDraftCard({ owner }: { owner: string }) {
  const { colors: c, language } = useAppTheme();
  const { t } = useTranslation("assessment");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState(false);
  const alive = useRef(true), ready = useRef(false), dirty = useRef(false), clearing = useRef(false);
  const value = useRef(""), revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<{ revision: number; promise: Promise<void> } | null>(null);

  const flush = useCallback((): Promise<void> => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
    if (!ready.current || !dirty.current || clearing.current) return Promise.resolve();
    const version = revision.current;
    if (inFlight.current?.revision === version) return inFlight.current.promise;
    if (alive.current) setStatus("saving");
    const operation = assessmentDrafts.save(owner, value.current).then(() => {
      if (revision.current === version) { dirty.current = false; if (alive.current) setStatus("saved"); }
    }).catch(() => { if (alive.current && revision.current === version) setStatus("saveError"); });
    inFlight.current = { revision: version, promise: operation };
    void operation.finally(() => { if (inFlight.current?.revision === version) inFlight.current = null; });
    return operation;
  }, [owner]);

  const load = useCallback(async () => {
    if (!alive.current) return;
    ready.current = false; setStatus("loading");
    try {
      const draft = await assessmentDrafts.load(owner);
      if (!alive.current) return;
      value.current = draft?.answer ?? ""; dirty.current = false; ready.current = true;
      setAnswer(value.current); setLoadError(false); setStatus(draft ? "saved" : "empty");
    } catch { if (alive.current) { setLoadError(true); setStatus("saveError"); } }
  }, [owner]);

  useEffect(() => {
    alive.current = true; void Promise.resolve().then(load);
    const listener = AppState.addEventListener("change", state => { if (state !== "active") void flush(); });
    return () => { alive.current = false; listener.remove(); void flush(); };
  }, [load, flush]);

  function change(text: string) {
    if (!ready.current || clearing.current) return;
    if (text.length > MAX_ASSESSMENT_ANSWER) { setStatus("tooLong"); return; }
    revision.current++; value.current = text; dirty.current = true; setAnswer(text); setStatus("pending");
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void flush(); }, 300);
  }

  async function clearConfirmed() {
    if (!alive.current || clearing.current) return;
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
    clearing.current = true; revision.current++; setStatus("clearing");
    try {
      await assessmentDrafts.clear(owner);
      if (!alive.current) return;
      value.current = ""; dirty.current = false; ready.current = true;
      setAnswer(""); setLoadError(false); setStatus("empty");
    } catch { if (alive.current) setStatus("clearError"); }
    finally { clearing.current = false; }
  }

  const money = (amount: number) => formatMoney(amount, language, assessmentCase.currency);
  const disabled = status === "loading" || status === "clearing";
  return <View style={{ gap: 12, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: paperShape.card, backgroundColor: c.surface }}>
    <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: "700" }}>{t("title")}</Text>
    <Text style={{ color: c.muted, lineHeight: 22 }}>{t("underReview")}</Text>
    <Text style={{ color: c.text, lineHeight: 24 }}>{t("scenario", { available: money(assessmentCase.available), rent: money(assessmentCase.rent), utilities: money(assessmentCase.utilities), reserve: money(assessmentCase.reserve), purchase: money(assessmentCase.purchase), days: assessmentCase.nextIncomeDays })}</Text>
    <Text accessibilityRole="header" style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>{t("rubricTitle", { version: assessmentCase.rubricVersion })}</Text>
    <Text style={{ color: c.muted, lineHeight: 22 }}>{t("rubricNotice")}</Text>
    {assessmentCriteria.map(criterion => <View key={criterion.id} style={{ gap: 4 }}>
      <Text style={{ color: c.text, fontWeight: "600" }}>{t("criterion", { label: t(criterion.id), max: criterion.maxPoints })}</Text>
      <Text style={{ color: c.muted, lineHeight: 22 }}>{t(`${criterion.id}Hint`)}</Text>
    </View>)}
    <Text style={{ color: c.muted, lineHeight: 22 }}>{t("localNotice")}</Text>
    <Text style={{ color: c.text, fontWeight: "600" }}>{t("answer")}</Text>
    <Text style={{ color: c.muted, lineHeight: 22 }}>{t("answerHint")}</Text>
    <PicketTextInput multiline accessibilityLabel={t("answer")} accessibilityHint={t("answerHint")} maxLength={MAX_ASSESSMENT_ANSWER} editable={!disabled && !loadError} onChangeText={change} onBlur={() => void flush()} value={answer} style={{ minHeight: 180, color: c.text, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 14, textAlignVertical: "top" }} />
    <Text style={{ color: c.muted }}>{t("characters", { count: answer.length, max: MAX_ASSESSMENT_ANSWER })}</Text>
    <Text accessibilityLiveRegion="polite" style={{ color: loadError || status === "saveError" || status === "clearError" ? c.expense : c.muted }}>{t(loadError && status !== "clearError" ? "loadError" : status, { max: MAX_ASSESSMENT_ANSWER })}</Text>
    {loadError ? <PrimaryAction label={t("retryLoad")} onPress={() => void load()} disabled={disabled} /> : <PrimaryAction label={t("save")} onPress={() => void flush()} disabled={disabled} busy={status === "saving"} />}
    <DangerAction label={t("clear")} onPress={() => Alert.alert(t("clearTitle"), t("clearDescription"), [{ text: t("cancel"), style: "cancel" }, { text: t("confirmClear"), style: "destructive", onPress: () => void clearConfirmed() }])} disabled={disabled} />
  </View>;
}
