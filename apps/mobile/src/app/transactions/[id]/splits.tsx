import { TopAppBar } from "@/core/ui/picket-ui";
import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { radii } from "@/core/ui/mobile-palette";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function TransactionSplitsScreen() {
  const {tx,money:formatVnd}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { categories, getSplits, setSplits, transactions } = useTransactions();
  const transaction = transactions.find((item) => item.id === id);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  const availableCategories = useMemo(
    () =>
      categories.filter(
        (item) =>
          transaction &&
          (item.kind === transaction.kind || item.kind === "both"),
      ),
    [categories, transaction],
  );

  useEffect(() => {
    if ((!session && !localMode) || !id || !transaction) return;
    let active = true;
    void getSplits(id)
      .then((splits) => {
        if (!active) return;
        setAmounts(
          Object.fromEntries(
            splits.map((item) => [item.categoryId, String(item.amount)]),
          ),
        );
      })
      .catch(() => {
        if (active) setMessage("Không tải được dữ liệu phân bổ.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [getSplits, id, session, localMode, transaction]);

  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (!transaction || !loaded) {
    return <SafeAreaView style={[styles.safeArea, styles.center]}>{transaction ? <ActivityIndicator accessibilityLabel={tx("Đang tải phân bổ giao dịch")} color={colors.link} /> : <Text style={styles.error}>{tx("Không tìm thấy giao dịch.")}</Text>}</SafeAreaView>;
  }
  if (transaction.kind !== "expense" && transaction.kind !== "income") {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><Text style={styles.error}>{tx("Loại giao dịch này không hỗ trợ chia danh mục.")}</Text><Pressable onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>{tx("Quay lại")}</Text></Pressable></SafeAreaView>;
  }

  const normalizedAmounts = availableCategories.map((category) => {
    const fallback =
      Object.keys(amounts).length === 0 && category.id === transaction.categoryId
        ? String(transaction.amount)
        : "";
    return { category, value: amounts[category.id] ?? fallback };
  });
  const total = normalizedAmounts.reduce(
    (sum, item) => sum + (Number.parseInt(item.value, 10) || 0),
    0,
  );
  const transactionAmount = transaction.amount;
  const transactionId = transaction.id;
  const transactionVersion = transaction.version;

  async function submit() {
    const splits = normalizedAmounts
      .filter((item) => item.value.trim() !== "")
      .map((item) => ({
        amount: Number.parseInt(item.value, 10),
        categoryId: item.category.id,
      }));
    if (splits.some((item) => !Number.isInteger(item.amount) || item.amount <= 0)) {
      return setMessage("Mỗi phần phải là số nguyên lớn hơn 0.");
    }
    if (splits.length > 0 && total !== transactionAmount) {
      return setMessage({key:"splitTotal",money:transactionAmount});
    }
    setBusy(true);
    setMessage(null);
    try {
      await setSplits(transactionId, {
        expectedVersion: transactionVersion,
        splits,
      });
      router.replace(routes.transaction(transactionId));
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transaction(transactionId));
        return;
      }
      setMessage("Không lưu được phân bổ. Giao dịch có thể đã đổi hoặc đã có hoàn tiền.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TopAppBar title={tx("Chia danh mục")} backDisabled={busy} />
        <Text style={styles.subtitle}>{transaction.title}</Text>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{tx("Đã phân bổ")}</Text>
          <Text style={[styles.totalValue, total === transaction.amount ? styles.valid : styles.invalid]}>{formatVnd(total)} / {formatVnd(transaction.amount)}</Text>
        </View>
        {normalizedAmounts.map(({ category, value }) => (
          <View key={category.id} style={styles.row}>
            <Text style={styles.category}>{category.name}</Text>
            <TextInput money accessibilityLabel={tx("splitAmount",{category:category.name})} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.amountInput} value={value} onChangeText={(next) => setAmounts((current) => ({ ...current, [category.id]: next }))} />
          </View>
        ))}
        {message && <Text style={styles.error}>{tx(message)}</Text>}
        <Pressable disabled={busy} onPress={() => void submit()} style={styles.primary}>{busy ? <ActivityIndicator accessibilityLabel={tx("Đang lưu phân bổ giao dịch")} color={colors.onPrimary} /> : <Text style={styles.primaryText}>{tx("Lưu phân bổ")}</Text>}</Pressable>
        <Pressable disabled={busy} onPress={() => { setAmounts(Object.fromEntries(availableCategories.map((item) => [item.id, ""]))); }} style={styles.clear}><Text style={styles.clearText}>{tx("Bỏ toàn bộ phân bổ")}</Text></Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>{tx("Hủy")}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 12, padding: paperSpace.screen, paddingBottom: 48 },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", marginTop: 20 },
  subtitle: { color: colors.muted, fontSize: 15, marginBottom: 8 },
  totalCard: { backgroundColor: colors.white, borderRadius: paperShape.card, marginBottom: 6, padding: 16 },
  totalLabel: { color: colors.muted, fontSize: 12 },
  totalValue: { fontSize: 18, fontWeight: "700", marginTop: 5 },
  valid: { color: colors.income },
  invalid: { color: colors.expense },
  row: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.small, flexDirection: "row", gap: 12, padding: 12 },
  category: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: "700" },
  amountInput: { borderColor: colors.peach, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, minHeight: 44, paddingHorizontal: 12, textAlign: "right", width: 130 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: paperShape.button, justifyContent: "center", marginTop: 8, minHeight: paperControl.height },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  clear: { alignItems: "center", minHeight: 44, padding: 12 },
  clearText: { color: colors.expense, fontSize: 14, fontWeight: "700" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.link, fontSize: 15, fontWeight: "700" },
});
