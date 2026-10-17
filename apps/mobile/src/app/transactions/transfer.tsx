import { TopAppBar , ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function NewTransferScreen() {
  const { session, localMode } = useAuth();
  const { accounts } = useAccounts();
  const { createTransfer } = useTransactions();
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? "");
  const source = accounts.find((item) => item.id === sourceId) ?? accounts[0];
  const destinations = useMemo(() => accounts.filter((item) => item.id !== source?.id && item.currencyCode === source?.currencyCode), [accounts, source]);
  const [destinationId, setDestinationId] = useState("");
  const selectedDestinationId = destinations.some((item) => item.id === destinationId) ? destinationId : destinations[0]?.id ?? "";
  const [title, setTitle] = useState("Chuyển tiền");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function submit() {
    const parsedAmount = Number.parseInt(amount, 10);
    if (!source || !selectedDestinationId) return setMessage("Cần ít nhất hai tài khoản cùng loại tiền.");
    if (!title.trim()) return setMessage("Hãy nhập nội dung chuyển tiền.");
    if (!/^\d+$/.test(amount) || parsedAmount <= 0) return setMessage("Số tiền phải là số nguyên lớn hơn 0.");
    setBusy(true); setMessage(null);
    try {
      await createTransfer({ amount: parsedAmount, destinationAccountId: selectedDestinationId, note: note.trim(), occurredAt: new Date().toISOString(), sourceAccountId: source.id, title: title.trim() });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) { router.replace(routes.transactions); return; }
      setMessage("Không chuyển được tiền. Hai tài khoản phải cùng loại tiền và đang hoạt động.");
    } finally { setBusy(false); }
  }

  return <PicketScreen>
    <TopAppBar title="Chuyển tiền" backDisabled={busy} />
    <Text style={styles.subtitle}>Di chuyển tiền giữa các tài khoản mà không làm thay đổi tổng thu chi.</Text>
    <Surface peach style={styles.summary}><Text style={styles.summarySymbol}>⇄</Text><View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Chuyển nội bộ</Text><Text style={styles.summaryText}>Chỉ các tài khoản cùng loại tiền mới có thể chuyển cho nhau.</Text></View></Surface>
    <Surface style={styles.form}>
      <FieldLabel>Từ tài khoản</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{accounts.map((account) => <ChoiceChip checked={source?.id === account.id} key={account.id} label={account.name} onPress={() => { setSourceId(account.id); setDestinationId(""); }} />)}</View>
      <FieldLabel>Đến tài khoản ({source?.currencyCode ?? "—"})</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{destinations.map((account) => <ChoiceChip checked={selectedDestinationId === account.id} key={account.id} label={account.name} onPress={() => setDestinationId(account.id)} />)}{destinations.length === 0 ? <Text style={styles.empty}>Không có tài khoản đích cùng loại tiền.</Text> : null}</View>
      <FieldLabel>Nội dung</FieldLabel><TextInput accessibilityLabel="Nội dung chuyển tiền" maxLength={120} onChangeText={setTitle} placeholder="Ví dụ: Chuyển sang ví tiết kiệm" placeholderTextColor={colors.muted} style={styles.input} value={title} />
      <FieldLabel>Số tiền</FieldLabel><View style={styles.amountBox}><TextInput money accessibilityLabel="Số tiền chuyển" keyboardType="number-pad" onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.muted} style={styles.amountInput} value={amount} /><Text style={styles.currency}>{source?.currencyCode ?? "VND"}</Text></View>
      <FieldLabel>Ghi chú</FieldLabel><TextInput accessibilityLabel="Ghi chú chuyển tiền" multiline onChangeText={setNote} placeholder="Không bắt buộc" placeholderTextColor={colors.muted} style={[styles.input, styles.note]} value={note} />
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text> : null}
      <PrimaryAction busy={busy} disabled={!source || !selectedDestinationId} label="Xác nhận chuyển" onPress={() => void submit()} />
    </Surface>
  </PicketScreen>;
}

const styles = StyleSheet.create({
  appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.mauve, fontSize: 15, fontWeight: "700" }, heading: { color: colors.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18, marginTop: 7 },
  summary: { alignItems: "center", flexDirection: "row", gap: 14, padding: 16 }, summarySymbol: { color: colors.mauve, fontSize: 30, fontWeight: "700" }, summaryCopy: { flex: 1 }, summaryTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" }, summaryText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, form: { marginTop: 14 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 }, amountBox: { alignItems: "center", borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, flexDirection: "row", minHeight: 58, paddingHorizontal: 16 }, amountInput: { color: colors.ink, flex: 1, fontSize: 24, fontWeight: "700", minHeight: 54 }, currency: { color: colors.mauve, fontSize: 14, fontWeight: "700" }, note: { minHeight: 88, paddingTop: 14, textAlignVertical: "top" }, empty: { color: colors.expense, fontSize: 13, lineHeight: 19 }, error: { color: colors.expense, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
});
