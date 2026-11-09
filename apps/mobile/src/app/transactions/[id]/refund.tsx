import { figmaType } from "@picket/design-tokens";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { categoryTile } from "@/features/home/home-recent";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useProfile } from "@/features/profile/profile-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { AmountPaper, ChildBar, ErrorLine, FigmaScreen, FormRow, PaperCard, heroAmount } from "@/features/transactions/figma-parts";
import { dayKeyAt, dayLabel } from "@/features/transactions/spending-list";
import { formatMoney } from "@/core/i18n/formatters";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function RefundScreen() {
  const {tx}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { categories, createRefund, loading, transactions } = useTransactions();
  const copy = useFigmaCopy();
  const { language } = useAppTheme();
  const { profile } = useProfile();
  const { accounts } = useAccounts();
  const original = transactions.find((item) => item.id === id);
  const refunded = transactions
    .filter((item) => item.kind === "refund" && item.refundOfTransactionId === id)
    .reduce((total, item) => total + item.amount, 0);
  const remaining = Math.max(0, (original?.amount ?? 0) - refunded);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);

  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (loading && !original) {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><ActivityIndicator accessibilityLabel={tx("Đang tải giao dịch cần hoàn tiền")} color={colors.link} /></SafeAreaView>;
  }
  if (!original || original.kind !== "expense") {
    return <SafeAreaView style={[styles.safeArea, styles.center]}><Text style={styles.error}>{tx("Chỉ khoản chi đang hoạt động mới có thể hoàn tiền.")}</Text><Pressable onPress={() => router.replace(routes.transactions)} style={styles.secondary}><Text style={styles.secondaryText}>{tx("Về danh sách")}</Text></Pressable></SafeAreaView>;
  }
  const originalId = original.id;

  async function submit() {
    const parsedAmount = Number.parseInt(amount, 10);
    if (!/^\d+$/.test(amount) || parsedAmount <= 0 || parsedAmount > remaining) {
      return setMessage({key:"refundLimit",money:remaining});
    }
    setBusy(true);
    setMessage(null);
    try {
      await createRefund(originalId, {
        amount: parsedAmount,
        note: note.trim(),
        occurredAt: new Date().toISOString(),
      });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.transactions);
        return;
      }
      setMessage("Không tạo được khoản hoàn. Số dư hoàn có thể đã thay đổi trên thiết bị khác.");
    } finally {
      setBusy(false);
    }
  }

  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const account = accounts.find((item) => item.id === original.accountId);
  const currency = account?.currencyCode ?? "VND";
  const category = categories.find((item) => item.id === original.categoryId);
  const tile = categoryTile(category?.icon ?? null, category?.name || original.title, false, colors);
  const time = new Date(original.occurredAt).toLocaleTimeString(language === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  const today = new Date();
  const parsed = Number.parseInt(amount, 10);
  const hint = category ? copy("refundHint", { category: category.name, amount: formatMoney(Number.isFinite(parsed) ? parsed : 0, language, currency) }) : copy("refundHintShort");
  return (
    <FigmaScreen footer={<FigmaButton fullWidth icon="check" busy={busy} disabled={remaining === 0 || !amount} label={copy("refundCreate")} onPress={() => void submit()} />}>
      <ChildBar title={copy("refundTitle")} backDisabled={busy} />
      <View style={{ gap: 8 }}>
        <Text style={[figmaType.overline, { color: colors.muted }]}>{copy("originalOverline").toUpperCase()}</Text>
        <View style={[styles.original, figmaShadow("paper")]}>
          <View style={[styles.tile, { backgroundColor: tile.color }]}><AppIcon name={tile.name} size={18} color={colors.text} /></View>
          <View style={{ flex: 1, minWidth: 1 }}>
            <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{original.title}</Text>
            <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted }]}>{[category?.name, `${dayLabel(dayKeyAt(original.occurredAt, timeZone), language, true)} ${time}`].filter(Boolean).join(" · ")}</Text>
          </View>
          <Text style={[figmaType.amountRow, { color: colors.expense }]}>−{formatMoney(original.amount, language, currency)}</Text>
        </View>
        <Text style={[figmaType.bodySmall, { color: colors.muted, paddingHorizontal: 4 }]}>{copy("maxRefund")}  <Text style={[figmaType.captionStrong, { color: colors.text }]}>{formatMoney(remaining, language, currency)}</Text></Text>
      </View>

      <AmountPaper overline={copy("refundAmount")} footer={
        <View style={styles.noteLine}><AppIcon name="pencil-outline" size={14} color={colors.muted} />
          <TextInput accessibilityLabel={tx("Lý do hoặc ghi chú hoàn tiền")} borderless placeholder={copy("refundNotePh")} placeholderTextColor={colors.muted} style={styles.noteInput} value={note} onChangeText={setNote} /></View>}>
        <View style={styles.amountRow}>
          <Text style={[heroAmount, { color: colors.income }]}>+</Text>
          <TextInput money borderless accessibilityLabel={tx("Số tiền hoàn")} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: amount ? colors.income : colors.muted }]} value={amount} onChangeText={setAmount} />
          <Text style={[heroAmount, { color: colors.income, textDecorationLine: "underline" }]}>{currency === "VND" ? "₫" : currency}</Text>
        </View>
      </AmountPaper>

      {message && <ErrorLine>{tx(message)}</ErrorLine>}

      <PaperCard>
        <FormRow icon="wallet-outline" label={copy("toWallet")} value={account?.name ?? "—"} />
        <FormRow icon="calendar-month-outline" label={copy("rowDate")} value={`${tx("Hôm nay")}, ${today.toLocaleDateString(language === "en" ? "en-US" : "vi-VN")}`} last />
      </PaperCard>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}><AppIcon name="shimmer" size={16} color={colors.muted} /><Text style={[figmaType.bodySmall, { color: colors.muted, flex: 1 }]}>{hint}</Text></View>
    </FigmaScreen>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  original: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.paper },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  amountInput: { ...heroAmount, minWidth: 80, textAlign: "center", paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  noteLine: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4, justifyContent: "center", alignSelf: "stretch" },
  noteInput: { ...figmaType.bodySmall, color: colors.muted, minWidth: 140, padding: 0, backgroundColor: "transparent", borderWidth: 0, textAlign: "center" },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
