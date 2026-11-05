import { PicketText as Text } from "@/core/ui/picket-text";

import { useTransactionCopy,type TransactionNotice } from "@/features/transactions/use-transaction-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { WalletPickerSheet } from "@/core/ui/picker-sheets";
import { FigmaButton } from "@/core/ui/figma-ui";
import { figmaType } from "@picket/design-tokens";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useProfile } from "@/features/profile/profile-context";
import { summarizeCurrencies, transactionMonthAt } from "@/features/cashflow/currency-summary";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { AmountPaper, ChildBar, ErrorLine, FigmaScreen, FormRow, NoticeCard, PaperCard, heroAmount } from "@/features/transactions/figma-parts";
import { AppIcon } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";


import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function NewTransferScreen() {
  const {tx}=useTransactionCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { accounts: allAccounts } = useAccounts();
  const accounts = allAccounts.filter(account => !account.archived && !account.deletedAt);
  const { currency } = useLocalSearchParams<{ currency?: string }>();
  const { createTransfer, transactions } = useTransactions();
  const copy = useFigmaCopy();
  const { language } = useAppTheme();
  const { profile } = useProfile();
  type Account = (typeof allAccounts)[number];
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [sourceId, setSourceId] = useState(accounts.find(account => account.currencyCode === currency)?.id ?? accounts[0]?.id ?? "");
  const source = accounts.find((item) => item.id === sourceId) ?? accounts.find(item => item.currencyCode === currency) ?? accounts[0];
  const destinations = useMemo(() => accounts.filter((item) => item.id !== source?.id && item.currencyCode === source?.currencyCode), [accounts, source]);
  const [destinationId, setDestinationId] = useState("");
  const selectedDestinationId = destinations.some((item) => item.id === destinationId) ? destinationId : destinations[0]?.id ?? "";
  const [title] = useState(tx("Chuyển tiền"));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TransactionNotice | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function submit() {
    if (submitting.current) return;
    const parsedAmount = Number.parseInt(amount, 10);
    if (!source || !selectedDestinationId) return setMessage("Cần ít nhất hai tài khoản cùng loại tiền.");
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > 9_000_000_000_000) return setMessage("Số tiền phải là số nguyên lớn hơn 0.");
    submitting.current = true;
    setBusy(true); setMessage(null);
    try {
      await createTransfer({ amount: parsedAmount, destinationAccountId: selectedDestinationId, note: note.trim(), occurredAt: new Date().toISOString(), sourceAccountId: source.id, title: title.trim() || tx("Chuyển tiền") });
      router.replace(routes.transactions);
    } catch (error) {
      if (isOfflineQueuedError(error)) { router.replace(routes.transactions); return; }
      setMessage("Không chuyển được tiền. Hai tài khoản phải cùng loại tiền và đang hoạt động.");
    } finally { submitting.current = false; setBusy(false); }
  }

  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  let balances: Record<string, number> = {};
  try { balances = summarizeCurrencies(allAccounts, transactions, transactionMonthAt(new Date().toISOString(), timeZone), timeZone).walletBalances; } catch { /* balances unavailable: no overdraw check */ }
  const destination = destinations.find((item) => item.id === selectedDestinationId);
  const currencyCode = source?.currencyCode ?? "VND";
  const fmt = (value: number) => formatMoney(value, language, currencyCode);
  const sourceBalance = source ? balances[source.id] : undefined;
  const parsed = Number.parseInt(amount, 10);
  const over = sourceBalance !== undefined && Number.isFinite(parsed) && parsed > sourceBalance;
  const kindLabel = (account?: Account) => account ? (account.kind === "cash" ? copy("walletCash") : account.kind === "bank" ? copy("walletBank") : account.currencyCode) : "";
  const today = new Date();
  const card = (role: "from" | "to", account: Account | undefined, bg: string, border: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${role === "from" ? copy("from") : copy("to")}: ${account?.name ?? copy("pickWallet")}`} disabled={busy} onPress={() => setPicker(role)} style={[styles.walletCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.walletTile}><AppIcon name="wallet-outline" size={20} color={colors.text} /></View>
      <View style={{ flex: 1, minWidth: 1 }}>
        <Text style={[figmaType.overline, { color: colors.muted }]}>{(role === "from" ? copy("from") : copy("to")).toUpperCase()}</Text>
        <Text numberOfLines={1} style={[figmaType.bodyStrong, { fontSize: 15, color: colors.text, fontWeight: "800" }]}>{account?.name ?? copy("pickWallet")}</Text>
        <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted }]}>{kindLabel(account)}</Text>
      </View>
      {account && balances[account.id] !== undefined ? <Text style={[figmaType.amountRow, { color: colors.text }]}>{fmt(balances[account.id])}</Text> : null}
    </Pressable>
  );

  return <FigmaScreen footer={<FigmaButton fullWidth icon="check" busy={busy} disabled={!source || !selectedDestinationId || over || !amount} label={copy("transferDo")} onPress={() => void submit()} />}>
    <ChildBar title={copy("transferTitle")} backDisabled={busy} />
    <View style={{ gap: 0 }}>
      {card("from", source, colors.pocketCoral + "66", colors.pocketCoral)}
      <View style={{ height: 8 }} />
      {card("to", destination, colors.pocketMint + "66", colors.pocketMint)}
      <Pressable disabled={busy || !selectedDestinationId} accessibilityRole="button" accessibilityLabel={tx("Đổi chiều chuyển")} onPress={() => { setSourceId(selectedDestinationId); setDestinationId(source?.id ?? ""); }} style={styles.swap}><AppIcon name="chevron-down" size={22} color={colors.onPrimary} /></Pressable>
    </View>
    {!destination && source ? <ErrorLine>{tx("Không có tài khoản đích cùng loại tiền.")}</ErrorLine> : null}

    <AmountPaper overline={copy("transferAmount")} footer={
      <View style={styles.noteLine}><AppIcon name="pencil-outline" size={14} color={colors.muted} />
        <TextInput accessibilityLabel={tx("Ghi chú chuyển tiền")} borderless editable={!busy} maxLength={120} onChangeText={setNote} placeholder={tx("Không bắt buộc")} placeholderTextColor={colors.muted} style={styles.noteInput} value={note} /></View>}>
      <View style={styles.amountRow}>
        <TextInput money borderless accessibilityLabel={tx("Số tiền chuyển")} editable={!busy} keyboardType="number-pad" onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.muted} style={[styles.amountInput, { color: over ? colors.expense : amount ? colors.text : colors.muted }]} value={amount} />
        <Text style={[heroAmount, { color: over ? colors.expense : colors.text, textDecorationLine: "underline" }]}>{currencyCode === "VND" ? "₫" : currencyCode}</Text>
      </View>
    </AmountPaper>

    {over && source && sourceBalance !== undefined ? <NoticeCard title={copy("overTitle")} body={copy("overBody", { name: source.name, amount: fmt(sourceBalance) })} action={sourceBalance > 0 ? copy("transferAll") : undefined} onAction={() => setAmount(String(sourceBalance))} /> : null}
    {message ? <ErrorLine>{tx(message)}</ErrorLine> : null}

    <PaperCard><FormRow icon="calendar-month-outline" label={copy("rowDate")} value={`${tx("Hôm nay")}, ${today.toLocaleDateString(language === "en" ? "en-US" : "vi-VN")}`} last /></PaperCard>
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 4 }}><AppIcon name="shimmer" size={16} color={colors.muted} /><Text style={[figmaType.bodySmall, { color: colors.muted, flex: 1 }]}>{copy("transferHint")}</Text></View>

    <WalletPickerSheet visible={picker !== null} title={copy("walletPickTitle")} closeLabel={copy("close")} selectedId={picker === "to" ? selectedDestinationId : source?.id}
      options={(picker === "to" ? destinations : accounts).map((account) => ({ id: account.id, name: account.name, meta: kindLabel(account), balance: balances[account.id] !== undefined ? formatMoney(balances[account.id], language, account.currencyCode) : undefined }))}
      onSelect={(id) => { if (picker === "to") setDestinationId(id); else { setSourceId(id); setDestinationId(""); } setPicker(null); }} onClose={() => setPicker(null)} />
  </FigmaScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  walletCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  walletTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  swap: { position: "absolute", right: 24, top: "50%", marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  amountInput: { ...heroAmount, minWidth: 80, textAlign: "center", paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  noteLine: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4, justifyContent: "center", alignSelf: "stretch" },
  noteInput: { ...figmaType.bodySmall, color: colors.muted, minWidth: 140, padding: 0, backgroundColor: "transparent", borderWidth: 0, textAlign: "center" },
});
