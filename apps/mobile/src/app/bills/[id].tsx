import { TopAppBar , ChoiceChip, DangerAction, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { colors, radii } from "@picket/design-tokens";
import type { BillStatus } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";

const statuses: { value: BillStatus; label: string }[] = [
  { value: "pending", label: "Chờ thanh toán" }, { value: "paid", label: "Đã thanh toán" }, { value: "overdue", label: "Quá hạn" },
];

export default function BillDetailScreen() {
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
  const currentDueDate = dueDate ?? bill.dueAt.slice(0, 10);
  const currentStatus = status ?? bill.status;

  async function save() {
    const parsedAmount = Number.parseInt(currentAmount, 10);
    const dueAt = new Date(`${currentDueDate}T12:00:00`);
    if (!currentTitle.trim()) return setMessage("Hãy nhập tên hóa đơn.");
    if (!/^\d+$/.test(currentAmount) || parsedAmount <= 0) return setMessage("Số tiền phải lớn hơn 0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(currentDueDate) || Number.isNaN(dueAt.getTime())) return setMessage("Ngày đến hạn không hợp lệ.");
    setBusy(true); setMessage(null);
    try { await update(selectedBill.id, { expectedVersion: selectedBill.version, title: currentTitle.trim(), amount: parsedAmount, dueAt: dueAt.toISOString(), status: currentStatus }); router.replace(routes.bills); }
    catch (caught) { if (isOfflineQueuedError(caught)) { router.replace(routes.bills); return; } setMessage("Không lưu được hóa đơn. Dữ liệu có thể đã thay đổi."); }
    finally { setBusy(false); }
  }

  function confirmArchive() {
    Alert.alert("Lưu trữ hóa đơn?", "Hóa đơn sẽ được ẩn khỏi danh sách đang theo dõi.", [
      { text: "Hủy", style: "cancel" }, { text: "Lưu trữ", style: "destructive", onPress: () => { setBusy(true); void archive(selectedBill.id, selectedBill.version).then(() => router.replace(routes.bills)).catch((caught: unknown) => { if (isOfflineQueuedError(caught)) { router.replace(routes.bills); return; } setMessage("Không lưu trữ được hóa đơn."); setBusy(false); }); } },
    ]);
  }

  return <PicketScreen>
    <TopAppBar title="Chi tiết hóa đơn" subtitle="Cập nhật trạng thái ngay sau khi bạn hoàn tất thanh toán." backDisabled={busy} />
    <Surface>
      <FieldLabel>Tên hóa đơn</FieldLabel><TextInput accessibilityLabel="Tên hóa đơn" maxLength={160} onChangeText={setTitle} style={styles.input} value={currentTitle} />
      <FieldLabel>Số tiền</FieldLabel><TextInput money accessibilityLabel="Số tiền hóa đơn" keyboardType="number-pad" onChangeText={setAmount} style={styles.input} value={currentAmount} />
      <FieldLabel>Ngày đến hạn</FieldLabel><TextInput date accessibilityLabel="Ngày đến hạn" onChangeText={setDueDate} style={styles.input} value={currentDueDate} />
      <FieldLabel>Trạng thái</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{statuses.map((item) => <ChoiceChip checked={currentStatus === item.value} key={item.value} label={item.label} onPress={() => setStatus(item.value)} />)}</View>
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text> : null}
      <PrimaryAction busy={busy} label="Lưu thay đổi" onPress={() => void save()} /><DangerAction disabled={busy} label="Lưu trữ hóa đơn" onPress={confirmArchive} />
    </Surface>
  </PicketScreen>;
}

const styles = StyleSheet.create({ appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.mauve, fontSize: 15, fontWeight: "700" }, heading: { color: colors.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 7 }, input: { borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, error: { color: colors.expense, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 } });
