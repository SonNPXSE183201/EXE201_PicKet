import { colors, radii } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";

function amountPrefix(kind: "expense" | "income" | "transfer" | "refund") {
  if (kind === "expense") return "−";
  if (kind === "transfer") return "↔ ";
  return "+";
}

export default function TransactionsScreen() {
  const { session } = useAuth();
  const { accounts } = useAccounts();
  const { categories, error, loading, refresh, transactions } = useTransactions();
  const { flush, lastSyncedAt, pendingCount, syncing } = useSync();

  useEffect(() => {
    if (lastSyncedAt !== null) void refresh();
  }, [lastSyncedAt, refresh]);

  if (!session) return <Redirect href={routes.login} />;

  const accountNames = new Map(accounts.map((item) => [item.id, item.name]));
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace(routes.home)} style={styles.back}>
          <Text style={styles.backText}>‹ Trang chủ</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push(routes.newTransfer)} style={styles.add}>
            <Text style={styles.addText}>Chuyển tiền</Text>
          </Pressable>
          <Pressable onPress={() => router.push(routes.newTransaction)} style={styles.add}>
            <Text style={styles.addText}>+ Thu/chi</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Giao dịch</Text>
        <Text style={styles.subtitle}>Thu và chi gần nhất từ Dart API.</Text>
        {pendingCount > 0 && (
          <Pressable onPress={() => void flush()} style={styles.syncCard}>
            <Text style={styles.syncTitle}>
              {syncing ? "Đang đồng bộ thay đổi..." : `${pendingCount} thay đổi đang chờ đồng bộ`}
            </Text>
            <Text style={styles.hint}>Chạm để thử gửi lại khi có kết nối.</Text>
          </Pressable>
        )}

        {loading && transactions.length === 0 ? (
          <ActivityIndicator accessibilityLabel="Đang tải giao dịch" color={colors.mauve} style={styles.loader} />
        ) : error ? (
          <Pressable onPress={() => void refresh()} style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.hint}>Chạm để thử lại</Text>
          </Pressable>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
            <Text style={styles.hint}>Tạo khoản thu hoặc chi đầu tiên để bắt đầu theo dõi.</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <Pressable key={transaction.id} onPress={() => router.push(routes.transaction(transaction.id))} style={styles.card}>
              <View style={styles.cardCopy}>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.hint}>
                  {categoryNames.get(transaction.categoryId ?? "") ?? "Chưa phân loại"}
                  {" · "}
                  {accountNames.get(transaction.accountId) ?? "Tài khoản"}
                </Text>
                <Text style={styles.date}>
                  {new Date(transaction.occurredAt).toLocaleDateString("vi-VN")}
                </Text>
              </View>
              <Text style={transaction.kind === "expense" ? styles.expense : transaction.kind === "transfer" ? styles.transfer : styles.income}>
                {amountPrefix(transaction.kind)}
                {formatVnd(transaction.amount)}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      <Pressable onPress={() => router.push(routes.newTransaction)} style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8 },
  back: { paddingVertical: 10 },
  backText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
  add: { padding: 10 },
  addText: { color: colors.mauve, fontSize: 14, fontWeight: "800" },
  headerActions: { alignItems: "center", flexDirection: "row" },
  content: { paddingBottom: 100, paddingHorizontal: 20, paddingTop: 16 },
  title: { color: colors.ink, fontSize: 34, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 15, marginBottom: 22, marginTop: 7 },
  loader: { marginTop: 48 },
  errorCard: { backgroundColor: "#FFF0F2", borderRadius: radii.medium, padding: 18 },
  syncCard: { backgroundColor: "#F0E8F8", borderRadius: radii.medium, marginBottom: 14, padding: 16 },
  syncTitle: { color: colors.mauve, fontSize: 14, fontWeight: "800" },
  error: { color: colors.expense, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyCard: { backgroundColor: colors.white, borderRadius: radii.medium, padding: 22 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  card: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.medium, flexDirection: "row", gap: 12, marginBottom: 10, padding: 16 },
  cardCopy: { flex: 1 },
  transactionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  date: { color: colors.muted, fontSize: 11, marginTop: 5 },
  income: { color: colors.income, fontSize: 15, fontWeight: "800" },
  expense: { color: colors.expense, fontSize: 15, fontWeight: "800" },
  transfer: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
  fab: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: 28, bottom: 24, elevation: 4, height: 56, justifyContent: "center", position: "absolute", right: 24, shadowColor: colors.ink, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 8, width: 56 },
  fabText: { color: colors.white, fontSize: 30, fontWeight: "400", marginTop: -2 },
});
