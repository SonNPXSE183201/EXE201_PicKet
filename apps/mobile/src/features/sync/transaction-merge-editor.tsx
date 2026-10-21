import type { Transaction } from "@picket/domain";
import { formatVnd } from "@picket/domain";
import { colors } from "@picket/design-tokens";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { picketApi } from "@/core/api/client";
import { buildTransactionMerge, transactionMergeFields, type TransactionMergeChoice, type TransactionMergeKey } from "@/core/sync/conflict-resolution";
import { loadAllTransactions } from "@/core/sync/load-all-transactions";
import { retryMutationConflict, type MutationConflict } from "@/core/sync/mutation-queue";
import { ChoiceChip, PrimaryAction } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const labels: Record<TransactionMergeKey, string> = { title: "Tên giao dịch", amount: "Số tiền", accountId: "Ví", categoryId: "Danh mục", occurredAt: "Thời gian", note: "Ghi chú" };

/** Explicit per-field selection; never copy all stale local fields by default. */
export function TransactionMergeEditor({ conflict, onQueued }: { conflict: MutationConflict; onQueued(): void }) {
  const { session } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useTransactions();
  const [server, setServer] = useState<Transaction | null>(null);
  const [choices, setChoices] = useState<TransactionMergeChoice>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
        if (controller.signal.aborted) return;
        setLoading(true); setServer(null); setChoices({}); setMessage(null);
        if (!session || session.user.id !== conflict.userId || !picketApi) throw new Error("owner unavailable");
        const api = picketApi;
        const rows = await loadAllTransactions<Transaction>(async options => (await api.listTransactions(session.access_token, options)).transactions, controller.signal);
        if (controller.signal.aborted) return;
        const row = rows.find(item => item.id === conflict.payload.id);
        if (!row) throw new Error("not found");
        transactionMergeFields(conflict.payload, row);
        setServer(row);
      }).catch(() => {
        if (!controller.signal.aborted) setMessage("Chưa lấy được bản máy chủ để đối chiếu. Kiểm tra kết nối; bản sửa của bạn vẫn được giữ.");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [conflict, revision, session]);

  const fields = server ? transactionMergeFields(conflict.payload, server) : [];
  function display(key: TransactionMergeKey, value: unknown) {
    if (key === "amount" && typeof value === "number") return formatVnd(value);
    if (key === "accountId") return accounts.find(item => item.id === value)?.name ?? String(value);
    if (key === "categoryId") return categories.find(item => item.id === value)?.name ?? (value === null ? "Chưa phân loại" : String(value));
    return value === null || value === "" ? "(Trống)" : String(value);
  }
  async function enqueue() {
    if (!server || busy || !session || session.user.id !== conflict.userId) return;
    setBusy(true); setMessage(null);
    try {
      const payload = buildTransactionMerge(conflict.payload, server, choices);
      await retryMutationConflict(conflict, payload);
      onQueued();
    } catch { setMessage("Chưa gửi lại được. Hãy chọn nguồn cho từng trường và kiểm tra dữ liệu; bản xung đột vẫn được giữ."); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 12 }}>
    <Text style={{ color: colors.muted }}>Chọn riêng từng trường. Trường không có trong bản sửa trên máy sẽ giữ nguyên trên máy chủ. Nếu máy chủ đổi tiếp, Picket sẽ yêu cầu đối chiếu lại.</Text>
    {loading && <ActivityIndicator accessibilityLabel="Đang tải bản máy chủ để đối chiếu" color={colors.mauve} />}
    {message && <Text accessibilityLiveRegion="polite" style={{ color: colors.expense }}>{message}</Text>}
    {!loading && !server && <PrimaryAction label="Tải lại bản máy chủ" onPress={() => setRevision(value => value + 1)} />}
    {fields.map(field => <View key={field.key} style={{ gap: 6 }}>
      <Text style={{ color: colors.ink, fontWeight: "700" }}>{labels[field.key]}</Text>
      <Text style={{ color: colors.ink }}>Trên máy: {display(field.key, field.local)}</Text>
      <Text style={{ color: colors.muted }}>Máy chủ: {display(field.key, field.server)}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ChoiceChip label={`${labels[field.key]}: dùng bản trên máy`} checked={choices[field.key] === "local"} onPress={() => setChoices(current => ({ ...current, [field.key]: "local" }))} />
        <ChoiceChip label={`${labels[field.key]}: giữ bản máy chủ`} checked={choices[field.key] === "server"} onPress={() => setChoices(current => ({ ...current, [field.key]: "server" }))} />
      </View>
    </View>)}
    {server && <PrimaryAction busy={busy} label="Gửi bản đã chọn" onPress={() => Alert.alert("Gửi bản đã đối chiếu?", "Chỉ những trường bạn chọn từ bản trên máy sẽ được gửi. Các trường khác giữ nguyên.", [
      { text: "Hủy", style: "cancel" }, { text: "Gửi lại", onPress: () => void enqueue() },
    ])} />}
  </View>;
}
