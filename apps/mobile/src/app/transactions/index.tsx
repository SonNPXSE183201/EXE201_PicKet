import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";

import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatMoney, localeFor } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useProfile } from "@/features/profile/profile-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { filterTransactions } from "@/core/sync/filter-transactions";
import { AppIcon } from "@/core/ui/app-icon";
import { MonthCalendar } from "@/core/ui/month-calendar";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, ConnectionNotice, FloatingAction, IconButton, MenuRow, PicketScreen, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSync } from "@/features/sync/sync-context";
import { useTransactions } from "@/features/transactions/transactions-context";

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

function TransactionsContent({ params }: { params: TransactionRouteParams }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { t } = useTranslation("transactions");
  const { profile } = useProfile();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(params.kind ?? "");
  const [day, setDay] = useState(params.day ?? "");
  const [currencyFilter, setCurrencyFilter] = useState(params.currency ?? "");
  const { t: homeCopy } = useTranslation("overview");
  const [accountId, setAccountId] = useState(params.accountId ?? "");
  const [categoryId, setCategoryId] = useState(params.categoryId ?? "");
  const [month, setMonth] = useState(params.month ?? "");
  const [showFilters, setShowFilters] = useState(Boolean(params.categoryId || params.accountId));
  const [showTools, setShowTools] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { session, localMode } = useAuth();
  const { accounts } = useAccounts();
  const { categories, error, loading, refresh, transactions } = useTransactions();
  const { flush, lastSyncedAt, pendingCount, syncing } = useSync();

  useEffect(() => {
    if (lastSyncedAt !== null) void refresh();
  }, [lastSyncedAt, refresh]);

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const accountNames = new Map(accounts.map((item) => [item.id, item.name]));
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
  const filtered = filterTransactions(
    transactions,
    {
      query,
      kind,
      accountId,
      categoryId,
      month,
      day,
      currency: currencyFilter,
      timeZone: profile?.timezone ?? "Asia/Ho_Chi_Minh",
    },
    Object.fromEntries(categoryNames),
    Object.fromEntries(accounts.map((account) => [account.id, account.currencyCode])),
  );
  const visible =
    calendar && month && selectedDay
      ? filtered.filter((item) => new Date(item.occurredAt).getDate() === selectedDay)
      : filtered;

  const changeMonth = (offset: number) => {
    setDay("");
    const value = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T12:00:00`) : new Date();
    value.setMonth(value.getMonth() + offset);
    setMonth(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(null);
  };

  const hasActiveFilters = Boolean(query || kind || accountId || categoryId || month || day || currencyFilter);

  return (
    <View style={styles.root}>
      <PicketScreen>
        <TopAppBar
          title={t("Giao dịch")}
          back={false}
          action={
            <View style={{ flexDirection: "row" }}>
              <IconButton
                icon="dots-horizontal"
                expanded={showTools}
                label={t("Công cụ giao dịch")}
                onPress={() => setShowTools(!showTools)}
              />
            </View>
          }
        />

        {(day || currencyFilter) && (
          <View style={styles.filters}>
            {day && (
              <Pressable accessibilityLabel={homeCopy("filterClearDay")} onPress={() => setDay("")}>
                <Text style={styles.periodText}>{homeCopy("filterDay", { day })} ×</Text>
              </Pressable>
            )}
            {currencyFilter && (
              <Pressable accessibilityLabel={currencyFilter} onPress={() => setCurrencyFilter("")}>
                <Text style={styles.periodText}>{currencyFilter} ×</Text>
              </Pressable>
            )}
          </View>
        )}

        {showTools && (
          <Surface style={styles.tools}>
            <MenuRow
              icon="calendar-month-outline"
              title={homeCopy("receiptCalendarTitle")}
              onPress={() => router.push(routes.receiptCalendar)}
            />
            <MenuRow
              icon="inbox-arrow-down-outline"
              title={t("Giao dịch cần kiểm tra")}
              onPress={() => router.push(routes.reviewInbox)}
            />
            <MenuRow
              icon="checkbox-multiple-outline"
              title={t("Chỉnh sửa nhiều giao dịch")}
              onPress={() => router.push(routes.bulkTransactions)}
            />
            <MenuRow
              icon="scale-balance"
              title={t("Đối soát ví")}
              onPress={() => router.push(routes.reconcile)}
            />
          </Surface>
        )}

        {/* Compact Search Bar - Always Visible */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <AppIcon name="magnify" size={20} color={colors.muted} />
            <TextInput
              accessibilityLabel={t("Tìm giao dịch, danh mục hoặc ghi chú")}
              borderless
              onChangeText={setQuery}
              placeholder={t("Tìm giao dịch")}
              placeholderTextColor={colors.muted}
              style={styles.search}
              value={query}
            />
            {query.length > 0 && (
              <IconButton icon="close" label={t("Xóa tìm kiếm")} onPress={() => setQuery("")} />
            )}
            <IconButton
              icon={showFilters ? "filter-check-outline" : "filter-variant"}
              label={showFilters ? t("Ẩn bộ lọc") : t("Mở bộ lọc")}
              onPress={() => setShowFilters(!showFilters)}
            />
          </View>
        </View>

        {/* Compact Horizontal Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[
            ["", "Tất cả"],
            ["expense", "Chi tiêu"],
            ["income", "Thu nhập"],
            ["transfer", "Chuyển ví"],
            ["refund", "Hoàn tiền"],
          ].map(([value, label]) => {
            const active = kind === value;
            return (
              <Pressable
                key={value}
                onPress={() => setKind(value)}
                style={[styles.filterCapsule, active && styles.filterCapsuleActive]}
              >
                <Text style={[styles.filterCapsuleText, active && styles.filterCapsuleTextActive]}>
                  {t(label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Compact Month Capsule Selector - Chevron Icons, NO > or < text */}
        <View style={styles.monthCapsuleRow}>
          <Pressable
            accessibilityLabel={t("Tháng trước")}
            accessibilityRole="button"
            onPress={() => changeMonth(-1)}
            style={styles.monthNavBtn}
          >
            <AppIcon name="chevron-left" size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (month) {
                setMonth("");
                setDay("");
              } else changeMonth(0);
            }}
            style={styles.monthCenterPill}
          >
            <AppIcon name="calendar-month-outline" size={16} color={colors.mauve} />
            <Text style={styles.monthCenterText}>
              {month ? t("monthLabel", { month: month.slice(5), year: month.slice(0, 4) }) : t("Tất cả thời gian")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("Tháng sau")}
            accessibilityRole="button"
            onPress={() => changeMonth(1)}
            style={styles.monthNavBtn}
          >
            <AppIcon name="chevron-right" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {showFilters && (
          <Surface style={styles.filterPanel}>
            <Text style={styles.filterLabel}>{t("Ví")}</Text>
            <View style={styles.filters}>
              <ChoiceChip checked={!accountId} label={t("Mọi ví")} onPress={() => setAccountId("")} />
              {accounts.map((item) => (
                <ChoiceChip checked={accountId === item.id} key={item.id} label={item.name} onPress={() => setAccountId(item.id)} />
              ))}
            </View>
            <Text style={styles.filterLabel}>{t("Danh mục")}</Text>
            <View style={styles.filters}>
              <ChoiceChip checked={!categoryId} label={t("Mọi danh mục")} onPress={() => setCategoryId("")} />
              {categories.map((item) => (
                <ChoiceChip checked={categoryId === item.id} key={item.id} label={item.name} onPress={() => setCategoryId(item.id)} />
              ))}
            </View>
            <Text style={styles.filterLabel}>{t("Tháng cụ thể")}</Text>
            <TextInput
              accessibilityLabel={t("Lọc tháng YYYY-MM")}
              onChangeText={(value) => {
                setMonth(value);
                setDay("");
              }}
              placeholder={t("YYYY-MM hoặc để trống")}
              placeholderTextColor={colors.muted}
              style={styles.monthInput}
              value={month}
            />
            <Pressable
              onPress={() => {
                setDay("");
                setCurrencyFilter("");
                setKind("");
                setAccountId("");
                setCategoryId("");
                setMonth("");
                setQuery("");
              }}
            >
              <Text style={styles.reset}>{t("Đặt lại bộ lọc")}</Text>
            </Pressable>
          </Surface>
        )}

        {pendingCount > 0 && (
          <Pressable accessibilityState={{ busy: syncing }} onPress={() => void flush()} style={styles.sync}>
            <AppIcon name="cloud-sync-outline" size={18} />
            <Text style={styles.hint}>{syncing ? t("Đang đồng bộ…") : t("pendingChanges", { count: pendingCount })}</Text>
          </Pressable>
        )}

        {error && <ConnectionNotice hasData={transactions.length > 0} onRetry={() => void refresh()} />}

        <View style={styles.listHeader}>
          <Text style={styles.transactionCountText}>{t("transactionCount", { count: visible.length })}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <IconButton
              icon={calendar ? "format-list-bulleted" : "calendar-month-outline"}
              label={calendar ? t("Xem danh sách") : t("Xem lịch tháng")}
              onPress={() => {
                if (!month) changeMonth(0);
                setCalendar(!calendar);
                setSelectedDay(null);
              }}
            />
            <IconButton icon="line-scan" label={t("Quét hóa đơn")} onPress={() => router.push(routes.capture)} />
          </View>
        </View>

        {calendar && month && (
          <MonthCalendar
            month={month}
            activeDays={new Set(filtered.map((item) => new Date(item.occurredAt).getDate()))}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
        )}

        {loading && transactions.length === 0 ? (
          <ActivityIndicator accessibilityLabel={t("Đang tải giao dịch")} color={colors.link} style={styles.loader} />
        ) : visible.length === 0 ? (
          /* Redesigned Empty State matching screen_03_transactions_empty_state.png */
          <View style={styles.emptyCard}>
            <View style={styles.emptyMascotBadge}>
              <PaperArt id="empty" style={{ width: 80, height: 80 }} />
            </View>
            <Text style={styles.emptyTitle}>
              {hasActiveFilters ? t("Chưa có giao dịch phù hợp") : t("Chưa có giao dịch nào")}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters
                ? t("Thử thay đổi bộ lọc hoặc xóa điều kiện tìm kiếm để xem lại giao dịch.")
                : t("Bắt đầu theo dõi tài chính cá nhân bằng cách quét hóa đơn hoặc nhập thủ công.")}
            </Text>

            <View style={styles.emptyActionsStack}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(routes.capture)}
                style={[styles.emptyActionPill, styles.emptyPillScan]}
              >
                <AppIcon name="camera-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.emptyScanText}>{t("Quét hóa đơn ngay")}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(routes.newTransaction)}
                style={styles.emptySecondaryBtn}
              >
                <AppIcon name="plus" size={16} color={colors.mauve} />
                <Text style={styles.emptyManualText}>{t("Thêm giao dịch thủ công")}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Redesigned Transaction List matching screen_01_transactions_dense_light.png */
          <View style={styles.transactionList}>
            {visible.map((item) => {
              const artId = categoryArt(
                categories.find((c) => c.id === item.categoryId)?.icon ?? null,
                categoryNames.get(item.categoryId ?? "") || item.title,
              );
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(routes.transaction(item.id))}
                  style={styles.transactionCard}
                >
                  <View style={styles.badge}>
                    <PaperArt id={artId} style={{ width: 28, height: 28 }} />
                  </View>
                  <View style={styles.copy}>
                    <Text numberOfLines={1} style={styles.title}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.hint}>
                      {categoryNames.get(item.categoryId ?? "") ?? t("Chưa phân loại")} · {accountNames.get(item.accountId) ?? t("Tài khoản")}
                    </Text>
                    <Text style={styles.date}>
                      {new Date(item.occurredAt).toLocaleDateString(localeFor(language), {
                        timeZone: profile?.timezone ?? "Asia/Ho_Chi_Minh",
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.amount,
                      {
                        color:
                          item.kind === "expense"
                            ? colors.expense
                            : item.kind === "transfer"
                            ? colors.mauve
                            : colors.income,
                      },
                    ]}
                  >
                    {item.kind === "expense" ? "−" : item.kind === "transfer" ? "" : "+"}
                    {accounts.find((account) => account.id === item.accountId)?.currencyCode
                      ? formatMoney(
                          item.amount,
                          language,
                          accounts.find((account) => account.id === item.accountId)!.currencyCode,
                        )
                      : "—"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </PicketScreen>
      {visible.length > 0 && (
        <FloatingAction iconOnly label={t("Thêm giao dịch")} onPress={() => router.push(routes.newTransaction)} />
      )}
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.cream },
    tools: { paddingVertical: 4, marginBottom: 16 },
    searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      minHeight: 42,
    },
    search: {
      flex: 1,
      minHeight: 40,
      borderWidth: 0,
      backgroundColor: "transparent",
      color: colors.ink,
      fontSize: 14,
      paddingHorizontal: 8,
    },
    chips: { gap: 8, paddingVertical: 6, marginBottom: 6 },
    filterCapsule: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    filterCapsuleActive: {
      backgroundColor: colors.mauve,
      borderColor: colors.mauve,
    },
    filterCapsuleText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "600",
    },
    filterCapsuleTextActive: {
      color: colors.onPrimary,
      fontWeight: "700",
    },
    monthCapsuleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginBottom: 10,
    },
    monthNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    monthCenterPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    monthCenterText: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "700",
    },
    filterPanel: { gap: 12, marginBottom: 16 },
    filterLabel: { color: colors.ink, fontSize: 14, fontWeight: "600" },
    filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    periodText: { color: colors.ink, fontWeight: "600", fontSize: 13 },
    monthInput: {
      color: colors.ink,
      backgroundColor: colors.cream,
      minHeight: paperControl.height,
      borderRadius: paperShape.input,
      paddingHorizontal: 16,
    },
    reset: { color: colors.link, fontWeight: "700", paddingVertical: 10 },
    sync: { flexDirection: "row", gap: 8, alignItems: "center", marginVertical: 4 },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginBottom: 6,
    },
    transactionCountText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    loader: { marginTop: 48 },

    /* Redesigned Empty State matching screen_03 */
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 18,
      paddingHorizontal: 16,
      alignItems: "center",
      marginTop: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    emptyMascotBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    emptyTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 4,
    },
    emptySubtitle: {
      color: colors.muted,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 14,
      paddingHorizontal: 10,
    },
    emptyActionsStack: {
      width: "100%",
      maxWidth: 280,
      gap: 8,
    },
    emptyActionPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
    },
    emptyPillScan: {
      backgroundColor: colors.mauve,
    },
    emptyScanText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    emptySecondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 6,
    },
    emptyManualText: {
      color: colors.mauve,
      fontSize: 14,
      fontWeight: "700",
    },

    /* Redesigned Transaction Items matching screen_01 */
    transactionList: {
      gap: 8,
      paddingBottom: 24,
    },
    transactionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    badge: {
      alignItems: "center",
      backgroundColor: colors.pocketLilac,
      borderRadius: 14,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    copy: { flex: 1, gap: 2 },
    title: { color: colors.ink, fontSize: 14, fontWeight: "600", lineHeight: 20 },
    date: { color: colors.muted, fontSize: 11, lineHeight: 16 },
    amount: { maxWidth: "38%", fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  });
