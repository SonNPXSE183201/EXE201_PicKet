import { useState } from "react";
import { HomeWeeklyRhythm } from "@/features/cashflow/home-weekly-rhythm";
import { PicketText as Text } from "@/core/ui/picket-text";
import { HomeBudgetPockets } from "@/features/budgets/home-budget-pockets";
import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatMoney, localeFor } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { summarizeCurrencies } from "@/features/cashflow/currency-summary";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AppIcon } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, IconButton, MenuRow, PicketScreen, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { AnnouncementBanner } from "@/features/announcements/announcement-views";

export default function HomeScreen() {
  const { receiptMonth } = useLocalSearchParams<{ receiptMonth?: string }>();
  const initialMonth = typeof receiptMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(receiptMonth) ? receiptMonth : undefined;
  return <HomeContent key={initialMonth ?? "current"} initialMonth={initialMonth} />;
}

function HomeContent({ initialMonth }: { initialMonth?: string }) {
  const { colors, styles, theme } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { t } = useTranslation("overview");
  const { configured, loading: authLoading, localMode, session } = useAuth();
  const { error: profileError, loading: profileLoading, profile, refresh, updatePreferences } = useProfile();
  const { accounts, error: accountsError, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { categories, error: transactionsError, refresh: refreshTransactions, transactions } = useTransactions();
  const { conflictCount, flush, pendingCount, syncing } = useSync();
  const month = initialMonth ? new Date(Number(initialMonth.slice(0, 4)), Number(initialMonth.slice(5)) - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const selectedMonth = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
  const visible = transactions.filter(item => !item.deletedAt).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  let summary: ReturnType<typeof summarizeCurrencies> | null = null;
  try { summary = summarizeCurrencies(accounts,transactions,selectedMonth,profile?.timezone ?? "Asia/Ho_Chi_Minh"); } catch { /* Show unavailable instead of a misleading total. */ }
  const totals = summary?.totals.length ? summary.totals : summary ? [{currency:profile?.currencyCode ?? "VND",balance:0,income:0,expense:0}] : [];
  const [balanceHidden, setBalanceHidden] = useState<boolean | null>(null);
  const hideBalance = balanceHidden ?? profile?.hideBalance ?? false;
  const toggleBalance = () => {
    const next = !hideBalance;
    setBalanceHidden(next);
    void updatePreferences({ hide_balance: next }).catch(() => { /* Keep the local display choice available offline. */ });
  };
  const money = (value: number, currency?: string) => hideBalance ? "••••••" : currency ? formatMoney(value,language,currency) : "—";
  const totalText = (field:"balance"|"income"|"expense") => totals.map(row=>money(row[field],row.currency)).join("\n") || "—";
  if (authLoading || ((session || localMode) && !profile && (profileLoading || accountsLoading))) return <View style={styles.loading}><ActivityIndicator accessibilityLabel={t("loading")} color={colors.link} /></View>;
  if ((!configured || !session) && !localMode) return <Redirect href={routes.login} />;
  if (!profileError && !profile?.onboardingCompleted) return <Redirect href={routes.onboarding} />;
  return <View style={styles.root}><PicketScreen>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.greeting}>{new Date().toLocaleDateString(localeFor(language), { weekday: "long", day: "numeric", month: "long", timeZone: profile?.timezone ?? "Asia/Ho_Chi_Minh" })}</Text><Text accessibilityRole="header" style={styles.heading}>{t("homeToday",{name:profile?.displayName?.trim().split(/\s+/).pop() || t("friend")})}</Text></View><IconButton icon="bell-outline" label={t("notifications")} onPress={() => router.push(routes.notifications)} /></View>
    <AnnouncementBanner />
    <Surface style={styles.balanceCard}><View pointerEvents="none" style={{ position: "absolute", right: 4, bottom: 0, opacity: theme === "dark" ? .85 : 1 }}><PaperArt id="bloom" style={{ width: 92, height: 100 }} /></View><View style={styles.between}><Text style={styles.balanceLabel}>{t("balance")}</Text><Pressable accessibilityLabel={hideBalance ? t("showBalance") : t("hideBalance")} accessibilityRole="button" onPress={toggleBalance} style={styles.eyeTouchWrap}><View style={styles.eyeCircle}><AppIcon name={hideBalance ? "eye-off-outline" : "eye-outline"} size={17} color={colors.mauve} /></View></Pressable></View><Text adjustsFontSizeToFit numberOfLines={Math.max(1,totals.length)} style={styles.balance}>{totalText("balance")}</Text><Pressable onPress={() => router.navigate(routes.accounts)} style={styles.walletLink}><AppIcon name="wallet-outline" size={18} color={colors.ink} /><Text style={styles.walletLinkText}>{t("walletCount",{count:accounts.length})}</Text></Pressable></Surface>

    {(!summary || summary.unscopedTransactionIds.length>0) && <Text accessibilityRole="alert" style={{color:colors.expense}}>{t("summaryError")}</Text>}
    {(profileError || accountsError || transactionsError) && <ConnectionNotice hasData={Boolean(profile || accounts.length || transactions.length)} onRetry={() => void Promise.all([refresh(), refreshAccounts(), refreshTransactions()])} />}
    {(pendingCount > 0) && <Pressable onPress={() => { if (!localMode) void flush(); }} accessibilityState={{ busy: syncing }} style={styles.status}><AppIcon name={syncing ? "sync" : localMode ? "cellphone-check" : "cloud-sync-outline"} size={17} color={colors.muted} /><Text style={styles.statusText}>{localMode ? t("local") : syncing ? t("syncing") : t("pending",{count:pendingCount})}</Text></Pressable>}
    {conflictCount > 0 && <MenuRow icon="alert-circle-outline" title={t("conflicts",{count:conflictCount})} onPress={() => router.push(routes.syncConflicts)} />}
    <HomeWeeklyRhythm />
    <HomeBudgetPockets />
    <SectionTitle title={t("recent")} action={t("viewAll")} onAction={() => router.push(routes.transactions)} />
    {visible.length === 0 ? <View style={{ paddingVertical: 12 }}><Text style={styles.meta}>{t("emptyTitle")}</Text><Pressable onPress={() => router.push(routes.newTransaction)}><Text style={{ color: colors.link, fontWeight: "700" }}>{t("addTransaction")}</Text></Pressable></View> : <Surface style={styles.list}>{visible.slice(0, 3).map((item, index) => {
      const category = categories.find((c) => c.id === item.categoryId);
      const artId = categoryArt(category?.icon ?? null, category?.name || item.title);
      return <Pressable key={item.id} onPress={() => router.push(routes.transaction(item.id))} style={[styles.row, index > 0 && styles.divider]}><View style={styles.transactionIcon}><PaperArt id={artId} style={{ width: 28, height: 28 }} /></View><View style={styles.copy}><Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text><Text style={styles.meta}>{new Date(item.occurredAt).toLocaleDateString(localeFor(language),{timeZone:profile?.timezone ?? "Asia/Ho_Chi_Minh"})}</Text></View><Text style={[styles.rowAmount, { color: item.kind === "expense" ? colors.expense : item.kind === "transfer" ? colors.mauve : colors.income }]}>{accounts.find(account=>account.id===item.accountId)?.currencyCode ? formatMoney(item.amount,language,accounts.find(account=>account.id===item.accountId)!.currencyCode) : "—"}</Text></Pressable>;
    })}</Surface>}
  </PicketScreen></View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 6, paddingBottom: 12 }, greeting: { color: colors.muted, fontSize: 13, lineHeight: 20 }, heading: { color: colors.text, fontSize: 26, lineHeight: 34, fontWeight: "800", letterSpacing: -.6 },
  eyeTouchWrap: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", zIndex: 1 },
  eyeCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.pocketLilac, alignItems: "center", justifyContent: "center" },
  balanceCard: { minHeight: 160, overflow: "hidden", padding: 18, borderWidth: 0, borderRadius: 32, borderBottomLeftRadius: 16 }, between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, balanceLabel: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.muted }, balance: { paddingRight: 48, fontSize: 38, lineHeight: 48, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -1, color: colors.text }, walletLink: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, marginTop: 4 }, walletLinkText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  status: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }, statusText: { color: colors.muted, fontSize: 12, flex: 1 }, list: { padding: 0, backgroundColor: "transparent", borderWidth: 0 }, row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingVertical: 8 }, divider: { borderTopWidth: 1, borderTopColor: colors.border }, transactionIcon: { backgroundColor: colors.pocketLilac, width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, gap: 3 }, rowTitle: { color: colors.text, fontSize: 14, fontWeight: "600", lineHeight: 20 }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, rowAmount: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"], maxWidth: "40%" },
});
