import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTranslation } from "react-i18next";
import { parseBillForm, billDateInput } from "@/features/bills/bill-form";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , ChoiceChip, DangerAction, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import type { BillStatus } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";

const statuses: BillStatus[] = ["pending", "paid", "overdue"];

export default function BillDetailScreen() {
  const { t } = useTranslation("bills");
  const { styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { archive, bills, update } = useBills();
  const bill = bills.find((item) => item.id === id);
  const [title, setTitle] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [status, setStatus] = useState<BillStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (!bill) return <Redirect href={routes.bills} />;
  const selectedBill = bill;
  const currentTitle = title ?? bill.title;
  const currentAmount = amount ?? String(bill.amount);
  const currentDueDate = dueDate ?? billDateInput(bill.dueAt);
  const currentStatus = status ?? bill.status;

  async function save() {
    const parsed = parseBillForm({ title: currentTitle, amount: currentAmount, dueDate: currentDueDate });
    if ("error" in parsed) return setMessage(parsed.error);
    setBusy(true); setMessage(null);
    try { await update(selectedBill.id, { expectedVersion: selectedBill.version, ...parsed.value, status: currentStatus }); router.replace(routes.bills); }
    catch (caught) { if (isOfflineQueuedError(caught)) { router.replace(routes.bills); return; } setMessage("saveFailed"); }
    finally { setBusy(false); }
  }

  function confirmArchive() {
    Alert.alert(t("archiveTitle"), t("archiveDescription"), [
      { text: t("cancel"), style: "cancel" }, { text: t("confirmArchive"), style: "destructive", onPress: () => { setBusy(true); void archive(selectedBill.id, selectedBill.version).then(() => router.replace(routes.bills)).catch((caught: unknown) => { if (isOfflineQueuedError(caught)) { router.replace(routes.bills); return; } setMessage("archiveFailed"); setBusy(false); }); } },
    ]);
  }

  return <PicketScreen>
    <TopAppBar illustration="home" title={t("detail")} subtitle={t("detailSubtitle")} backDisabled={busy} />
    <Surface>
      <FieldLabel>{t("name")}</FieldLabel><TextInput accessibilityLabel={t("name")} maxLength={160} onChangeText={setTitle} style={styles.input} value={currentTitle} />
      <FieldLabel>{t("amount")}</FieldLabel><TextInput money accessibilityLabel={t("amountLabel")} keyboardType="number-pad" onChangeText={setAmount} style={styles.input} value={currentAmount} />
      <FieldLabel>{t("dueDate")}</FieldLabel><TextInput date accessibilityLabel={t("dueDate")} onChangeText={setDueDate} style={styles.input} value={currentDueDate} />
      <FieldLabel>{t("status")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{statuses.map((item) => <ChoiceChip checked={currentStatus === item} key={item} label={t(item)} onPress={() => setStatus(item)} />)}</View>
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{t(message)}</Text> : null}
      <PrimaryAction busy={busy} label={t("save")} onPress={() => void save()} /><DangerAction disabled={busy} label={t("archive")} onPress={confirmArchive} />
    </Surface>
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({ appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.link, fontSize: 15, fontWeight: "700" }, heading: { color: colors.ink, fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 7 }, input: { borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, error: { color: colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 } });
