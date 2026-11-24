import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as Crypto from "expo-crypto";
import { picketApi } from "@/core/api/client";
import { PicketText as Text } from "@/core/ui/picket-text";
import { FigmaButton, figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { createLearningAiSession, type LearningAiApi } from "./ai-session";

export function LearningAiCard() {
  const { session, localMode } = useAuth();
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learningAi");
  if (!session || localMode || !picketApi) {
    return (
      <View style={[styles.card, figmaShadow("paper")]}>
        <Text style={styles.muted}>{t("signIn")}</Text>
      </View>
    );
  }
  return <AiSession key={session.user.id} api={picketApi} token={session.access_token} />;
}

function AiSession({ api, token }: { api: LearningAiApi; token: string }) {
  const { language } = useAppTheme();
  const { styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("learningAi");
  const [machine] = useState(() => createLearningAiSession(api, token, () => Crypto.randomUUID()));
  const state = useSyncExternalStore(machine.subscribe, machine.snapshot, machine.snapshot);
  const enabled = process.env.EXPO_PUBLIC_LEARNING_AI_ENABLED === "true";

  useEffect(() => { machine.setAccessToken(token); }, [machine, token]);
  useEffect(() => {
    machine.start();
    void machine.load();
    return () => machine.dispose();
  }, [machine]);

  const pending = state.job && (["queued", "claimed", "dispatched"].includes(state.job.status) ||
    (state.job.status === "completed" && state.job.statementIds.length === 0));
  const completed = state.job?.status === "completed" && state.job.statementIds.length > 0;

  useEffect(() => {
    if (!pending && !completed) return;
    const poll = () => { if (AppState.currentState === "active") void machine.poll(); };
    poll();
    const timer = setInterval(poll, pending ? 2000 : 60000);
    const listener = AppState.addEventListener("change", value => { if (value === "active") poll(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [machine, pending, completed]);

  return (
    <View style={[styles.card, figmaShadow("paper")]}>
      <Text accessibilityRole="header" style={styles.title}>{t("title")}</Text>
      <Text style={styles.body}>{t("case")}</Text>
      <Text style={styles.muted}>{t("consent")}</Text>
      <Text style={styles.muted}>{t("retention")}</Text>
      <Text style={styles.muted}>{t("limits")}</Text>
      {!enabled ? <Text style={styles.muted}>{t("disabled")}</Text> : null}
      {state.consent ? <Text accessibilityLiveRegion="polite" style={styles.body}>{t(state.consent.accepted ? "accepted" : "declined")}</Text> : null}
      {!state.consent?.accepted ? (
        <FigmaButton variant="outline" size="medium" fullWidth label={t("accept")} disabled={state.busy || !state.consent || !enabled} onPress={() => void machine.setConsent(true)} />
      ) : null}
      {state.consent?.accepted ? (
        <FigmaButton variant="outline" size="medium" fullWidth label={t("generate")} disabled={state.busy || !!pending || !enabled} onPress={() => void machine.generate(language)} />
      ) : null}
      {state.busy ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{t("loading")}</Text> : null}
      {state.job ? (
        <View accessibilityLiveRegion="polite" style={styles.jobBox}>
          <Text style={styles.body}>{t(state.job.status)}</Text>
          {!state.error && !state.busy ? state.job.statementIds.map(id => <Text key={id} style={styles.muted}>{t(id)}</Text>) : null}
        </View>
      ) : null}
      {state.error ? <Text accessibilityRole="alert" style={styles.error}>{t(state.error)}</Text> : null}
      {state.error || !state.consent ? (
        <FigmaButton variant="outline" size="medium" fullWidth label={t("refresh")} disabled={state.busy} onPress={() => void machine.load()} />
      ) : null}
      {state.consent?.accepted !== false ? (
        <FigmaButton variant="text" size="medium" label={t("revoke")} onPress={() => void machine.setConsent(false)} style={styles.inlineBtn} />
      ) : null}
      <FigmaButton variant="text" size="medium" label={t("clear")} onPress={() => void machine.clearHistory()} style={styles.inlineBtn} />
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
  jobBox: {
    gap: 8,
  },
  error: {
    ...figmaText.bodySmall,
    color: colors.expense,
    flexShrink: 1,
  },
  inlineBtn: {
    alignSelf: "flex-start",
  },
});
