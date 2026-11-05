import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useProfile } from "@/features/profile/profile-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { filterTransactions } from "@/core/sync/filter-transactions";
import { AppIcon } from "@/core/ui/app-icon";
import { Chip, Skeleton } from "@/core/ui/figma-ui";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, ConnectionNotice, FloatingAction, IconButton, MenuRow, PicketScreen, Surface } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { transactionMonthAt } from "@/features/cashflow/currency-summary";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { DayPaper, MonthSwitcher, SpendingCalendar, SpendingEmpty, SpendingSkeleton, ViewToggle, dayKeyAt, dayLabel, dayTotal, groupByDay } from "@/features/transactions/spending-list";

type TransactionRouteParams = {
  accountId?: string;
  categoryId?: string;
  month?: string;
  day?: string;
  kind?: string;
  currency?: string;
};

export default function TransactionsScreen() {
  const params = useLocalSearchParams<TransactionRouteParams>();
  return <TransactionsContent key={JSON.stringify(params)} params={params} />;
}

const KINDS: [string, "all" | "expense" | "incomeKind" | "transfer" | "refund"][] = [["", "all"], ["expense", "expense"], ["income", "incomeKind"], ["transfer", "transfer"], ["refund", "refund"]];

function TransactionsContent({ params }: { params: TransactionRouteParams }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { t } = useTranslation("transactions");
  const copy = useFigmaCopy();
  const { profile } = useProfile();
  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const { t: homeCopy } = useTranslation("overview");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(params.kind ?? "");
  const [day, setDay] = useState(params.day ?? "");
  const [currencyFilter, setCurrencyFilter] = useState(params.currency ?? "");
  const [accountId, setAccountId] = useState(params.accountId ?? "");
  const [categoryId, setCategoryId] = useState(params.categoryId ?? "");
  const [month, setMonth] = useState(params.month ?? (params.day ? "" : transactionMonthAt(new Date().toISOString(), timeZone)));
  const [showFilters, setShowFilters] = useState(Boolean(params.categoryId || params.accountId));
  const [showSearch, setShowSearch] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { session, localMode } = useAuth();
  const { accounts } = useAccounts();
  const { categories, error, loading, refresh, transactions } = useTransactions();
  const { flush, lastSyncedAt, pendingCount, syncing } = useSync();

  useEffect(() => {
    if (lastSyncedAt !== null) void refresh();
  }, [lastSyncedAt, refresh]);

  const accountNames = useMemo(() => new Map(accounts.map((item) => [item.id, item.name])), [accounts]);
  const accountCurrency = useMemo(() => new Map(accounts.map((item) => [item.id, item.currencyCode])), [accounts]);
  const categoryNames = useMemo(() => Object.fromEntries(categories.map((item) => [item.id, item.name])), [categories]);
  const base = { query: "", kind: "", accountId, categoryId, month, day, currency: currencyFilter, timeZone };
  const filtered = useMemo(
    () => filterTransactions(transactions, { ...base, query, kind }, categoryNames, Object.fromEntries(accountCurrency)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, query, kind, accountId, categoryId, month, day, currencyFilter, timeZone, categoryNames, accountCurrency],
  );
  const monthly = useMemo(
    () => filterTransactions(transactions, base, categoryNames, Object.fromEntries(accountCurrency)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, accountId, categoryId, month, day, currencyFilter, timeZone, categoryNames, accountCurrency],
  );
  if (!session && !localMode) return <Redirect href={routes.login} />;

  const currency = currencyFilter || "VND";
  const spent = monthly.reduce((sum, item) => accountCurrency.get(item.accountId) !== currency ? sum : item.kind === "expense" ? sum + item.amount : item.kind === "refund" ? sum - item.amount : sum, 0);
  const earned = monthly.reduce((sum, item) => accountCurrency.get(item.accountId) === currency && item.kind === "income" ? sum + item.amount : sum, 0);
  const todayKey = dayKeyAt(new Date().toISOString(), timeZone);
  const visible = calendar && selectedDay ? filtered.filter((item) => dayKeyAt(item.occurredAt, timeZone) === selectedDay) : filtered;
  const days = groupByDay(visible, timeZone, language);
  const expenseDays = new Set(monthly.filter((item) => item.kind === "expense").map((item) => dayKeyAt(item.occurredAt, timeZone)));
  const incomeDays = new Set(monthly.filter((item) => item.kind === "income").map((item) => dayKeyAt(item.occurredAt, timeZone)));
  const hasActiveFilters = Boolean(query || kind || accountId || categoryId || day || currencyFilter);
  const monthNumber = month ? Number(month.slice(5)) : 0;

  const changeMonth = (offset: number) => {
    setDay("");
    const value = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T12:00:00Z`) : new Date(`${transactionMonthAt(new Date().toISOString(), timeZone)}-01T12:00:00Z`);
    value.setUTCMonth(value.getUTCMonth() + offset);
    setMonth(value.toISOString().slice(0, 7));
    setSelectedDay(null);
  };
  const resetFilters = () => { setDay(""); setCurrencyFilter(""); setKind(""); setAccountId(""); setCategoryId(""); setQuery(""); };
  const emptyTitle = kind === "expense" ? copy("emptyExpense") : kind === "income" ? copy("emptyIncome") : kind === "transfer" ? copy("emptyTransfer") : kind === "refund" ? copy("emptyRefund") : copy("emptyFiltered");
  const initialLoading = loading && transactions.length === 0;

  return (
    <View style={styles.root}>
      <PicketScreen>
        <View style={styles.page}>
          <View style={styles.appBar}>
            <Text accessibilityRole="header" style={styles.title}>{t("Chi tiêu")}</Text>
            <IconButton variant="surface" icon="magnify" expanded={showSearch} label={showSearch ? copy("closeSearch") : copy("search")} onPress={() => setShowSearch(!showSearch)} />
            <IconButton variant="surface" icon="dots-horizontal" expanded={showTools} label={t("Công cụ giao dịch")} onPress={() => setShowTools(!showTools)} />
          </View>

          {showTools && (
            <Surface style={styles.tools}>
              <MenuRow icon="calendar-month-outline" title={homeCopy("receiptCalendarTitle")} onPress={() => router.push(routes.receiptCalendar)} />
              <MenuRow icon="inbox-arrow-down-outline" title={t("Giao dịch cần kiểm tra")} onPress={() => router.push(routes.reviewInbox)} />
              <MenuRow icon="checkbox-multiple-outline" title={t("Chỉnh sửa nhiều giao dịch")} onPress={() => router.push(routes.bulkTransactions)} />
              <MenuRow icon="scale-balance" title={t("Đối soát ví")} onPress={() => router.push(routes.reconcile)} />
            </Surface>
          )}

          {showSearch && (
            <View style={styles.searchBox}>
              <AppIcon name="magnify" size={20} color={colors.muted} />
              <TextInput accessibilityLabel={t("Tìm giao dịch, danh mục hoặc ghi chú")} autoFocus borderless onChangeText={setQuery} placeholder={t("Tìm giao dịch")} placeholderTextColor={colors.muted} style={styles.search} value={query} />
              {query.length > 0 && <IconButton icon="close" label={t("Xóa tìm kiếm")} onPress={() => setQuery("")} />}
              <IconButton icon={showFilters ? "filter-check-outline" : "filter-variant"} label={showFilters ? t("Ẩn bộ lọc") : t("Mở bộ lọc")} onPress={() => setShowFilters(!showFilters)} />
            </View>
          )}

          <View style={styles.monthRow}>
            <MonthSwitcher
              label={month ? copy("monthTitle", { month: monthNumber, year: month.slice(0, 4) }) : copy("allTime")}
              prevLabel={t("Tháng trước")} nextLabel={t("Tháng sau")}
              onPrev={() => changeMonth(-1)} onNext={() => changeMonth(1)}
              onLabel={() => { if (month) { setMonth(""); setDay(""); setCalendar(false); } else changeMonth(0); }}
            />
            <ViewToggle calendar={calendar} listLabel={copy("listView")} calendarLabel={copy("calendarView")}
              onChange={(next) => { if (next && !month) changeMonth(0); setCalendar(next); setSelectedDay(null); }} />
          </View>

          {(day || currencyFilter) && (
            <View style={styles.filters}>
              {day ? <Chip tone="neutral" label={`${homeCopy("filterDay", { day })} ×`} onPress={() => setDay("")} /> : null}
              {currencyFilter ? <Chip tone="neutral" label={`${currencyFilter} ×`} onPress={() => setCurrencyFilter("")} /> : null}
            </View>
          )}

          {initialLoading ? (
            <View style={styles.summary}><View style={{ gap: 6 }}><Skeleton width={90} height={10} /><Skeleton width={130} height={14} /></View><Skeleton width={70} height={10} /></View>
          ) : (
            <View style={styles.summary}>
              <View>
                <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{copy("monthSpent")}</Text>
                <Text style={[figmaType.amountPocket, { fontSize: 20, color: colors.text, letterSpacing: -0.3 }]}>{formatMoney(spent, language, currency)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{copy("income")}</Text>
                <Text style={[figmaType.bodyStrong, { color: colors.income }]}>+{formatMoney(earned, language, currency)}</Text>
              </View>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {KINDS.map(([value, label]) => <Chip key={value} tone={kind === value ? "neutral" : "outline"} label={copy(label)} onPress={() => setKind(value)} />)}
          </ScrollView>

          {showFilters && (
            <Surface style={styles.filterPanel}>
              <Text style={styles.filterLabel}>{t("Ví")}</Text>
              <View style={styles.filters}>
                <ChoiceChip checked={!accountId} label={t("Mọi ví")} onPress={() => setAccountId("")} />
                {accounts.map((item) => <ChoiceChip checked={accountId === item.id} key={item.id} label={item.name} onPress={() => setAccountId(item.id)} />)}
              </View>
              <Text style={styles.filterLabel}>{t("Danh mục")}</Text>
              <View style={styles.filters}>
                <ChoiceChip checked={!categoryId} label={t("Mọi danh mục")} onPress={() => setCategoryId("")} />
                {categories.map((item) => <ChoiceChip checked={categoryId === item.id} key={item.id} label={item.name} onPress={() => setCategoryId(item.id)} />)}
              </View>
              <Text style={styles.filterLabel}>{t("Tháng cụ thể")}</Text>
              <TextInput accessibilityLabel={t("Lọc tháng YYYY-MM")} onChangeText={(value) => { setMonth(value); setDay(""); }} placeholder={t("YYYY-MM hoặc để trống")} placeholderTextColor={colors.muted} style={styles.monthInput} value={month} />
              <Pressable onPress={() => { resetFilters(); setMonth(""); }}><Text style={styles.reset}>{t("Đặt lại bộ lọc")}</Text></Pressable>
            </Surface>
          )}

          {pendingCount > 0 && (
            <Pressable accessibilityState={{ busy: syncing }} onPress={() => void flush()} style={styles.sync}>
              <AppIcon name="cloud-sync-outline" size={18} />
              <Text style={styles.hint}>{syncing ? t("Đang đồng bộ…") : t("pendingChanges", { count: pendingCount })}</Text>
            </Pressable>
          )}

          {error && <ConnectionNotice hasData={transactions.length > 0} onRetry={() => void refresh()} />}

          {calendar && month && !initialLoading && (
            <SpendingCalendar month={month} todayKey={todayKey} selected={selectedDay} expenseDays={expenseDays} incomeDays={incomeDays} onSelect={setSelectedDay} />
          )}

          {initialLoading ? (
            <View accessibilityLabel={copy("loadingTransactions")} accessibilityLiveRegion="polite"><SpendingSkeleton /></View>
          ) : days.length === 0 ? (
            hasActiveFilters || (calendar && selectedDay) ? (
              <SpendingEmpty title={emptyTitle} body={copy("emptyFilteredBody")} tile={<AppIcon name="magnify" size={20} color={colors.text} />} action={{ label: copy("clearFilters"), onPress: () => { resetFilters(); setSelectedDay(null); } }} />
            ) : (
              <SpendingEmpty art title={copy("emptyMonthTitle", { month: monthNumber })} body={copy("emptyMonthBody")} />
            )
          ) : (
            days.map((group) => (
              <DayPaper key={group.key} label={selectedDay ? dayLabel(group.key, language, group.today, false) : group.label} prefix={selectedDay ? copy("viewing") : undefined}
                total={dayTotal(group.rows, accountCurrency, currency)} currency={currency} rows={group.rows} categories={categories} accountNames={accountNames} accountCurrency={accountCurrency}
                onOpen={(id) => router.push(routes.transaction(id))} />
            ))
          )}
        </View>
      </PicketScreen>
      {!initialLoading && <FloatingAction iconOnly label={t("Thêm giao dịch")} onPress={() => router.push(routes.newTransaction)} />}
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    page: { gap: 20, paddingTop: 8 },
    appBar: { flexDirection: "row", alignItems: "center", gap: 10 },
    title: { ...figmaType.display, flex: 1, color: colors.text },
    tools: { paddingVertical: 4 },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.paper, borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: 44 },
    search: { flex: 1, minHeight: 40, borderWidth: 0, backgroundColor: "transparent", color: colors.text, fontSize: 14, paddingHorizontal: 8 },
    monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    summary: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    chips: { gap: 8, paddingRight: 20 },
    filterPanel: { gap: 12 },
    filterLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
    filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    monthInput: { color: colors.text, backgroundColor: colors.canvas, minHeight: paperControl.height, borderRadius: paperShape.input, paddingHorizontal: 16 },
    reset: { color: colors.primary, fontWeight: "700", paddingVertical: 10 },
    sync: { flexDirection: "row", gap: 8, alignItems: "center" },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  });
