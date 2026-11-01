import { PicketText as Text } from "@/core/ui/picket-text";
import { formatMoney, normalizeLanguage } from "@/core/i18n/formatters";
import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, EmptyState, PicketScreen } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { partitionSubscriptions } from "@/features/subscriptions/subscription-list";

export default function SubscriptionsScreen() {
  const { t, i18n } = useTranslation("subscriptions");
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { subscriptions, loading, error, refresh } = useSubscriptions();

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const { active, paused } = partitionSubscriptions(subscriptions);

  // Total monthly subscriptions
  const monthlyTotal = active.reduce((sum, item) => {
    if (item.cadence === "yearly") return sum + Math.round(item.amount / 12);
    if (item.cadence === "weekly") return sum + item.amount * 4;
    return sum + item.amount;
  }, 0);

  function pickSubIcon(title: string) {
    const lower = title.toLowerCase();
    if (lower.includes("netflix") || lower.includes("youtube") || lower.includes("film") || lower.includes("phim")) {
      return "leisure";
    }
    if (lower.includes("spotify") || lower.includes("apple music") || lower.includes("nhạc")) {
      return "music";
    }
    if (lower.includes("icloud") || lower.includes("google") || lower.includes("storage")) {
      return "security";
    }
    return categoryArt(null, title);
  }

  const renderSubscription = (item: (typeof subscriptions)[number]) => {
    const dueDay = new Date(item.nextDueAt).getDate();
    return (
      <Pressable
        accessibilityRole="button"
        key={item.id}
        onPress={() => router.push(routes.subscription(item.id))}
        style={styles.subCard}
      >
        <View style={styles.subIconContainer}>
          <PaperArt id={pickSubIcon(item.title)} style={{ width: 34, height: 34 }} />
        </View>
        <View style={styles.subBody}>
          <Text style={styles.subTitle}>{item.title}</Text>
          <Text style={styles.subCadence}>
            Gia hạn ngày {dueDay} hàng tháng
          </Text>
        </View>
        <Text style={styles.subAmount}>-{formatMoney(item.amount, language, "VND")}</Text>
      </Pressable>
    );
  };

  return (
    <PicketScreen>
      {/* Master Design Screen 23 Header */}
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
            Chi phí định kỳ &amp; Thuê bao
          </Text>
        </View>
        {(active.length > 0 || paused.length > 0) && (
          <Pressable
            accessibilityLabel="Thêm thuê bao"
            accessibilityRole="button"
            onPress={() => router.push(routes.newSubscription)}
            style={styles.addCircleTouch}
          >
            <View style={styles.addCircleBtn}>
              <AppIcon name="plus" color={colors.onPrimary} size={18} />
            </View>
          </Pressable>
        )}
      </View>

      {/* Master Summary Hero Card */}
      <View style={styles.heroSummaryCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroSubLabel}>Tổng chi tiêu thuê bao mỗi tháng</Text>
          <Text style={styles.heroAmount}>
            {formatMoney(monthlyTotal, language, "VND")} / tháng
          </Text>
          <Text style={styles.heroCountSub}>
            {active.length} dịch vụ số đang hoạt động · Tự động trừ tiền
          </Text>
        </View>
        <View style={styles.heroArtBox}>
          <PaperArt id="music" style={{ width: 62, height: 62 }} />
        </View>
      </View>

      {/* Section: DANH SÁCH THUÊ BAO ĐANG CHẠY */}
      <Text style={styles.sectionHeaderLabel}>DANH SÁCH THUÊ BAO ĐANG CHẠY</Text>

      {error ? <ConnectionNotice hasData={subscriptions.length > 0} onRetry={() => void refresh()} /> : null}
      {loading ? <ActivityIndicator accessibilityLabel={t("loading")} color={colors.link} style={{ marginVertical: 20 }} /> : null}

      {!loading && active.length === 0 && paused.length === 0 ? (
        <EmptyState
          action={t("emptyAction")}
          description={t("emptyDescription")}
          onAction={() => router.push(routes.newSubscription)}
          symbol="↻"
          title={t("emptyTitle")}
        />
      ) : null}

      {active.length > 0 && <View style={styles.subsList}>{active.map(renderSubscription)}</View>}

      {paused.length > 0 && (
        <>
          <Text style={[styles.sectionHeaderLabel, { marginTop: 18 }]}>TẠM DỪNG</Text>
          <View style={styles.subsList}>{paused.map(renderSubscription)}</View>
        </>
      )}
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
    addCircleTouch: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    addCircleBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
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
      color: colors.ink,
      fontSize: 26,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginVertical: 4,
    },
    heroCountSub: {
      color: colors.mauve,
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
    subsList: {
      gap: 10,
      paddingBottom: 20,
    },
    subCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    subIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
    },
    subBody: {
      flex: 1,
    },
    subTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
    },
    subCadence: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    subAmount: {
      color: colors.expense,
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
  });
