import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatVnd } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { EmptyState, PicketScreen } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useSpendingSplits } from "@/features/transactions/use-spending-splits";
import { categorySpending } from "@/core/ui/category-spending";

export default function InsightsScreen() {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { profile } = useProfile();
  const { categories } = useTransactions();
  const { error, refresh, transactions } = useTransactionHistory();
  const [monthOffset, setMonthOffset] = useState(0);

  const month = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const selectedMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const { splits, loading: splitLoading, error: splitError } = useSpendingSplits(transactions, selectedMonth);

  const summary = useMemo(() => {
    const selected = transactions.filter((item) => {
      const date = new Date(item.occurredAt);
      return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
    });
    const income = selected.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = selected.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
    const refunds = selected.filter((item) => item.kind === "refund").reduce((sum, item) => sum + item.amount, 0);
    const categoryMap = new Map(categories.map((item) => [item.id, item]));
    const breakdown = categorySpending(transactions, selectedMonth, splits).map(({ id, amount }) => {
      const cat = categoryMap.get(id);
      return {
        id,
        amount,
        name: cat?.name ?? t("Chưa phân loại"),
        icon: cat?.icon ?? null,
      };
    });
    return { income, expense: Math.max(0, expense - refunds), breakdown };
  }, [categories, month, transactions, selectedMonth, splits, t]);

  if (!session && !localMode) return <Redirect href={routes.login} />;

  // Progress bar colors corresponding to Master Design Screen 25
  const barColors = [colors.mauve, "#F87171", "#60A5FA", "#34D399", "#FBBF24", "#A78BFA"];

  // Format short total for donut center
  function formatShortM(amount: number) {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `${Math.round(amount / 1_000)}k`;
    }
    return String(amount);
  }

  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);

  return (
    <PicketScreen>
      {/* Master Design Screen 25 Header */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <AppIcon name="arrow-left" color={colors.ink} size={24} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {t("Phân tích tài chính")}
        </Text>
      </View>

      {/* Month Pills: e.g. Tháng 10 / Tháng 09 */}
      <View style={styles.monthPillsRow}>
        <Pressable
          onPress={() => setMonthOffset(0)}
          style={[styles.monthPill, monthOffset === 0 && styles.monthPillActive]}
        >
          <Text style={[styles.monthPillText, monthOffset === 0 && styles.monthPillTextActive]}>
            {t("Tháng {{month}}", { month: month.getMonth() + 1 })}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMonthOffset(-1)}
          style={[styles.monthPill, monthOffset === -1 && styles.monthPillActive]}
        >
          <Text style={[styles.monthPillText, monthOffset === -1 && styles.monthPillTextActive]}>
            {t("Tháng {{month}}", { month: prevMonth.getMonth() + 1 })}
          </Text>
        </Pressable>
      </View>

      {error && (
        <Pressable accessibilityRole="button" onPress={() => void refresh()}>
          <Text accessibilityLiveRegion="polite" style={styles.warning}>
            {t("{{error}} Chạm để tải lại.", { error })}
          </Text>
        </Pressable>
      )}

      {/* Master Donut Chart Card */}
      <View style={styles.donutCard}>
        <Text style={styles.donutCardTitle}>{t("Cơ cấu chi tiêu theo nhóm")}</Text>
        <Text style={styles.donutCardSubtitle}>
          {t("Tổng chi tiêu: {{amount}}", { amount: profile?.hideBalance ? "••••••" : formatVnd(summary.expense) })}
        </Text>

        <View style={styles.donutGraphicContainer}>
          <View style={styles.donutRing}>
            <View style={styles.donutInnerHole}>
              <Text style={styles.donutCenterAmount}>
                {profile?.hideBalance ? "••" : formatShortM(summary.expense)}
              </Text>
              <Text style={styles.donutCenterLabel}>{t("đã chi")}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section: DANH MỤC CHI TIÊU HÀNG ĐẦU */}
      <Text style={styles.sectionHeaderLabel}>{t("DANH MỤC CHI TIÊU HÀNG ĐẦU")}</Text>

      {splitError ? (
        <Text accessibilityLiveRegion="polite" style={styles.warning}>{splitError}</Text>
      ) : splitLoading ? null : summary.breakdown.length === 0 ? (
        <EmptyState
          title={t("Chưa có chi tiêu trong tháng")}
          description={t("Phân bổ sẽ xuất hiện khi bạn ghi giao dịch.")}
          symbol="▥"
        />
      ) : (
        <View style={styles.breakdownList}>
          {summary.breakdown.map((item, index) => {
            const percent = summary.expense > 0 ? Math.round((item.amount / summary.expense) * 100) : 0;
            const barColor = barColors[index % barColors.length];
            return (
              <View key={item.id} style={styles.categoryProgressCard}>
                <View style={styles.categoryArtBox}>
                  <PaperArt
                    id={categoryArt(item.icon, item.name)}
                    style={{ width: 36, height: 36 }}
                  />
                </View>
                <View style={styles.categoryCopyCol}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.categoryAmountSub}>
                    {profile?.hideBalance ? "••••••" : formatVnd(item.amount)} ({percent}%)
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(8, percent))}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 4,
      marginBottom: 12,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      color: colors.ink,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    monthPillsRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 4,
      alignSelf: "center",
      width: "100%",
      maxWidth: 240,
      marginBottom: 16,
    },
    monthPill: {
      flex: 1,
      minHeight: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    monthPillActive: {
      backgroundColor: colors.mauve,
    },
    monthPillText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "700",
    },
    monthPillTextActive: {
      color: colors.onPrimary,
    },
    donutCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 22,
      padding: 18,
      marginBottom: 18,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    donutCardTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "800",
      alignSelf: "flex-start",
    },
    donutCardSubtitle: {
      color: colors.muted,
      fontSize: 13,
      alignSelf: "flex-start",
      marginTop: 3,
      marginBottom: 14,
    },
    donutGraphicContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 10,
    },
    donutRing: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 20,
      borderColor: colors.mauve,
      borderTopColor: "#93C5FD",
      borderRightColor: "#6EE7B7",
      borderLeftColor: "#FCA5A5",
      alignItems: "center",
      justifyContent: "center",
    },
    donutInnerHole: {
      width: 86,
      height: 86,
      borderRadius: 43,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    donutCenterAmount: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 22,
    },
    donutCenterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "600",
    },
    sectionHeaderLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    breakdownList: {
      gap: 10,
      paddingBottom: 40,
    },
    categoryProgressCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    categoryArtBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryCopyCol: {
      flex: 1,
    },
    categoryName: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
    },
    categoryAmountSub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    progressBarTrack: {
      width: 90,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cream,
      overflow: "hidden",
    },
    progressBarFill: {
      height: 8,
      borderRadius: 4,
    },
    warning: {
      color: colors.expense,
      fontSize: 13,
      marginVertical: 8,
    },
  });
