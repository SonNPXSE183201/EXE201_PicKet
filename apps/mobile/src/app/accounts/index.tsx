import { colors } from "@picket/design-tokens";
import { formatVnd } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AppIcon } from "@/core/ui/app-icon";
import { ConnectionNotice, EmptyState, FloatingAction, MenuRow, PicketScreen, SectionTitle, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function AccountsScreen() {
  const { session, localMode } = useAuth();
  const { accounts, error, refresh } = useAccounts();
  const { transactions } = useTransactions();
  const { profile } = useProfile();
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const balances = accounts.map((account) => ({ ...account, balance: account.openingBalance + transactions.reduce((total, t) => total + (t.accountId === account.id ? (t.kind === "expense" || t.kind === "transfer" ? -t.amount : t.amount) : 0) + (t.kind === "transfer" && t.destinationAccountId === account.id ? t.amount : 0), 0) }));
  const money = (value: number) => profile?.hideBalance ? "••••••" : formatVnd(value);
  return <View style={styles.root}><PicketScreen><TopAppBar title="Ví của bạn" subtitle="Theo dõi số dư và dòng tiền giữa các ví." back={false} /><Surface peach><Text style={styles.meta}>Tổng số dư</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.total}>{money(balances.reduce((sum, a) => sum + a.balance, 0))}</Text><Text style={styles.meta}>{accounts.length} tài khoản đang hoạt động</Text></Surface>
    <SectionTitle title="Tài khoản" />{error && <ConnectionNotice hasData={accounts.length > 0} onRetry={() => void refresh()} />}
    {accounts.length === 0 ? <EmptyState title="Ví đầu tiên của bạn" description="Thêm ví tiền mặt hoặc tài khoản ngân hàng để bắt đầu." action="Thêm ví" onAction={() => router.push(routes.newAccount)} /> : <Surface style={styles.list}>{balances.map((a) => <MenuRow key={a.id} title={a.name} description={money(a.balance)} icon="wallet-outline" onPress={() => router.push(routes.account(a.id))} />)}</Surface>}
    <SectionTitle title="Quản lý dòng tiền" /><Surface style={styles.list}><MenuRow icon="swap-horizontal" title="Chuyển tiền giữa các ví" onPress={() => router.push(routes.newTransfer)} /><MenuRow icon="scale-balance" title="Đối soát số dư" onPress={() => router.push(routes.reconcile)} /><MenuRow icon="history" title="Lịch sử giao dịch" onPress={() => router.push(routes.transactions)} /></Surface><View style={styles.note}><AppIcon name="shield-check-outline" size={18} /><Text style={styles.meta}>Dữ liệu của bạn được lưu riêng tư.</Text></View>
  </PicketScreen><FloatingAction label="Thêm ví" onPress={() => router.push(routes.newAccount)} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.cream }, meta: { color: colors.muted, fontSize: 13, lineHeight: 20 }, total: { color: colors.ink, fontSize: 36, lineHeight: 48, fontWeight: "700", fontVariant: ["tabular-nums"], marginVertical: 10 }, list: { paddingVertical: 4 }, note: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 } });
