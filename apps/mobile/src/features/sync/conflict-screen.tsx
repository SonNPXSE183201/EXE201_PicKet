import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatInstant } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";
import { listMutationConflicts, removeMutationConflict, retryMutationConflict, subscribeToMutationQueue, type MutationConflict } from "@/core/sync/mutation-queue";
import { parseEditedConflictPayload } from "@/core/sync/conflict-resolution";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { TransactionMergeEditor } from "./transaction-merge-editor";

type Notice = "loadError" | "dismissError" | "retryError" | "invalidPayload" | "queued" | "merged" | "dismissed";

export function ConflictScreenContent({ owner }: { owner: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { t } = useTranslation("conflicts");
  const { session } = useAuth();
  const [items, setItems] = useState<MutationConflict[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true), ownerAvailable = useRef(false), operationBusy = useRef(false), readRevision = useRef(0);
  const ownerMatches = session?.user.id === owner;
  useLayoutEffect(() => { ownerAvailable.current = ownerMatches; }, [ownerMatches]);
  const isCurrent = useCallback(() => alive.current && ownerAvailable.current, []);
  const reload = useCallback(() => {
    if (!isCurrent() || operationBusy.current) return;
    const request = ++readRevision.current;
    setLoading(true);
    void listMutationConflicts(owner)
      .then(conflicts => { if (isCurrent() && request === readRevision.current) setItems(conflicts.filter(item => item.userId === owner)); })
      .catch(() => { if (isCurrent() && request === readRevision.current) setMessage("loadError"); })
      .finally(() => { if (isCurrent() && request === readRevision.current) setLoading(false); });
  }, [owner, isCurrent]);
  useEffect(() => {
    alive.current = true;
    const unsubscribe = subscribeToMutationQueue(reload);
    reload();
    return () => { alive.current = false; unsubscribe(); };
  }, [reload]);

  async function perform(item: MutationConflict, action: () => Promise<void>, success: Notice, failure: Notice) {
    if (!isCurrent() || item.userId !== owner || operationBusy.current) return;
    operationBusy.current = true;
    readRevision.current++;
    setBusy(true); setMessage(null);
    try {
      await action();
      if (!isCurrent()) return;
      setItems(current => current.filter(candidate => candidate.id !== item.id));
      setEditingId(null);
      setMessage(success);
    } catch {
      if (isCurrent()) setMessage(failure);
    } finally {
      operationBusy.current = false;
      if (isCurrent()) { setBusy(false); reload(); }
    }
  }
  function retry(item: MutationConflict) {
    if (!isCurrent() || operationBusy.current) return;
    let payload: Record<string, unknown>;
    try { payload = parseEditedConflictPayload(drafts[item.id] ?? JSON.stringify(item.payload, null, 2)); }
    catch { setMessage("invalidPayload"); return; }
    void perform(item, () => retryMutationConflict(item, payload), "queued", "retryError");
  }
  function mergeBusy(next: boolean) {
    if (!isCurrent() || (next && operationBusy.current)) return false;
    operationBusy.current = next; readRevision.current++;
    setBusy(next);
    if (!next) reload();
    return true;
  }
  function failedAt(value: string) {
    return Number.isFinite(Date.parse(value))
      ? formatInstant(value, language, Intl.DateTimeFormat().resolvedOptions().timeZone)
      : t("dateUnavailable");
  }

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => { if (!operationBusy.current && isCurrent()) router.replace(routes.home); }}><Text style={styles.back}>{t("home")}</Text></Pressable>
      <Text accessibilityRole="header" style={styles.title}>{t("title")}</Text>
      <Text style={styles.subtitle}>{t("subtitle")}</Text>
      {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{t(message)}</Text>}
      {loading && <ActivityIndicator accessibilityLabel={t("loading")} color={colors.link} />}
      {message === "loadError" && <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => reload()} style={styles.button}><Text style={styles.buttonText}>{t("reload")}</Text></Pressable>}
      {items.map(item => <View key={item.id} style={styles.card}>
        <Text style={styles.name}>{t("kind." + item.kind, { defaultValue: t("change") })}</Text>
        <Text style={styles.meta}>{item.entityKey ?? t("newChange")}</Text>
        <Text style={styles.meta}>{t("reason")}</Text>
        <Text style={styles.meta}>{failedAt(item.failedAt)}</Text>
        <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => {
          if (!isCurrent() || operationBusy.current) return;
          setDrafts(current => ({ ...current, [item.id]: current[item.id] ?? JSON.stringify(item.payload, null, 2) }));
          setEditingId(current => current === item.id ? null : item.id);
        }} style={styles.button}><Text style={styles.buttonText}>{t(editingId === item.id ? "closeEditor" : "edit")}</Text></Pressable>
        {editingId === item.id && item.kind === "transaction.update" && <TransactionMergeEditor conflict={item} onBusyChange={mergeBusy} onQueued={() => {
          if (!isCurrent()) return;
          readRevision.current++;
          setItems(current => current.filter(candidate => candidate.id !== item.id));
          setEditingId(null); setMessage("merged");
        }} />}
        {editingId === item.id && item.kind !== "transaction.update" && <>
          <Text style={styles.help}>{t("advancedHelp")}</Text>
          <TextInput accessibilityLabel={t("editorLabel", { kind: t("kind." + item.kind, { defaultValue: t("change") }) })} editable={!busy} multiline onChangeText={value => { if (!operationBusy.current && isCurrent()) setDrafts(current => ({ ...current, [item.id]: value })); }} style={styles.editor} value={drafts[item.id] ?? ""} />
          <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => retry(item)} style={styles.retry}><Text style={styles.retryText}>{t("queue")}</Text></Pressable>
        </>}
        <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => void perform(item, () => removeMutationConflict(item.id, owner), "dismissed", "dismissError")} style={styles.button}><Text style={styles.buttonText}>{t("keepServer")}</Text></Pressable>
      </View>)}
      {!loading && items.length === 0 && <Text style={styles.empty}>{t("empty")}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream }, content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 14, padding: paperSpace.screen, paddingBottom: 48 },
  back: { color: colors.link, fontWeight: "700" }, title: { color: colors.ink, fontSize: 26, fontWeight: "700" },
  subtitle: { color: colors.muted, lineHeight: 21 }, card: { backgroundColor: colors.white, borderRadius: paperShape.card, gap: 7, padding: 16 },
  name: { color: colors.ink, fontSize: 16, fontWeight: "700" }, meta: { color: colors.muted, fontSize: 12 },
  button: { alignItems: "center", borderColor: colors.primaryOutline, borderRadius: paperShape.button, borderWidth: 1, marginTop: 8, minHeight: 48, justifyContent: "center", paddingHorizontal: 12 },
  buttonText: { color: colors.link, fontWeight: "700" }, empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
  message:{color:colors.ink,fontSize:13},help:{color:colors.muted,fontSize:12,lineHeight:18},editor:{backgroundColor:colors.cream,borderColor:colors.peach,borderRadius:paperShape.card,borderWidth:1,color:colors.ink,fontFamily:"monospace",minHeight:150,padding:12,textAlignVertical:"top"},retry:{alignItems:"center",backgroundColor:colors.mauve,borderRadius:paperShape.button,justifyContent:"center",minHeight:48},retryText:{color:colors.onPrimary,fontWeight:"700"},
});
