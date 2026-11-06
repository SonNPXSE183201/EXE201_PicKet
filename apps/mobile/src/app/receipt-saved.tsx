import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { receiptHome } from "@/core/ui/receipt-flow-policy";
import { AppIcon } from "@/core/ui/app-icon";
import { PicketScreen, PrimaryAction, TopAppBar } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";

export default function ReceiptSavedScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { receiptId, transactionId, month = "" } = useLocalSearchParams<{ receiptId?: string; transactionId?: string; month?: string }>();
  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (!transactionId) return <Redirect href={routes.home} />;
  return <PicketScreen><TopAppBar title="Hoàn tất" back={false} /><View style={styles.content}>
    <AppIcon name="check-circle-outline" size={64} color={colors.income} />
    <Text accessibilityRole="header" style={styles.title}>Đã lưu hóa đơn</Text>
    <Text style={styles.copy}>Giao dịch và ảnh hóa đơn đã được lưu{localMode ? " trên thiết bị" : " vào tài khoản"}. Bạn có thể xem lại ảnh trong lịch hóa đơn.</Text>
    <PrimaryAction label="Về màn hình chính" onPress={() => router.dismissTo(receiptHome(month))} />
    <PrimaryAction label="Xem hóa đơn" onPress={() => router.replace(localMode ? routes.transaction(transactionId) : receiptId ? routes.receipt(receiptId) : routes.transaction(transactionId))} />
  </View></PicketScreen>;
}
const createStyles = (colors: MobileThemeColors) => StyleSheet.create({ content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 20, paddingVertical: 36 }, title: { color: colors.ink, fontSize: 28, fontWeight: "700" }, copy: { color: colors.muted, fontSize: 16, lineHeight: 24 } });
