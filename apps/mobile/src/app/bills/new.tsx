import { TopAppBar , FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";

function initialDueDate() {
  const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10);
}

export default function NewBillScreen() {
  const { session, localMode } = useAuth();
  const { create } = useBills();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function submit() {
    const parsedAmount = Number.parseInt(amount, 10);
    const dueAt = new Date(`${dueDate}T12:00:00`);
    if (!title.trim()) return setMessage("Hãy nhập tên hóa đơn.");
    if (!/^\d+$/.test(amount) || parsedAmount <= 0) return setMessage("Số tiền phải lớn hơn 0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(dueAt.getTime())) return setMessage("Ngày đến hạn phải theo định dạng YYYY-MM-DD.");
    setBusy(true); setMessage(null);
    try { await create({ title: title.trim(), amount: parsedAmount, dueAt: dueAt.toISOString() }); router.replace(routes.bills); }
    catch (caught) { if (isOfflineQueuedError(caught)) { router.replace(routes.bills); return; } setMessage("Không tạo được hóa đơn. Hãy kiểm tra kết nối và thử lại."); }
    finally { setBusy(false); }
  }

  return <PicketScreen>
    <TopAppBar title="Thêm hóa đơn" subtitle="Picket sẽ sắp xếp hóa đơn theo ngày đến hạn để bạn dễ theo dõi." backDisabled={busy} />
    <Surface peach style={styles.tip}><Text style={styles.tipSymbol}>◷</Text><Text style={styles.tipText}>Nên đặt hạn thanh toán sớm hơn ngày bị tính phí trễ.</Text></Surface>
    <Surface style={styles.form}>
      <FieldLabel>Tên hóa đơn</FieldLabel><TextInput accessibilityLabel="Tên hóa đơn" maxLength={160} onChangeText={setTitle} placeholder="Tiền điện" placeholderTextColor={colors.muted} style={styles.input} value={title} />
      <FieldLabel>Số tiền</FieldLabel><View style={styles.amountBox}><TextInput money accessibilityLabel="Số tiền hóa đơn" keyboardType="number-pad" onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.muted} style={styles.amountInput} value={amount} /><Text style={styles.currency}>VND</Text></View>
      <FieldLabel>Ngày đến hạn</FieldLabel><TextInput date accessibilityLabel="Ngày đến hạn" onChangeText={setDueDate} style={styles.input} value={dueDate} />
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text> : null}
      <PrimaryAction busy={busy} label="Tạo hóa đơn" onPress={() => void submit()} />
    </Surface>
  </PicketScreen>;
}

const styles = StyleSheet.create({
  appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.mauve, fontSize: 15, fontWeight: "700" }, heading: { color: colors.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18, marginTop: 7 }, tip: { alignItems: "center", flexDirection: "row", gap: 12, padding: 15 }, tipSymbol: { color: colors.mauve, fontSize: 25 }, tipText: { color: colors.ink, flex: 1, fontSize: 13, lineHeight: 19 }, form: { marginTop: 14 }, input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 }, amountBox: { alignItems: "center", borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, flexDirection: "row", minHeight: 58, paddingHorizontal: 16 }, amountInput: { color: colors.ink, flex: 1, fontSize: 24, fontWeight: "700", minHeight: 54 }, currency: { color: colors.mauve, fontSize: 14, fontWeight: "700" }, error: { color: colors.expense, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
});
