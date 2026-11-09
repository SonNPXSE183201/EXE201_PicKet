import { PicketText as Text } from "@/core/ui/picket-text";
import { useTransactionCopy, type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { CategoryPickerSheet } from "@/core/ui/picker-sheets";
import { FigmaButton, Overline, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { PicketScrollView } from "@/core/ui/picket-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { categoryTile } from "@/features/home/home-recent";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useTransactions } from "@/features/transactions/transactions-context";
import { runBulkAction } from "@/features/transactions/bulk-action";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { ChildBar, ErrorLine } from "@/features/transactions/figma-parts";
import { dayTotal, groupByDay, signedAmount } from "@/features/transactions/spending-list";
import { formatMoney } from "@/core/i18n/formatters";

export default function BulkTransactionsScreen() {
  const { tx, money: formatVnd } = useTransactionCopy();
  const copy = useFigmaCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const { session, localMode } = useAuth();
  const { accounts } = useAccounts();
  const { archive, categories, transactions, update } = useTransactions();
  const [selected, setSelected] = useState<string[]>([]);
  const [pickCategory, setPickCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const eligible = transactions.filter((item) => item.kind === "income" || item.kind === "expense");
  const chosen = eligible.filter((item) => selected.includes(item.id));
  const availableCategories = categories.filter((category) => chosen.every((item) => category.kind === "both" || category.kind === item.kind));
  const accountNames = new Map(accounts.map((item) => [item.id, item.name]));
  const accountCurrency = new Map(accounts.map((item) => [item.id, item.currencyCode]));
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const days = groupByDay(eligible, timeZone, language);
  const allSelected = eligible.length > 0 && chosen.length === eligible.length;

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  async function perform(action: "category" | "archive", categoryId: string | null = null) {
    if (busy || chosen.length === 0 || (action === "category" && categoryId === null)) return;
    setBusy(true);
    setMessage(null);
    const byId = new Map(chosen.map((item) => [item.id, item]));
    const result = await runBulkAction(chosen.map((item) => item.id), async (id) => {
      const item = byId.get(id)!;
      if (action === "category") await update(item.id, { expectedVersion: item.version, categoryId });
      else await archive(item.id, item.version);
    });
    const acceptedIds = new Set([...result.completedIds, ...result.queuedIds]);
    setSelected((current) => current.filter((id) => !acceptedIds.has(id)));
    setMessage({ key: "bulkResult", values: { done: result.completedIds.length, total: chosen.length, queued: result.queuedIds.length, failed: result.failedIds.length } });
    setBusy(false);
  }
  function confirmArchive() {
    if (chosen.length === 0) return;
    Alert.alert(tx("Lưu trữ giao dịch?"), tx("archiveSelection", { count: chosen.length }), [
      { text: tx("Hủy"), style: "cancel" },
      { text: tx("Lưu trữ"), style: "destructive", onPress: () => void perform("archive") },
    ]);
  }

  return <SafeAreaView style={styles.safe}>
    <PicketScrollView contentContainerStyle={{ gap: 20, paddingTop: 16, paddingBottom: 110 }}>
      <ChildBar closeIcon title={copy("selectedN", { count: chosen.length })} backDisabled={busy} action={
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setSelected(allSelected ? [] : eligible.map((item) => item.id))}><Text style={[figmaType.button, { color: colors.primary }]}>{allSelected ? copy("clearSelect") : copy("selectAll")}</Text></Pressable>} />
      {message && <Text accessibilityLiveRegion="polite" style={[figmaType.bodySmall, { color: colors.text }]}>{tx(message)}</Text>}
      {eligible.length === 0 ? <ErrorLine>{tx("Tạo khoản thu hoặc chi trước khi chỉnh sửa hàng loạt.")}</ErrorLine> : days.map((group) => (
        <View key={group.key} style={figmaShadow("paper")}>
          <View style={styles.paper}>
            <View style={styles.dayHeader}>
              <View style={{ flex: 1 }}><Overline>{group.label}</Overline></View>
              <Text style={[figmaType.captionStrong, { color: dayTotal(group.rows, accountCurrency, "VND") > 0 ? colors.income : colors.text }]}>{(() => { const t = dayTotal(group.rows, accountCurrency, "VND"); return `${t > 0 ? "+" : t < 0 ? "−" : ""}${formatMoney(Math.abs(t), language, "VND")}`; })()}</Text>
            </View>
            {group.rows.map((item) => {
              const checked = selected.includes(item.id);
              const category = categoryById.get(item.categoryId ?? "");
              const tile = categoryTile(category?.icon ?? null, category?.name || item.title, item.kind === "income", colors);
              return <Pressable key={item.id} accessibilityLabel={`${checked ? tx("Bỏ chọn") : tx("Chọn")} ${item.title}, ${formatVnd(item.amount)}`} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: busy }} disabled={busy} onPress={() => toggle(item.id)} style={styles.row}>
                <View style={[styles.check, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>{checked ? <AppIcon name="check" size={14} color={colors.onPrimary} /> : null}</View>
                <View style={[styles.tile, { backgroundColor: tile.color }]}><AppIcon name={tile.name} size={18} color={colors.text} /></View>
                <View style={{ flex: 1, minWidth: 1 }}>
                  <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted }]}>{category?.name ?? copy("uncategorized")} · {accountNames.get(item.accountId) ?? ""}</Text>
                </View>
                <Text numberOfLines={1} style={[figmaType.amountRow, { color: item.kind === "expense" ? colors.expense : colors.income, maxWidth: "36%" }]}>{signedAmount(item.kind, item.amount, accountCurrency.get(item.accountId), language)}</Text>
              </Pressable>;
            })}
          </View>
          <ReceiptEdge direction="bottom" />
        </View>
      ))}
    </PicketScrollView>
    <View style={[styles.bar, { bottom: Math.max(16, insets.bottom) }]}>
      <FigmaButton variant="outline" size="medium" label={copy("changeCategory")} disabled={busy || chosen.length === 0} onPress={() => setPickCategory(true)} style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || chosen.length === 0 }} disabled={busy || chosen.length === 0} onPress={confirmArchive} style={[styles.archive, (busy || chosen.length === 0) && { opacity: 0.5 }]}><Text style={[figmaType.button, { color: colors.expense }]}>{copy("archiveShort")}</Text></Pressable>
    </View>
    <CategoryPickerSheet visible={pickCategory} title={copy("categoryPickTitle")} searchPlaceholder={copy("categorySearch")} closeLabel={copy("close")}
      options={availableCategories.map((item) => { const t = categoryTile(item.icon, item.name, item.kind === "income", colors); return { id: item.id, name: item.name, icon: t.name, tint: t.color }; })}
      onSelect={(id) => { setPickCategory(false); void perform("category", id); }} onClose={() => setPickCategory(false)} />
  </SafeAreaView>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  paper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 16, gap: 8 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4, minHeight: 44 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 34, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...figmaShadow("dock") },
  archive: { paddingHorizontal: 16, minHeight: 40, alignItems: "center", justifyContent: "center" },
});
