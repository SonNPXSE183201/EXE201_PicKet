import { PicketText as Text } from "@/core/ui/picket-text";
import { useTranslation } from "react-i18next";
import { formatMoney, localeFor, normalizeLanguage } from "@/core/i18n/formatters";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, EmptyState, PicketScreen } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";

export default function BillsScreen() {
  const { t, i18n } = useTranslation("bills");
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { bills, error, loading, refresh } = useBills();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const [renderedAt] = useState(() => Date.now());

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const activeBills = bills.filter((bill) => bill.status !== "cancelled");

  // Calculate unpaid vs paid totals
  const unpaidBills = activeBills.filter(
    (bill) => bill.status === "pending" || bill.status === "overdue",
  );
  const unpaidTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;

  return (
    <PicketScreen>
      {/* Master Design Screen 22 Header */}
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
            Hóa đơn cần thanh toán
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Thêm hóa đơn"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push(routes.newBill)}
          style={styles.addCircleBtn}
        >
          <AppIcon name="plus" color={colors.onPrimary} size={20} />
        </Pressable>
      </View>

      {/* Master Summary Hero Card */}
      <View style={styles.heroSummaryCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroSubLabel}>Cần thanh toán tháng {currentMonthNum}</Text>
          <Text style={styles.heroAmount}>{formatMoney(unpaidTotal, language, "VND")}</Text>
          <Text style={styles.heroCountSub}>
            {unpaidBills.length} hóa đơn sắp đến hạn trong tuần này
          </Text>
        </View>
        <View style={styles.heroArtBox}>
          <PaperArt id="bills" style={{ width: 62, height: 62 }} />
        </View>
      </View>

      {/* Section: HÓA ĐƠN ĐỊNH KỲ THÁNG */}
      <Text style={styles.sectionHeaderLabel}>HÓA ĐƠN ĐỊNH KỲ THÁNG</Text>

      {error ? <ConnectionNotice hasData={bills.length > 0} onRetry={() => void refresh()} /> : null}
      {loading ? <ActivityIndicator accessibilityLabel={t("loading")} color={colors.link} style={{ marginVertical: 20 }} /> : null}

      {!loading && activeBills.length === 0 ? (
        <EmptyState
          illustration="receipt"
          action={t("emptyAction")}
          description={t("emptyDescription")}
          onAction={() => router.push(routes.newBill)}
          symbol="▤"
          title={t("emptyTitle")}
        />
      ) : null}

      {activeBills.length > 0 ? (
        <View style={styles.billsList}>
          {activeBills.map((bill) => {
            const overdue =
              bill.status === "overdue" ||
              (bill.status === "pending" && new Date(bill.dueAt).getTime() < renderedAt);
            const isUnpaid = bill.status === "pending" || overdue;

            return (
              <Pressable
                accessibilityRole="button"
                key={bill.id}
                onPress={() => router.push(routes.bill(bill.id))}
                style={[styles.billCard, isUnpaid && styles.unpaidBillCard]}
              >
                <View style={[styles.billIconContainer, isUnpaid && styles.unpaidIconContainer]}>
                  <PaperArt id="bills" style={{ width: 34, height: 34 }} />
                </View>

                <View style={styles.billBody}>
                  <Text style={styles.billTitle}>{bill.title}</Text>
                  <Text style={[styles.billDate, overdue && styles.overdueDate]}>
                    {isUnpaid
                      ? `Hạn nộp: ${new Date(bill.dueAt).toLocaleDateString(localeFor(language))}`
                      : `Đã thanh toán ngày ${new Date(bill.dueAt).toLocaleDateString(localeFor(language))}`}
                  </Text>
                </View>

                <View style={styles.billRightCol}>
                  <Text style={[styles.billAmount, isUnpaid ? styles.unpaidAmount : styles.paidAmount]}>
                    {isUnpaid ? `-${formatMoney(bill.amount, language, "VND")}` : formatMoney(bill.amount, language, "VND")}
                  </Text>
                  {isUnpaid && (
                    <View style={styles.payNowBadge}>
                      <Text style={styles.payNowText}>Nộp ngay</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
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
    heroSummaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    heroCopy: {
      flex: 1,
    },
    heroSubLabel: {
      color: colors.muted,
      fontSize: 13,
    },
    heroAmount: {
      color: colors.expense,
      fontSize: 28,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginVertical: 4,
    },
    heroCountSub: {
      color: colors.expense,
      fontSize: 12,
      fontWeight: "600",
    },
    heroArtBox: {
      marginLeft: 10,
    },
    sectionHeaderLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 12,
      textTransform: "uppercase",
    },
    billsList: {
      gap: 10,
      paddingBottom: 40,
    },
    billCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    unpaidBillCard: {
      borderColor: colors.mauve,
    },
    billIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.cream,
      alignItems: "center",
      justifyContent: "center",
    },
    unpaidIconContainer: {
      backgroundColor: colors.pocketLilac,
    },
    billBody: {
      flex: 1,
    },
    billTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
    },
    billDate: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    overdueDate: {
      color: colors.expense,
      fontWeight: "700",
    },
    billRightCol: {
      alignItems: "flex-end",
      gap: 4,
    },
    billAmount: {
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    unpaidAmount: {
      color: colors.expense,
    },
    paidAmount: {
      color: "#16A34A",
    },
    payNowBadge: {
      backgroundColor: colors.mauve,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    payNowText: {
      color: colors.onPrimary,
      fontSize: 11,
      fontWeight: "700",
    },
  });
