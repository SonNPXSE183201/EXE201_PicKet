import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , ChoiceChip, DangerAction, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
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
  const tx=useManagementCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { archive, update } = useAccounts();
  const [initialAccount] = useState(account);
  const [name, setName] = useState(initialAccount.name);
  const [kind, setKind] = useState<AccountKind>(initialAccount.kind);
  const [currencyCode, setCurrencyCode] = useState(initialAccount.currencyCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <TopAppBar illustration="home" title={tx("Chỉnh sửa tài khoản")} backDisabled={busy} />
    <Text style={styles.subtitle}>{tx("Số dư đầu kỳ được giữ nguyên để lịch sử giao dịch luôn nhất quán.")}</Text>
    {!account.archived && !account.deletedAt && <View style={{ marginBottom: 12 }}><PrimaryAction disabled={busy} label={tx("Thêm tiền vào ví")} onPress={() => router.push({ pathname: "/transactions/new", params: { kind: "income", accountId: account.id, title: tx("Thêm tiền vào ví") } })} /></View>}
    <Surface>
      <FieldLabel>{tx("Tên tài khoản")}</FieldLabel><TextInput accessibilityLabel={tx("Tên tài khoản")} maxLength={80} onChangeText={setName} placeholder={tx("Tên tài khoản")} placeholderTextColor={colors.muted} style={styles.input} value={name} />
      <FieldLabel>{tx("Loại tài khoản")}</FieldLabel><View accessibilityRole="radiogroup" style={styles.choices}>{kinds.map((item) => <ChoiceChip checked={kind === item.value} key={item.value} label={tx(item.label)} onPress={() => setKind(item.value)} />)}</View>
      <FieldLabel>{tx("Tiền tệ")}</FieldLabel><TextInput accessibilityLabel={tx("Mã tiền tệ")} autoCapitalize="characters" maxLength={3} onChangeText={(value) => setCurrencyCode(value.toUpperCase())} placeholder="VND" placeholderTextColor={colors.muted} style={styles.input} value={currencyCode} />
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{tx(message)}</Text> : null}
      <PrimaryAction busy={busy} label={tx("Lưu thay đổi")} onPress={() => void save()} />
      <DangerAction disabled={busy} label={tx("Lưu trữ tài khoản")} onPress={confirmArchive} />
    </Surface>
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  loading: { alignItems: "center", backgroundColor: colors.cream, flex: 1, justifyContent: "center" }, appBar: { justifyContent: "center", minHeight: 52 }, back: { color: colors.link, fontSize: 15, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 7 },
  input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  error: { color: colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
});
