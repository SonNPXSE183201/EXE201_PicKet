import { usePullRefresh } from "@/features/sync/use-pull-refresh";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { summarizeCurrencies } from "@/features/cashflow/currency-summary";
import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AppIcon } from "@/core/ui/app-icon";
import { ConnectionNotice, PicketScreen, IconButton, TopAppBar } from "@/core/ui/picket-ui";
import { DashedAddCard, FigmaButton } from "@/core/ui/figma-ui";
import { WalletCard, WalletTotalPouch } from "@/features/accounts/wallet-cards";
import { figmaType } from "@picket/design-tokens";
import type { IconName } from "@/core/ui/app-icon";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function AccountsScreen() {
  const pullRefresh = usePullRefresh();
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();

  const { session, localMode } = useAuth();
  const { accounts, error, refresh } = useAccounts();
  const { transactions } = useTransactions();
  const { profile } = useProfile();

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const now = new Date();
  let summary: ReturnType<typeof summarizeCurrencies> | null = null;
  try {
    summary = summarizeCurrencies(
      accounts,
      transactions,
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      profile?.timezone ?? "Asia/Ho_Chi_Minh",
    );
  } catch {
    /* Do not display invalid financial totals. */
  }

  const balances = accounts.map((account) => ({
    ...account,
    balance: summary?.walletBalances[account.id],
  }));

  const money = (value: number | undefined, currency: string) =>
    profile?.hideBalance ? "••••••" : value === undefined ? "—" : formatMoney(value, language, currency);

  const totalText = summary
    ? summary.totals.length
      ? summary.totals.map((row) => money(row.balance, row.currency)).join("\n")
      : money(0, profile?.currencyCode ?? "VND")
    : "—";

  const kindLabel: Record<string, string> = { cash: "Tiền mặt", bank: "Ngân hàng", ewallet: "Ví điện tử", other: "Khác" };
  const kindIcon: Record<string, IconName> = { cash: "cash-multiple", bank: "bank-outline", ewallet: "wallet-outline", other: "wallet-outline" };
  const tones = [colors.pocketCoral, colors.pocketMint, colors.pocketBlue, colors.pocketLilac];
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthCount = (id: string) => transactions.filter((tx) => tx.accountId === id && tx.occurredAt.startsWith(monthPrefix)).length;

  return (
    <View style={styles.root}>
      <PicketScreen onRefresh={pullRefresh}>
        <View style={styles.block}>
          <TopAppBar title="Ví của bạn" action={<IconButton icon="plus" label="Thêm tài khoản" variant="surface" onPress={() => router.push(routes.newAccount)} />} />
        </View>
        {error && <ConnectionNotice hasData={accounts.length > 0} onRetry={() => void refresh()} />}
        <View style={styles.block}>
          <WalletTotalPouch
            label={`Tổng trong ${accounts.length} ví`}
            total={totalText}
            lines={Math.max(1, summary?.totals.length ?? 1)}
            footer={`Cập nhật lúc ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(now)} hôm nay`}
          />
        </View>
        <View style={styles.wallets}>
          {balances.map((a, index) => (
            <WalletCard
              key={a.id}
              name={a.name}
              kindLabel={kindLabel[a.kind] ?? "Khác"}
              amount={money(a.balance, a.currencyCode)}
              meta={`${monthCount(a.id)} giao dịch tháng này`}
              tone={tones[index % tones.length]}
              icon={kindIcon[a.kind] ?? "wallet-outline"}
              onPress={() => router.push(routes.account(a.id))}
            />
          ))}
          <DashedAddCard layout="card" cardWidth="46.5%" label="Thêm ví" onPress={() => router.push(routes.newAccount)} />
        </View>
        <View style={styles.hint}>
          <AppIcon name="star-four-points-outline" size={16} color={colors.muted} />
          <Text style={[figmaType.bodySmall, styles.hintText]}>Giữ số dư khớp thực tế bằng Đối soát mỗi tháng.</Text>
        </View>
        <View style={styles.actions}>
          <View style={{ flex: 1 }}><FigmaButton variant="outline" fullWidth label="Đối soát số dư" onPress={() => router.push(routes.reconcile)} /></View>
          <View style={{ flex: 1 }}><FigmaButton fullWidth label="Chuyển tiền ví" onPress={() => router.push(routes.newTransfer)} /></View>
        </View>
      </PicketScreen>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    block: { marginBottom: 20 },
    wallets: { flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 28, paddingTop: 22 },
    hint: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
    hintText: { flex: 1, color: colors.muted },
    actions: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 24 },
  });
