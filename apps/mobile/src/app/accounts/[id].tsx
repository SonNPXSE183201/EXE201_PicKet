import { useMgmtCopy } from "@/features/management/management-copy";
import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , ChoiceChip, DangerAction, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { figmaType } from "@picket/design-tokens";
import { Overline, ReceiptSheet, TransactionRow } from "@/core/ui/figma-ui";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { WalletTotalPouch } from "@/features/accounts/wallet-cards";
import { categoryTile } from "@/features/home/home-recent";
import { summarizeCurrencies } from "@/features/cashflow/currency-summary";
import { useTransactions } from "@/features/transactions/transactions-context";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import type { AccountKind, FinancialAccount } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";

const kinds: { value: AccountKind; label: string }[] = [
  { value: "cash", label: "Tiền mặt" }, { value: "bank", label: "Ngân hàng" }, { value: "ewallet", label: "Ví điện tử" }, { value: "other", label: "Khác" },
];

export default function AccountDetailScreen() {
  const tx=useManagementCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, localMode } = useAuth();
  const { accounts, loading } = useAccounts();
  const account = accounts.find((item) => item.id === id);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (!account && loading) return <SafeAreaView style={styles.loading}><ActivityIndicator accessibilityLabel={tx("Đang tải tài khoản")} color={colors.link} /></SafeAreaView>;
  if (!account) return <Redirect href={routes.home} />;
  return <AccountForm account={account} />;
}

