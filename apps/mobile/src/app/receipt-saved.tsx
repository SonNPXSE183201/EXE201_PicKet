import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { figmaType } from "@picket/design-tokens";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { receiptHome } from "@/core/ui/receipt-flow-policy";
import { AppIcon } from "@/core/ui/app-icon";
import { FigmaButton, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { PicketScreen } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";

export default function ReceiptSavedScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { receiptId, transactionId, month = "" } = useLocalSearchParams<{ receiptId?: string; transactionId?: string; month?: string }>();
  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (!transactionId) return <Redirect href={routes.home} />;
  return <PicketScreen>
    <View style={styles.header}><Text accessibilityRole="header" style={[figmaType.titleSection, { color: colors.text }]}>Chụp hoá đơn</Text></View>
    <View style={styles.content}>
      <View style={styles.art} accessible={false}>
        <View style={[styles.stub, figmaShadow("stub")]}>
          <ReceiptEdge direction="top" />
          <View style={styles.stubPaper}>
            <View style={styles.stubLine} /><View style={[styles.stubLine, { width: 60, backgroundColor: colors.expense }]} />
          </View>
        </View>
        <View style={styles.pouch}><View style={styles.pouchStitch} /></View>
        <View style={styles.check}><AppIcon name="check" size={28} color={colors.onPrimary} /></View>
      </View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[figmaType.display, styles.center, { color: colors.text }]}>Đã cất vào túi!</Text>
        <Text style={[figmaType.bodySmall, styles.center, { color: colors.muted }]}>Giao dịch và ảnh hóa đơn đã được lưu{localMode ? " trên thiết bị" : " vào tài khoản"}. Bạn có thể xem lại ảnh trong lịch hóa đơn.</Text>
      </View>
    </View>
    <View style={styles.actions}>
      <FigmaButton fullWidth label="Xem giao dịch" onPress={() => router.replace(localMode ? routes.transaction(transactionId) : receiptId ? routes.receipt(receiptId) : routes.transaction(transactionId))} />
      <FigmaButton fullWidth variant="outline" icon="camera-outline" label="Quét tiếp" onPress={() => router.replace(routes.capture)} />
      <FigmaButton variant="text" size="medium" label="Về màn hình chính" onPress={() => router.dismissTo(receiptHome(month))} />
    </View>
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  header: { minHeight: 44, justifyContent: "center", paddingTop: 16 },
  content: { flex: 1, justifyContent: "center", gap: 12, minHeight: 360 },
  art: { height: 200, width: 320, maxWidth: "100%", alignSelf: "center" },
  stub: { position: "absolute", top: 6, left: 87, width: 178, transform: [{ rotate: "-5deg" }] },
  stubPaper: { backgroundColor: colors.paper, height: 70, paddingHorizontal: 12, paddingTop: 8, gap: 6 },
  stubLine: { width: 110, height: 8, borderRadius: 4, backgroundColor: colors.border },
  pouch: { position: "absolute", top: 80, left: 50, width: 220, height: 120, backgroundColor: colors.camera, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderBottomLeftRadius: 14 },
  pouchStitch: { position: "absolute", top: 7, left: 7, width: 206, height: 106, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.onCamera, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomRightRadius: 22, borderBottomLeftRadius: 9 },
  check: { position: "absolute", top: 60, left: 238, width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: colors.canvas, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  copy: { gap: 6, alignItems: "stretch", marginTop: 12 },
  center: { textAlign: "center" },
  actions: { gap: 12, alignItems: "stretch", paddingBottom: 12 },
});
