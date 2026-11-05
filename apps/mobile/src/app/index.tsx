import { useState } from "react";
import { HomeWeeklyRhythm } from "@/features/cashflow/home-weekly-rhythm";
import { PicketText as Text } from "@/core/ui/picket-text";
import { HomeBudgetPockets } from "@/features/budgets/home-budget-pockets";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatMoney, localeFor } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { summarizeCurrencies } from "@/features/cashflow/currency-summary";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AppIcon } from "@/core/ui/app-icon";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, IconButton, MenuRow, PicketScreen } from "@/core/ui/picket-ui";
import { SectionHeader, Skeleton } from "@/core/ui/figma-ui";
import { HomeHero, HomeHeroSkeleton, type StubState } from "@/features/home/home-hero";
import { HomeRecent, HomeRecentSkeleton, type RecentRow } from "@/features/home/home-recent";
import { WeeklySkeleton } from "@/features/cashflow/weekly-day-bars";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function HomeScreen() {
  const { receiptMonth } = useLocalSearchParams<{ receiptMonth?: string }>();
  const initialMonth = typeof receiptMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(receiptMonth) ? receiptMonth : undefined;
  return <HomeContent key={initialMonth ?? "current"} initialMonth={initialMonth} />;
}

function HomeContent({ initialMonth }: { initialMonth?: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
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
  if (authLoading || ((session || localMode) && !profile && (profileLoading || accountsLoading))) return <View accessibilityLabel={t("loading")} accessibilityState={{ busy: true }} style={styles.root}><PicketScreen>
    <HomeHeader title={t("homeToday", { name: profile?.displayName?.trim().split(/\s+/).pop() || t("friend") })} dateText={new Date().toLocaleDateString(localeFor(language), { weekday: "long", day: "numeric", month: "long" })} bell={t("notifications")} />
    <HomeHeroSkeleton label={t("balance")} />
    <View style={styles.block}><SectionHeader overline={t("rhythmTitle")} title={t("rhythmWeekLoading")} /><WeeklySkeleton /></View>
    <View style={styles.block}><SectionHeader overline={t("pocketLabel")} title={t("pocketTitle")} /><View style={{ flexDirection: "row", gap: 12, overflow: "hidden" }}>{[0, 1, 2].map(i => <View key={i} style={styles.skeletonPocket}><Skeleton width={32} height={32} radius={11} /><Skeleton width={64} height={8} /><Skeleton width={92} height={14} /><Skeleton width={116} height={4} /></View>)}</View></View>
    <HomeRecentSkeleton />
  </PicketScreen></View>;
  if ((!configured || !session) && !localMode) return <Redirect href={routes.login} />;
  if (!profileError && !profile?.onboardingCompleted) return <Redirect href={routes.onboarding} />;
  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const dayKey = (instant: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  const todayKey = dayKey(new Date());
  const heroCurrency = totals[0]?.currency;
  const todayExpenses = visible.filter(item => item.kind === "expense" && dayKey(new Date(item.occurredAt)) === todayKey && accounts.find(account => account.id === item.accountId)?.currencyCode === heroCurrency);
  const todaySum = todayExpenses.reduce((sum, item) => sum + item.amount, 0);
  const stub: StubState = hideBalance ? { kind: "hidden", title: t("homeStubTodayHidden") } : todayExpenses.length ? { kind: "default", title: t("homeStubToday", { count: todayExpenses.length }), amount: `−${money(todaySum, heroCurrency)}` } : { kind: "empty", title: t("homeStubTodayHidden"), hint: t("homeStubEmpty") };
  const groupLabel = (iso: string) => {
    const instant = new Date(iso), key = dayKey(instant);
    const weekday = instant.toLocaleDateString(localeFor(language), { weekday: "long", timeZone });
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "numeric" }).format(instant);
    const label = t("homeWeekdayDate", { weekday, date: parts.replace(/\/(\d+)$/, "/$1") });
    return key === todayKey ? `${t("homeTodayLabel")} · ${label}` : label;
  };
  const recentRows: RecentRow[] = visible.slice(0, 3).map(item => {
    const category = categories.find(c => c.id === item.categoryId);
    const account = accounts.find(entry => entry.id === item.accountId);
    const sign = item.kind === "expense" ? "−" : item.kind === "income" ? "+" : "";
    return { id: item.id, title: item.title, group: groupLabel(item.occurredAt), kind: item.kind, icon: category?.icon ?? null, categoryName: category?.name ?? "",
      meta: [category?.name, account?.name].filter(Boolean).join(" · ") || new Date(item.occurredAt).toLocaleDateString(localeFor(language), { timeZone }),
      amount: account?.currencyCode ? `${sign}${formatMoney(item.amount, language, account.currencyCode)}` : "—" };
  });
  return <View style={styles.root}><PicketScreen>
    <HomeHeader title={t("homeToday", { name: profile?.displayName?.trim().split(/\s+/).pop() || t("friend") })} dateText={new Date().toLocaleDateString(localeFor(language), { weekday: "long", day: "numeric", month: "long", timeZone })} bell={t("notifications")} />
    <HomeHero label={t("balance")} balance={totalText("balance")} lines={Math.max(1, totals.length)} hidden={hideBalance} onToggle={toggleBalance} toggleLabel={hideBalance ? t("showBalance") : t("hideBalance")} wallets={accounts.length === 1 ? undefined : t("homeWallets", { count: accounts.length })} onWallets={() => router.navigate(routes.accounts)} stub={stub} />
    {(!summary || summary.unscopedTransactionIds.length>0) && <Text accessibilityRole="alert" style={{color:colors.expense}}>{t("summaryError")}</Text>}
    {(profileError || accountsError || transactionsError) && <ConnectionNotice hasData={Boolean(profile || accounts.length || transactions.length)} onRetry={() => void Promise.all([refresh(), refreshAccounts(), refreshTransactions()])} />}
    {(pendingCount > 0) && <Pressable onPress={() => { if (!localMode) void flush(); }} accessibilityState={{ busy: syncing }} style={styles.status}><AppIcon name={syncing ? "sync" : localMode ? "cellphone-check" : "cloud-sync-outline"} size={17} color={colors.muted} /><Text style={styles.statusText}>{localMode ? t("local") : syncing ? t("syncing") : t("pending",{count:pendingCount})}</Text></Pressable>}
    {conflictCount > 0 && <MenuRow icon="alert-circle-outline" title={t("conflicts",{count:conflictCount})} onPress={() => router.push(routes.syncConflicts)} />}
    <View style={styles.block}><HomeWeeklyRhythm /></View>
    <View style={styles.block}><HomeBudgetPockets /></View>
    <View style={styles.block}><HomeRecent rows={recentRows} onAdd={() => router.push(routes.newTransaction)} onOpen={id => router.push(routes.transaction(id))} /></View>
  </PicketScreen></View>;
}

function HomeHeader({ title, dateText, bell }: { title: string; dateText: string; bell: string }) {
  const { styles } = useMobileStyles(createStyles);
  return <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.greeting}>{dateText}</Text><Text accessibilityRole="header" numberOfLines={2} style={styles.heading}>{title}</Text></View><IconButton variant="surface" icon="bell-outline" label={bell} onPress={() => router.push(routes.notifications)} /></View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 16, paddingBottom: 24 },
  greeting: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  heading: { color: colors.text, fontSize: 22, lineHeight: 29, fontWeight: "800", letterSpacing: -.3, marginTop: 2 },
  block: { gap: 12, marginTop: 24 },
  skeletonPocket: { width: 148, height: 188, padding: 16, gap: 10, justifyContent: "flex-end", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 12 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }, statusText: { color: colors.muted, fontSize: 12, flex: 1 },
});
