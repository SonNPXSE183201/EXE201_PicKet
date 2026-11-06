import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function NewTransferScreen() {
  const {tx}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { accounts: allAccounts } = useAccounts();
  const accounts = allAccounts.filter(account => !account.archived && !account.deletedAt);
  const { currency } = useLocalSearchParams<{ currency?: string }>();
  const { createTransfer } = useTransactions();
  const [sourceId, setSourceId] = useState(accounts.find(account => account.currencyCode === currency)?.id ?? accounts[0]?.id ?? "");
  const source = accounts.find((item) => item.id === sourceId) ?? accounts.find(item => item.currencyCode === currency) ?? accounts[0];
  const destinations = useMemo(() => accounts.filter((item) => item.id !== source?.id && item.currencyCode === source?.currencyCode), [accounts, source]);
  const [destinationId, setDestinationId] = useState("");
  const selectedDestinationId = destinations.some((item) => item.id === destinationId) ? destinationId : destinations[0]?.id ?? "";
  const [showDetails, setShowDetails] = useState(false);
  const [title, setTitle] = useState(tx("Chuyển tiền"));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function submit() {
    if (submitting.current) return;
    const parsedAmount = Number.parseInt(amount, 10);
    if (!source || !selectedDestinationId) return setMessage("Cần ít nhất hai tài khoản cùng loại tiền.");
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > 9_000_000_000_000) return setMessage("Số tiền phải là số nguyên lớn hơn 0.");
    submitting.current = true;
    setBusy(true); setMessage(null);
    try {
      await createTransfer({ amount: parsedAmount, destinationAccountId: selectedDestinationId, note: note.trim(), occurredAt: new Date().toISOString(), sourceAccountId: source.id, title: title.trim() || tx("Chuyển tiền") });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) { router.replace(routes.transactions); return; }
      setMessage("Không chuyển được tiền. Hai tài khoản phải cùng loại tiền và đang hoạt động.");
    } finally { submitting.current = false; setBusy(false); }
  }

  return <PicketScreen>
    <TopAppBar title={tx("Chuyển tiền")} backDisabled={busy} />
    <Text style={styles.subtitle}>{tx("Di chuyển tiền giữa các tài khoản mà không làm thay đổi tổng thu chi.")}</Text>
    <Surface peach style={styles.form}>
      <View style={styles.routeHeading}><AppIcon name="swap-horizontal" size={24} color={colors.link} /><Text style={styles.summaryTitle}>{tx("Chuyển nội bộ")}</Text>
        <Pressable disabled={busy || !selectedDestinationId} accessibilityLabel={tx("Đổi chiều chuyển")} onPress={() => { setSourceId(selectedDestinationId); setDestinationId(source?.id ?? ""); }} style={styles.swap}><AppIcon name="swap-horizontal" size={22} color={colors.link} /></Pressable>
      </View>
      <FieldLabel>{tx("Từ tài khoản")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{accounts.map(account => <ChoiceChip disabled={busy} checked={source?.id === account.id} key={account.id} label={account.name} onPress={() => { setSourceId(account.id); setDestinationId(""); }} />)}</View>
      <FieldLabel>{tx("Đến tài khoản (")}{source?.currencyCode ?? "—"})</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{destinations.map(account => <ChoiceChip disabled={busy} checked={selectedDestinationId === account.id} key={account.id} label={account.name} onPress={() => setDestinationId(account.id)} />)}{destinations.length === 0 && <Text style={styles.empty}>{tx("Không có tài khoản đích cùng loại tiền.")}</Text>}</View>
    </Surface>
    <Surface style={styles.amountCard}>
      <FieldLabel>{tx("Số tiền")}</FieldLabel><View style={styles.amountBox}><TextInput money borderless accessibilityLabel={tx("Số tiền chuyển")} editable={!busy} keyboardType="number-pad" onChangeText={setAmount} placeholder="0" style={styles.amountInput} value={amount} /><Text style={styles.currency}>{source?.currencyCode ?? "VND"}</Text></View>
      <Pressable disabled={busy} accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(!showDetails)} style={styles.detailsToggle}><AppIcon name="note-text-outline" size={18} color={colors.link} /><Text style={styles.detailsLabel}>{tx("Nội dung và ghi chú (không bắt buộc)")}</Text><AppIcon name={showDetails ? "chevron-up" : "chevron-down"} size={18} color={colors.link} /></Pressable>
      {showDetails && <><FieldLabel>{tx("Nội dung")}</FieldLabel><TextInput accessibilityLabel={tx("Nội dung chuyển tiền")} editable={!busy} maxLength={120} onChangeText={setTitle} style={styles.input} value={title} /><FieldLabel>{tx("Ghi chú")}</FieldLabel><TextInput accessibilityLabel={tx("Ghi chú chuyển tiền")} editable={!busy} multiline onChangeText={setNote} placeholder={tx("Không bắt buộc")} style={[styles.input, styles.note]} value={note} /></>}
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{tx(message)}</Text> : null}
      <PrimaryAction busy={busy} disabled={!source || !selectedDestinationId} label={tx("Xác nhận chuyển")} onPress={() => void submit()} />
    </Surface>
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.link, fontSize: 15, fontWeight: "700" }, heading: { color: colors.ink, fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18, marginTop: 7 },
  summary: { alignItems: "center", flexDirection: "row", gap: 14, padding: 16 }, summarySymbol: { color: colors.link, fontSize: 30, fontWeight: "700" }, summaryCopy: { flex: 1 }, summaryTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" }, summaryText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, form: { marginTop: 14 },
  routeHeading: { flexDirection: "row", alignItems: "center", gap: 10 }, swap: { marginLeft: "auto", borderWidth: 1, borderColor: colors.controlBorder, borderRadius: 16, alignItems: "center", justifyContent: "center" }, amountCard: { marginTop: 14, backgroundColor: colors.pocketLilac }, detailsToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }, detailsLabel: { flex: 1, color: colors.link, fontSize: 13, fontWeight: "600" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 }, amountBox: { backgroundColor: colors.surface, alignItems: "center", borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, flexDirection: "row", minHeight: 58, paddingHorizontal: 16 }, amountInput: { borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0, color: colors.ink, flex: 1, fontSize: 24, fontWeight: "700", minHeight: 54 }, currency: { color: colors.link, fontSize: 14, fontWeight: "700" }, note: { minHeight: 88, paddingTop: 14, textAlignVertical: "top" }, empty: { color: colors.expense, fontSize: 13, lineHeight: 19 }, error: { color: colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
});