function AccountForm({ account }: { account: FinancialAccount }) {
  const m = useMgmtCopy();
  const tx=useManagementCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { accounts, archive, update } = useAccounts();
  const [initialAccount] = useState(account);
  const [name, setName] = useState(initialAccount.name);
  const [kind, setKind] = useState<AccountKind>(initialAccount.kind);
  const [currencyCode, setCurrencyCode] = useState(initialAccount.currencyCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { language } = useAppTheme();
  const { categories, transactions } = useTransactions();
  const own = transactions.filter((item) => item.accountId === account.id && !item.deletedAt).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  let balance: number | undefined;
  try { balance = summarizeCurrencies(accounts, transactions, new Date().toISOString().slice(0, 7), "Asia/Ho_Chi_Minh").walletBalances[account.id]; } catch { /* hide invalid totals */ }
  const kindText = kinds.find((item) => item.value === account.kind)?.label ?? "";
  const money = (value: number) => formatMoney(value, language, account.currencyCode);
  const dayKey = (iso: string) => iso.slice(0, 10);
  const groups: { day: string; items: typeof own }[] = [];
  for (const item of own.slice(0, 30)) { const day = dayKey(item.occurredAt); const last = groups[groups.length - 1]; if (last?.day === day) last.items.push(item); else groups.push({ day, items: [item] }); }
  const dayLabel = (day: string) => { const [y, m, d] = day.split("-").map(Number); const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("vi-VN", { weekday: "long", timeZone: "UTC" }); return `${weekday} ${d}/${m}`; };
  const signed = (item: (typeof own)[number]) => item.kind === "expense" ? -item.amount : item.kind === "income" ? item.amount : 0;
  const chips: { label: string; icon: IconName; onPress(): void }[] = [
    { label: m.transfer, icon: "swap-horizontal", onPress: () => router.push(routes.newTransfer) },
    { label: m.reconcile, icon: "check", onPress: () => router.push(routes.reconcile) },
    { label: editing ? m.close : m.editWallet, icon: "note-edit-outline", onPress: () => setEditing((value) => !value) },
  ];

  async function save() {
    if (!name.trim()) return setMessage("Hãy nhập tên tài khoản.");
    if (!/^[A-Z]{3}$/.test(currencyCode)) return setMessage("Mã tiền tệ phải gồm 3 chữ cái, ví dụ VND.");
    setBusy(true); setMessage(null);
    try {
      await update(initialAccount.id, { expectedVersion: initialAccount.version, name: name.trim(), kind, currencyCode });
      router.back();
    } catch (error) {
      if (isOfflineQueuedError(error)) { router.replace(routes.home); return; }
      setMessage("Không lưu được. Dữ liệu có thể đã thay đổi, hãy tải lại và thử lại.");
    } finally { setBusy(false); }
  }

  async function archiveAccount() {
    setBusy(true); setMessage(null);
    try {
      await archive(initialAccount.id, initialAccount.version);
      router.replace(routes.home);
    } catch (error) {
      if (isOfflineQueuedError(error)) { router.replace(routes.home); return; }
      setMessage("Không lưu trữ được. Hãy tải lại và thử lại.");
    } finally { setBusy(false); }
  }

  function confirmArchive() {
    Alert.alert(tx("Lưu trữ tài khoản?"), tx("Tài khoản sẽ không còn xuất hiện trong danh sách. Giao dịch lịch sử vẫn được giữ lại."), [
      { text: tx("Hủy"), style: "cancel" }, { text: tx("Lưu trữ"), style: "destructive", onPress: () => void archiveAccount() },
    ]);
  }

  return <PicketScreen>
    <TopAppBar title={account.name} backDisabled={busy} />
    <View style={styles.block}>
      <WalletTotalPouch art="bloom" label={`${kindText} · ${m.currentBalance}`} total={balance === undefined ? "—" : money(balance)} footer={`${own.length} ${m.txCount}`} />
    </View>
    <View style={styles.quick}>
      {chips.map((chip) => <Pressable accessibilityRole="button" key={chip.label} onPress={chip.onPress} style={styles.chip}><AppIcon name={chip.icon} size={14} color={colors.text} /><Text style={[figmaType.captionStrong, { color: colors.text }]}>{chip.label}</Text></Pressable>)}
    </View>
    {groups.map((group) => <View key={group.day} style={styles.block}>
      <ReceiptSheet>
        <View style={styles.dayHeader}><Overline>{dayLabel(group.day)}</Overline><Text style={[figmaType.captionStrong, { color: colors.text }]}>{(() => { const total = group.items.reduce((sum, item) => sum + signed(item), 0); return `${total < 0 ? "−" : total > 0 ? "+" : ""}${money(Math.abs(total))}`; })()}</Text></View>
        {group.items.map((item) => { const category = categories.find((entry) => entry.id === item.categoryId); const tile = categoryTile(category?.icon ?? null, category?.name ?? item.title, item.kind === "income", colors);
          return <TransactionRow key={item.id} tileColor={tile.color} tile={<AppIcon name={tile.name} size={18} color={colors.text} />} title={item.title} meta={[category?.name, account.name].filter(Boolean).join(" · ")} amount={`${item.kind === "expense" ? "−" : item.kind === "income" ? "+" : ""}${money(item.amount)}`} amountColor={item.kind === "expense" ? colors.expense : item.kind === "income" ? colors.income : colors.primary} onPress={() => router.push(routes.transaction(item.id))} />; })}
      </ReceiptSheet>
    </View>)}
    {editing ? <View style={styles.block}>
    <Surface>
      <FieldLabel>{tx("Tên tài khoản")}</FieldLabel><TextInput accessibilityLabel={tx("Tên tài khoản")} maxLength={80} onChangeText={setName} placeholder={tx("Tên tài khoản")} placeholderTextColor={colors.muted} style={styles.input} value={name} />
      <FieldLabel>{tx("Loại tài khoản")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <ChoiceChip checked={kind === item.value} key={item.value} label={tx(item.label)} onPress={() => setKind(item.value)} />)}</View>
      <FieldLabel>{tx("Tiền tệ")}</FieldLabel><TextInput accessibilityLabel={tx("Mã tiền tệ")} autoCapitalize="characters" maxLength={3} onChangeText={(value) => setCurrencyCode(value.toUpperCase())} placeholder="VND" placeholderTextColor={colors.muted} style={styles.input} value={currencyCode} />
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{tx(message)}</Text> : null}
      <PrimaryAction busy={busy} label={tx("Lưu thay đổi")} onPress={() => void save()} />
      <DangerAction disabled={busy} label={tx("Lưu trữ tài khoản")} onPress={confirmArchive} />
    </Surface></View> : null}
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  block: { marginTop: 20 }, quick: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingLeft: 12, paddingRight: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loading: { alignItems: "center", backgroundColor: colors.cream, flex: 1, justifyContent: "center" }, appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.link, fontSize: 15, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 7 },
  input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  error: { color: colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
});
