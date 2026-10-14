import { PicketApiClient } from "@picket/api-client";
import { colors, radii } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useProfile } from "@/features/profile/profile-context";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useSync } from "@/features/sync/sync-context";

type ApiState = "checking" | "online" | "offline";

const fallbackApiUrl = Platform.select({
  android: "http://10.0.2.2:8080",
  default: "http://localhost:8080",
});

export default function HomeScreen() {
  const { configured, loading: authLoading, session, signOut } = useAuth();
  const { error: profileError, loading: profileLoading, profile, refresh } = useProfile();
  const { accounts, error: accountsError, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { error: transactionsError, refresh: refreshTransactions, transactions } = useTransactions();
  const { conflictCount, flush, lastSyncedAt, pendingCount, realtimeConnection, syncing } = useSync();
  const [apiState, setApiState] = useState<ApiState>("checking");
  const client = useMemo(
    () =>
      new PicketApiClient(
        process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl ?? "",
      ),
    [],
  );

  const checkApi = () => {
    setApiState("checking");
    client
      .health()
      .then(() => setApiState("online"))
      .catch(() => setApiState("offline"));
  };

  useEffect(() => {
    let active = true;
    client
      .health()
      .then(() => active && setApiState("online"))
      .catch(() => active && setApiState("offline"));
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => {
    if (lastSyncedAt !== null) {
      void refreshAccounts();
      void refreshTransactions();
    }
  }, [lastSyncedAt, refreshAccounts, refreshTransactions]);

  if (authLoading || (session && (profileLoading || accountsLoading))) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator accessibilityLabel="Đang tải tổng quan tài chính" color={colors.mauve} />
      </SafeAreaView>
    );
  }

  if (!configured || !session) {
    return <Redirect href={routes.login} />;
  }

  if (!profileError && !profile?.onboardingCompleted) {
    return <Redirect href={routes.onboarding} />;
  }

  const totalOpeningBalance = accounts.reduce(
    (total, account) => total + account.openingBalance,
    0,
  );
  const now = new Date();
  const monthlyTransactions = transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    return (
      occurredAt.getFullYear() === now.getFullYear() &&
      occurredAt.getMonth() === now.getMonth()
    );
  });
  const monthlyIncome = monthlyTransactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const monthlyExpense = Math.max(
    0,
    monthlyTransactions
      .filter((transaction) => transaction.kind === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0) -
      monthlyTransactions
        .filter((transaction) => transaction.kind === "refund")
        .reduce((total, transaction) => total + transaction.amount, 0),
  );
  const money = (value: number) => profile?.hideBalance ? "••••••" : formatVnd(value);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandGroup}>
            <View style={styles.brandMark}>
              <Text style={styles.brandLetter}>P</Text>
            </View>
            <Text style={styles.brand}>Picket</Text>
          </View>
          <View style={styles.dashboardNav}>
            <Pressable accessibilityRole="button" onPress={() => router.push(routes.profile)} style={styles.capture}>
              <Text style={styles.captureText}>Hồ sơ</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push(routes.capture)} style={styles.capture}>
              <Text style={styles.captureText}>Quét hóa đơn</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={styles.signOut}
            >
              <Text style={styles.signOutText}>Đăng xuất</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TÀI CHÍNH RÕ RÀNG</Text>
          <Text accessibilityRole="header" style={styles.title}>Mỗi hóa đơn, một quyết định tốt hơn.</Text>
          <Text style={styles.description}>
            Quét nhanh trên thiết bị, tự động đọc tổng tiền và chỉ dùng fallback
            khi ảnh thực sự khó.
          </Text>
        </View>

        {profileError && (
          <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.errorCard}>
            <Text style={styles.errorText}>{profileError}</Text>
            <Text style={styles.apiHint}>Chạm để thử lại</Text>
          </Pressable>
        )}

        {pendingCount > 0 && (
          <Pressable accessibilityRole="button" accessibilityState={{ busy: syncing }} onPress={() => void flush()} style={styles.syncCard}>
            <Text style={styles.syncTitle}>
              {syncing ? "Đang đồng bộ thay đổi..." : `${pendingCount} thay đổi được lưu trên thiết bị`}
            </Text>
            <Text style={styles.apiHint}>Chạm để gửi lại khi có kết nối.</Text>
          </Pressable>
        )}
        {conflictCount > 0 && (
          <Pressable accessibilityRole="button" onPress={() => router.push(routes.syncConflicts)} style={styles.errorCard}>
            <Text style={styles.errorText}>{conflictCount} thay đổi cần bạn kiểm tra</Text>
            <Text style={styles.apiHint}>Phiên bản trên máy chủ được giữ lại để tránh ghi đè dữ liệu.</Text>
          </Pressable>
        )}

        <View style={styles.balanceCard}>
          <Text style={styles.label}>Tổng số dư ban đầu</Text>
          <Text style={styles.balance}>{money(totalOpeningBalance)}</Text>
          <View style={styles.divider} />
          <View style={styles.moneyRow}>
            <View>
              <Text style={styles.label}>Thu tháng này</Text>
              <Text style={styles.income}>{profile?.hideBalance ? "••••••" : `+${formatVnd(monthlyIncome)}`}</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.label}>Chi tháng này</Text>
              <Text style={styles.expense}>{profile?.hideBalance ? "••••••" : `−${formatVnd(monthlyExpense)}`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.accountsHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.headerActions}><Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push(routes.budgets)}><Text style={styles.addAccount}>Ngân sách</Text></Pressable><Pressable accessibilityLabel="Thêm tài khoản" accessibilityRole="button" hitSlop={8} onPress={() => router.push(routes.newAccount)}><Text style={styles.addAccount}>+ Thêm</Text></Pressable></View>
        </View>
        {accounts.map((account) => (
          <Pressable
            accessibilityRole="button"
            key={account.id}
            onPress={() => router.push(routes.account(account.id))}
            style={styles.accountCard}
          >
            <View style={styles.accountCopy}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.apiHint}>{account.kind} · {account.currencyCode}</Text>
            </View>
            <Text style={styles.accountBalance}>{money(account.openingBalance)}</Text>
          </Pressable>
        ))}
        {accountsError && (
          <Pressable accessibilityRole="button" onPress={() => void refreshAccounts()} style={styles.errorCard}>
            <Text style={styles.errorText}>{accountsError}</Text>
            <Text style={styles.apiHint}>Chạm để thử lại</Text>
          </Pressable>
        )}

        <View style={styles.accountsHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Giao dịch gần đây</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push(routes.transactions)}>
            <Text style={styles.addAccount}>Xem tất cả</Text>
          </Pressable>
        </View>
        {transactions.slice(0, 3).map((transaction) => (
          <View key={transaction.id} style={styles.accountCard}>
            <View style={styles.accountCopy}>
              <Text style={styles.accountName}>{transaction.title}</Text>
              <Text style={styles.apiHint}>
                {new Date(transaction.occurredAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            <Text style={transaction.kind === "expense" ? styles.expense : styles.income}>
              {profile?.hideBalance ? "••••••" : `${transaction.kind === "expense" ? "−" : transaction.kind === "transfer" ? "↔ " : "+"}${formatVnd(transaction.amount)}`}
            </Text>
          </View>
        ))}
        {transactions.length === 0 && !transactionsError && (
          <Pressable accessibilityRole="button" onPress={() => router.push(routes.newTransaction)} style={styles.emptyTransaction}>
            <Text style={styles.apiTitle}>Tạo giao dịch đầu tiên</Text>
            <Text style={styles.apiHint}>Ghi lại một khoản thu hoặc chi.</Text>
          </Pressable>
        )}
        {transactionsError && (
          <Pressable accessibilityRole="button" onPress={() => void refreshTransactions()} style={styles.errorCard}>
            <Text style={styles.errorText}>{transactionsError}</Text>
            <Text style={styles.apiHint}>Chạm để thử lại</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityLabel="Kiểm tra trạng thái Dart API"
          accessibilityRole="button"
          accessibilityState={{ busy: apiState === "checking" }}
          onPress={checkApi}
          style={({ pressed }) => [styles.apiCard, pressed && styles.pressed]}
        >
          <View
            style={[
              styles.statusDot,
              apiState === "online" && styles.online,
              apiState === "offline" && styles.offline,
            ]}
          />
          <View style={styles.apiCopy}>
            <Text style={styles.apiTitle}>
              {apiState === "checking"
                ? "Đang kiểm tra Dart API"
                : apiState === "online"
                  ? "Dart API đang hoạt động"
                  : "Chưa kết nối được Dart API"}
            </Text>
            <Text style={styles.apiHint}>
              {apiState === "online"
                ? realtimeConnection === "connected"
                  ? "Đồng bộ realtime đang kết nối"
                  : "Đang dùng đồng bộ định kỳ dự phòng"
                : "Chạm để kiểm tra lại"}
            </Text>
          </View>
          {apiState === "checking" && (
            <ActivityIndicator accessibilityLabel="Đang kiểm tra kết nối Dart API" color={colors.mauve} />
          )}
        </Pressable>

        <View style={styles.ocrNote}>
          <Text style={styles.ocrTitle}>OCR dành cho máy yếu</Text>
          <Text style={styles.ocrBody}>
            ML Kit chạy local là luồng chính. Ảnh có độ tin cậy thấp mới được gửi
            đến dịch vụ PP-OCR fallback, giúp thao tác thường ngày nhanh và tiết
            kiệm dữ liệu.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  center: { alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 42 },
  header: { gap: 8 },
  brandGroup: { alignItems: "center", flexDirection: "row", gap: 10 },
  dashboardNav: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "space-between" },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.small,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.mauve,
  },
  brandLetter: { color: colors.white, fontSize: 20, fontWeight: "800" },
  brand: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  capture: { paddingHorizontal: 8, paddingVertical: 8 },
  captureText: { color: colors.mauve, fontSize: 13, fontWeight: "700" },
  signOut: { paddingHorizontal: 8, paddingVertical: 8 },
  signOutText: { color: colors.mauve, fontSize: 13, fontWeight: "700" },
  hero: { paddingTop: 52, paddingBottom: 34 },
  eyebrow: {
    color: colors.mauve,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  title: {
    maxWidth: 430,
    marginTop: 14,
    color: colors.ink,
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 46,
    letterSpacing: -1.7,
  },
  description: {
    maxWidth: 520,
    marginTop: 18,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
  },
  balanceCard: {
    padding: 24,
    borderRadius: radii.large,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  label: { color: colors.muted, fontSize: 12 },
  balance: {
    marginTop: 7,
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  divider: { height: 1, marginVertical: 23, backgroundColor: colors.cream },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  alignRight: { alignItems: "flex-end" },
  income: { marginTop: 7, color: colors.income, fontSize: 15, fontWeight: "700" },
  expense: { marginTop: 7, color: colors.expense, fontSize: 15, fontWeight: "700" },
  apiCard: {
    minHeight: 76,
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.peach,
    backgroundColor: "#FFFFFF99",
  },
  pressed: { opacity: 0.72 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#C99A5E" },
  online: { backgroundColor: colors.income },
  offline: { backgroundColor: colors.expense },
  apiCopy: { flex: 1 },
  apiTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  apiHint: { marginTop: 4, color: colors.muted, fontSize: 12 },
  ocrNote: { marginTop: 28, paddingHorizontal: 4 },
  ocrTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  ocrBody: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 22 },
  errorCard: { backgroundColor: "#FFF0F2", borderRadius: radii.medium, marginBottom: 16, padding: 16 },
  errorText: { color: colors.expense, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  syncCard: { backgroundColor: "#F0E8F8", borderRadius: radii.medium, marginBottom: 16, padding: 16 },
  syncTitle: { color: colors.mauve, fontSize: 14, fontWeight: "800" },
  accountsHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between", marginBottom: 10, marginTop: 24 },
  headerActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  addAccount: { color: colors.mauve, fontSize: 14, fontWeight: "800" },
  accountCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.medium, flexDirection: "row", justifyContent: "space-between", marginBottom: 10, padding: 17 },
  accountCopy: { flex: 1, paddingRight: 8 },
  accountName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  accountBalance: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  emptyTransaction: { backgroundColor: colors.white, borderRadius: radii.medium, padding: 17 },
});
