import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Transaction } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { formatInstant, formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { picketApi } from "@/core/api/client";
import { buildTransactionMerge, transactionMergeFields, type TransactionMergeChoice, type TransactionMergeKey } from "@/core/sync/conflict-resolution";
import { loadAllTransactions } from "@/core/sync/load-all-transactions";
import { retryMutationConflict, type MutationConflict } from "@/core/sync/mutation-queue";
import { ChoiceChip, PrimaryAction } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useTransactions } from "@/features/transactions/transactions-context";

type Selection = { server: Transaction | null; choices: TransactionMergeChoice; conflict: MutationConflict; generation: number };

/** Every field is selected explicitly; a confirmation belongs to one reviewed snapshot. */
export function TransactionMergeEditor({ conflict, onQueued, onBusyChange }: {
  conflict: MutationConflict;
  onQueued(): void;
  onBusyChange?(busy: boolean): boolean;
}) {
  const { colors, language } = useAppTheme();
  const { t } = useTranslation("conflicts");
  const { session } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useTransactions();
  const [server, setServer] = useState<Transaction | null>(null);
  const [choices, setChoices] = useState<TransactionMergeChoice>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"mergeLoadError" | "mergeRetryError" | "selectionChanged" | null>(null);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true), operationBusy = useRef(false), ownerAvailable = useRef(false), generation = useRef(0);
  const [loaded, setLoaded] = useState<MutationConflict | null>(null);
  const [loadedGeneration, setLoadedGeneration] = useState(0);
  const ownerMatches = session?.user.id === conflict.userId;
  useLayoutEffect(() => { ownerAvailable.current = ownerMatches; }, [ownerMatches]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const request = ++generation.current;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setLoaded(null); setServer(null); setChoices({}); setMessage(null);
      if (!session || session.user.id !== conflict.userId || !picketApi) throw new Error("Owner unavailable");
      const api = picketApi;
      const rows = await loadAllTransactions<Transaction>(async options => (await api.listTransactions(session.access_token, options)).transactions, controller.signal);
      if (controller.signal.aborted || request !== generation.current) return;
      const row = rows.find(item => item.id === conflict.payload.id);
      if (!row) throw new Error("Transaction unavailable");
      transactionMergeFields(conflict.payload, row);
      setLoaded(conflict); setLoadedGeneration(request);
      setServer(row);
    }).catch(() => {
      if (!controller.signal.aborted && request === generation.current) setMessage("mergeLoadError");
    }).finally(() => { if (!controller.signal.aborted && request === generation.current) setLoading(false); });
    return () => controller.abort();
  }, [conflict, revision, session]);

  const currentServer = !loading && ownerMatches && loaded === conflict ? server : null;
  const latest = useRef<Selection | null>(null);
  useLayoutEffect(() => {
    latest.current = { server: currentServer, choices, conflict, generation: loadedGeneration };
  }, [currentServer, choices, conflict, loadedGeneration]);
  const isCurrent = () => alive.current && ownerAvailable.current;
  const fields = currentServer ? transactionMergeFields(conflict.payload, currentServer) : [];
  function display(key: TransactionMergeKey, value: unknown, side: "local" | "server") {
    if (key === "amount" && typeof value === "number") {
      const request = conflict.payload.request as Record<string, unknown>;
      const accountId = side === "local" ? request.accountId ?? currentServer?.accountId : currentServer?.accountId;
      const currency = accounts.find(row => row.id === accountId)?.currencyCode;
      return currency ? formatMoney(value, language, currency) : t("unknownCurrency", { amount: new Intl.NumberFormat(language === "en" ? "en-US" : "vi-VN").format(value) });
    }
    if (key === "accountId") return accounts.find(item => item.id === value)?.name ?? String(value);
    if (key === "categoryId") return categories.find(item => item.id === value)?.name ?? (value === null ? t("unclassified") : String(value));
    if (key === "occurredAt" && typeof value === "string" && Number.isFinite(Date.parse(value))) return formatInstant(value, language, Intl.DateTimeFormat().resolvedOptions().timeZone);
    return value === null || value === "" ? t("blank") : String(value);
  }
  async function enqueue(selection: Selection) {
    if (!isCurrent() || operationBusy.current || !selection.server) return;
    if (!latest.current || latest.current.server !== selection.server || latest.current.choices !== selection.choices || latest.current.conflict !== selection.conflict || generation.current !== selection.generation) {
      setMessage("selectionChanged"); return;
    }
    if (onBusyChange && !onBusyChange(true)) return;
    operationBusy.current = true; setBusy(true); setMessage(null);
    try {
      const payload = buildTransactionMerge(selection.conflict.payload, selection.server, selection.choices);
      await retryMutationConflict(selection.conflict, payload);
      if (isCurrent()) onQueued();
    } catch {
      if (isCurrent()) setMessage("mergeRetryError");
    } finally {
      operationBusy.current = false;
      onBusyChange?.(false);
      if (isCurrent()) setBusy(false);
    }
  }
  if (!ownerMatches) return null;
  return <View style={{ gap: 12 }}>
    <Text style={{ color: colors.muted }}>{t("mergeHelp")}</Text>
    {loading && <ActivityIndicator accessibilityLabel={t("mergeLoading")} color={colors.link} />}
    {message && <Text accessibilityLiveRegion="polite" style={{ color: colors.expense }}>{t(message)}</Text>}
    {!loading && !currentServer && <PrimaryAction disabled={busy} label={t("reloadServer")} onPress={() => { if (isCurrent() && !operationBusy.current) setRevision(value => value + 1); }} />}
    {fields.map(field => <View key={field.key} style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: "700" }}>{t("field." + field.key)}</Text>
      <Text style={{ color: colors.text }}>{t("deviceValue", { value: display(field.key, field.local, "local") })}</Text>
      <Text style={{ color: colors.muted }}>{t("serverValue", { value: display(field.key, field.server, "server") })}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ChoiceChip disabled={busy} label={t("useLocal", { field: t("field." + field.key) })} checked={choices[field.key] === "local"} onPress={() => { if (isCurrent() && !operationBusy.current) setChoices(current => ({ ...current, [field.key]: "local" })); }} />
        <ChoiceChip disabled={busy} label={t("useServer", { field: t("field." + field.key) })} checked={choices[field.key] === "server"} onPress={() => { if (isCurrent() && !operationBusy.current) setChoices(current => ({ ...current, [field.key]: "server" })); }} />
      </View>
    </View>)}
    {currentServer && <PrimaryAction busy={busy} label={t("send")} onPress={() => {
      if (!isCurrent() || operationBusy.current) return;
      const selection = latest.current;
      if (!selection?.server) return;
      Alert.alert(t("confirmTitle"), t("confirmBody"), [
        { text: t("cancel"), style: "cancel" }, { text: t("confirm"), onPress: () => void enqueue(selection) },
      ]);
    }} />}
  </View>;
}
