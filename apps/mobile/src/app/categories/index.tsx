import { PaperArt } from "@/core/ui/paper-art";
import { categoryArt } from "@/core/theme/category-art";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { EmptyState, PicketScreen } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function CategoriesScreen() {
  const tx = useManagementCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { categories } = useTransactions();
  const { width } = useWindowDimensions();

  if (!session && !localMode) return <Redirect href={routes.login} />;

  // Calculate 3-column width dynamically: 20px screen padding on each side (40) + 10px gap between 3 items (20)
  const availableWidth = Math.min(width, 720) - 40;
  const itemWidth = Math.floor((availableWidth - 20) / 3);

  return (
    <PicketScreen>
      {/* Header with back button & clean title, no cluttered top-right buttons */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <AppIcon name="arrow-left" color={colors.ink} size={24} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
          {tx("Quản lý danh mục & Icon 3D")}
        </Text>
      </View>

      <Text style={styles.headerSubtitle}>{tx("Tất cả danh mục đi kèm tài sản 3D Paper Art")}</Text>

      {categories.length === 0 ? (
        <EmptyState
          action={tx("Tạo danh mục")}
          description={tx("Thêm danh mục đầu tiên để phân loại giao dịch.")}
          onAction={() => router.push(routes.newCategory)}
          symbol="◌"
          title={tx("Chưa có danh mục")}
        />
      ) : (
        <View style={styles.gridContainer}>
          {categories.map((category) => (
            <Pressable
              accessibilityHint={
                category.custom ? tx("Mở để chỉnh sửa") : tx("Danh mục mặc định không thể chỉnh sửa")
              }
              accessibilityRole="button"
              disabled={!category.custom}
              key={category.id}
              onPress={() => router.push(routes.category(category.id))}
              style={[styles.categoryCard, { width: itemWidth }]}
            >
              <View style={styles.artBox}>
                <PaperArt
                  id={categoryArt(category.icon, category.name)}
                  style={{ width: 44, height: 44 }}
                />
              </View>
              <Text numberOfLines={2} style={styles.categoryName}>
                {category.name}
              </Text>
            </Pressable>
          ))}

          {/* In-Grid Add Category Tile */}
          <Pressable
            accessibilityLabel={tx("Thêm danh mục")}
            accessibilityRole="button"
            onPress={() => router.push(routes.newCategory)}
            style={[styles.categoryCard, styles.addCategoryCard, { width: itemWidth }]}
          >
            <View style={styles.addCategoryIconBox}>
              <AppIcon name="plus" color={colors.mauve} size={24} />
            </View>
            <Text numberOfLines={2} style={styles.addCategoryText}>
              {tx("+ Thêm")}
            </Text>
          </Pressable>
        </View>
      )}

      {categories.length > 0 && (
        <View style={styles.bottomActionBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.newCategory)}
            style={styles.bottomAddBtn}
          >
            <AppIcon name="plus" size={18} color={colors.mauve} />
            <Text style={styles.bottomAddText}>{tx("Thêm danh mục")}</Text>
          </Pressable>
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
      marginTop: 4,
      marginBottom: 4,
      gap: 8,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
      flex: 1,
    },
    headerSubtitle: {
      color: colors.muted,
      fontSize: 13,
      marginBottom: 16,
      marginTop: 2,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      paddingBottom: 20,
    },
    categoryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      overflow: "hidden",
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 104,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    artBox: {
      alignItems: "center",
      justifyContent: "center",
      height: 48,
    },
    categoryName: {
      color: colors.ink,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 6,
      lineHeight: 16,
    },
    addCategoryCard: {
      borderStyle: "dashed",
      borderColor: colors.mauve,
      backgroundColor: colors.pocketLilac,
    },
    addCategoryIconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    addCategoryText: {
      color: colors.mauve,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 6,
      lineHeight: 16,
    },
    bottomActionBar: {
      marginTop: 16,
      marginBottom: 32,
      alignItems: "center",
    },
    bottomAddBtn: {
      minHeight: 42,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 21,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.mauve,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    bottomAddText: {
      color: colors.mauve,
      fontSize: 14,
      fontWeight: "700",
    },
  });
