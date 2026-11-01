import { PicketText as Text } from "@/core/ui/picket-text";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { summarizeCurrencies } from "@/features/cashflow/currency-summary";
import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import type { PaperAssetId } from "@/core/theme/paper-assets";
import { ConnectionNotice, EmptyState, PicketScreen } from "@/core/ui/picket-ui";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function AccountsScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { t } = useTranslation("overview");
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

  function accountArt(name: string): PaperAssetId {
    const lower = name.toLowerCase();
    if (lower.includes("tiết kiệm") || lower.includes("heo") || lower.includes("savings")) return "savings";
    if (lower.includes("tín dụng") || lower.includes("credit") || lower.includes("shopping")) return "shopping";
    if (lower.includes("techcombank") || lower.includes("debit") || lower.includes("ngân hàng")) return "security";
    return "bills";
  }

  return (
    <View style={styles.root}>
      <PicketScreen>
        {/* Master Design Screen 20 Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <AppIcon name="arrow-left" color={colors.ink} size={24} />
            </Pressable>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
              Ví &amp; Tài khoản của bạn
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Thêm tài khoản"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push(routes.newAccount)}
            style={styles.addCircleBtn}
          >
            <AppIcon name="plus" color={colors.onPrimary} size={20} />
          </Pressable>
        </View>

        {/* Master Summary Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroSubtitle}>Tổng tài sản ròng khả dụng</Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={Math.max(1, summary?.totals.length ?? 1)}
              style={styles.heroTotal}
            >
              {totalText}
            </Text>
            <Text style={styles.heroStatus}>
              {accounts.length} ví đang kết nối · Tự động đồng bộ
            </Text>
          </View>
          <View style={styles.heroIllustration}>
            <PaperArt id="savings" style={{ width: 68, height: 68 }} />
          </View>
        </View>

        {/* Section: DANH SÁCH VÍ & TÀI KHOẢN */}
        <Text style={styles.sectionHeaderLabel}>DANH SÁCH VÍ &amp; TÀI KHOẢN</Text>

        {error && <ConnectionNotice hasData={accounts.length > 0} onRetry={() => void refresh()} />}

        {accounts.length === 0 ? (
          <EmptyState
            title={t("firstWallet")}
            description={t("firstWalletBody")}
            action={t("addWallet")}
            onAction={() => router.push(routes.newAccount)}
          />
        ) : (
          <View style={styles.walletList}>
            {balances.map((a) => (
              <Pressable
                accessibilityRole="button"
                key={a.id}
                onPress={() => router.push(routes.account(a.id))}
                style={styles.walletCard}
              >
                <View style={styles.walletIconBox}>
                  <PaperArt id={accountArt(a.name)} style={{ width: 36, height: 36 }} />
                </View>
                <View style={styles.walletDetails}>
                  <Text style={styles.walletName}>{a.name}</Text>
                  <Text style={styles.walletDesc}>
                    {a.name.includes("tiết kiệm")
                      ? "Quỹ tích lũy lãi suất định kỳ"
                      : a.name.includes("tín dụng")
                      ? "Hạn mức khả dụng"
                      : a.name.includes("Debit")
                      ? "Tài khoản thanh toán số"
                      : "Dùng chi tiêu hằng ngày"}
                  </Text>
                </View>
                <Text style={styles.walletBalance}>{money(a.balance, a.currencyCode)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Master Design Screen 20 Bottom Action Buttons */}
        <View style={styles.bottomActionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.reconcile)}
            style={styles.reconcileBtn}
          >
            <Text style={styles.reconcileText}>Đối soát số dư</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.newTransfer)}
            style={styles.transferBtn}
          >
            <Text style={styles.transferText}>Chuyển tiền ví</Text>
          </Pressable>
        </View>
      </PicketScreen>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.cream },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
      marginRight: 8,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.3,
      flex: 1,
    },
    addCircleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.mauve,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.mauve,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    heroCopy: {
      flex: 1,
    },
    heroSubtitle: {
      color: colors.muted,
      fontSize: 13,
    },
    heroTotal: {
      color: colors.ink,
      fontSize: 28,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginVertical: 4,
    },
    heroStatus: {
      color: "#16A34A",
      fontSize: 12,
      fontWeight: "700",
    },
    heroIllustration: {
      marginLeft: 10,
    },
    sectionHeaderLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    walletList: {
      gap: 10,
      marginBottom: 20,
    },
    walletCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    walletIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
    },
    walletDetails: {
      flex: 1,
    },
    walletName: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
    },
    walletDesc: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    walletBalance: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    bottomActionsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 6,
      marginBottom: 40,
    },
    reconcileBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.mauve,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    reconcileText: {
      color: colors.mauve,
      fontSize: 14,
      fontWeight: "700",
    },
    transferBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 24,
      backgroundColor: colors.mauve,
      alignItems: "center",
      justifyContent: "center",
    },
    transferText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
