import { figmaType } from "@picket/design-tokens";
import { FigmaButton, Overline, ReceiptDivider, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { CategoryPickerSheet } from "@/core/ui/picker-sheets";
import { categoryTile } from "@/features/home/home-recent";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { ChildBar, ErrorLine, FigmaScreen, NoticeCard } from "@/features/transactions/figma-parts";
import { formatMoney } from "@/core/i18n/formatters";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
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
  const {tx}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { categories, getSplits, setSplits, transactions } = useTransactions();
  const transaction = transactions.find((item) => item.id === id);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const copy = useFigmaCopy();
  const { language } = useAppTheme();
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

  const currency = "VND";
  const fmt = (value: number) => formatMoney(value, language, currency);
  const parts = normalizedAmounts.filter((item) => item.value.trim() !== "" || added.includes(item.category.id));
  const left = transactionAmount - total;
  const over = total > transactionAmount;
  const ratio = transactionAmount > 0 ? Math.min(1, total / transactionAmount) : 0;
  const date = new Date(transaction.occurredAt);
  const unusedOptions = normalizedAmounts.filter((item) => !parts.some((part) => part.category.id === item.category.id)).map(({ category }) => { const t = categoryTile(category.icon, category.name, transaction.kind === "income", colors); return { id: category.id, name: category.name, icon: t.name, tint: t.color }; });

  return (
    <FigmaScreen footer={<View style={{ gap: 4 }}>
      <FigmaButton fullWidth icon="check" busy={busy} disabled={over} label={copy("splitSave")} onPress={() => void submit()} />
      {parts.length > 0 && <FigmaButton fullWidth variant="text" size="medium" disabled={busy} label={copy("clearAll")} onPress={() => { setAmounts(Object.fromEntries(availableCategories.map((item) => [item.id, ""]))); setAdded([]); }} />}
    </View>}>
      <ChildBar title={copy("splitTitle")} backDisabled={busy} />
      <View style={figmaShadow("paper")}>
        <View style={styles.totalPaper}>
          <Overline>{copy("billTotal")}</Overline>
          <View style={styles.totalRow}>
            <Text style={[figmaType.amountPocket, { fontSize: 20, color: colors.text }]}>{fmt(transactionAmount)}</Text>
            <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted, flexShrink: 1 }]}>{transaction.title} · {date.getDate()}/{date.getMonth() + 1}</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: transactionAmount, now: Math.min(total, transactionAmount) }} style={styles.track}><View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: over ? colors.expense : colors.primary }]} /></View>
          <View style={styles.totalRow}>
            <Text style={[figmaType.bodySmall, { color: colors.text }]}>{copy("splitDone", { amount: fmt(total) })}</Text>
            <Text style={[figmaType.bodySmall, { color: over ? colors.expense : colors.warning }]}>{over ? copy("splitOver", { amount: fmt(total - transactionAmount) }) : copy("splitLeft", { amount: fmt(left) })}</Text>
          </View>
        </View>
        <ReceiptEdge direction="bottom" />
      </View>

      <View style={{ gap: 12 }}>
        <Overline>{copy("partsOverline")}</Overline>
        <View style={[styles.card, figmaShadow("paper")]}>
          {parts.map(({ category, value }) => {
            const t = categoryTile(category.icon, category.name, transaction.kind === "income", colors);
            return <View key={category.id}>
              <View style={styles.partRow}>
                <View style={[styles.tile, { backgroundColor: t.color }]}><AppIcon name={t.name} size={18} color={colors.text} /></View>
                <View style={{ flex: 1, minWidth: 1 }}><Text style={[figmaType.bodySmall, { color: colors.muted }]}>{copy("categoryLabel")}</Text><Text numberOfLines={1} style={styles.partName}>{category.name}</Text></View>
                <TextInput money borderless accessibilityLabel={tx("splitAmount", { category: category.name })} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.amountInput} value={value} onChangeText={(next) => setAmounts((current) => ({ ...current, [category.id]: next }))} />
                <Pressable accessibilityRole="button" accessibilityLabel={`${copy("removePart")}: ${category.name}`} hitSlop={8} disabled={busy} onPress={() => { setAmounts((current) => ({ ...current, [category.id]: "" })); setAdded((current) => current.filter((id) => id !== category.id)); }}><AppIcon name="close" size={18} color={colors.muted} /></Pressable>
              </View>
              <ReceiptDivider />
            </View>;
          })}
          <Pressable accessibilityRole="button" disabled={busy || unusedOptions.length === 0} onPress={() => setAdding(true)} style={styles.partRow}>
            <View style={styles.addTile}><AppIcon name="plus" size={18} color={colors.primary} /></View>
            <Text style={[figmaType.bodyStrong, { color: colors.primary, flex: 1 }]}>{left > 0 && parts.length > 0 ? copy("addPartLeft", { amount: fmt(left) }) : copy("addPart")}</Text>
          </Pressable>
        </View>
      </View>

      {over && <NoticeCard title={copy("splitOverTitle")} body={copy("splitOverBody", { amount: fmt(total - transactionAmount), total: fmt(transactionAmount) })} />}
      {message && <ErrorLine>{tx(message)}</ErrorLine>}

      <CategoryPickerSheet visible={adding} title={copy("pickCategory")} searchPlaceholder={copy("categorySearch")} closeLabel={copy("close")} options={unusedOptions}
        onSelect={(id) => { setAdded((current) => [...current, id]); if (left > 0) setAmounts((current) => ({ ...current, [id]: String(left) })); setAdding(false); }} onClose={() => setAdding(false)} />
    </FigmaScreen>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  totalPaper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, gap: 8 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.elevated, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  card: { backgroundColor: colors.paper, borderRadius: 24, paddingHorizontal: 16 },
  partRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10 },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addTile: { width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  partName: { fontSize: 15, lineHeight: 22, fontWeight: "800", color: colors.text },
  amountInput: { minWidth: 80, maxWidth: 120, textAlign: "right", fontSize: 15, fontWeight: "800", color: colors.text, padding: 0, backgroundColor: "transparent", borderWidth: 0 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
