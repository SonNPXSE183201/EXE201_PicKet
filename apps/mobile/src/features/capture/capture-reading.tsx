import { figmaType } from "@picket/design-tokens";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { FigmaButton, ReceiptEdge } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { IconButton } from "@/core/ui/picket-ui";
import { PicketText as Text } from "@/core/ui/picket-text";

const widths = [110, 180, 150, 190, 120, 170, 140];

/** Figma D2 "Đang đọc hoá đơn": tilted paper with a scan beam while OCR runs. */
export function CaptureReading({ onCancel, statusLabel = "Đang đọc hóa đơn…" }: { onCancel(): void; statusLabel?: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View accessibilityLiveRegion="polite" style={styles.header}>
        <IconButton icon="arrow-left" label="Quay lại" variant="surface" onPress={onCancel} />
        <Text accessibilityRole="header" style={[figmaType.titleSection, styles.headerTitle]}>Đang đọc hoá đơn</Text>
      </View>
      <View style={styles.center}>
        <View style={styles.scan} accessibilityLabel={statusLabel}>
          <View style={styles.paperWrap}>
            <View style={styles.paper}>
              {widths.map((width, index) => <View key={index} style={[styles.line, { width }]} />)}
              <View style={styles.totalRow}>
                <View style={[styles.pill, { width: 70, backgroundColor: colors.border }]} />
                <View style={[styles.pill, { width: 56, backgroundColor: colors.pocketCoral }]} />
              </View>
            </View>
            <ReceiptEdge direction="bottom" />
          </View>
          <View style={styles.beam} />
          <View style={styles.status}>
            <AppIcon name="shimmer" size={14} color={colors.onCamera} />
            <Text style={[figmaType.captionStrong, { color: colors.onCamera }]}>Đang tìm tổng tiền…</Text>
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={[figmaType.display, styles.title]}>Picket đang đọc hoá đơn</Text>
          <Text style={[figmaType.bodySmall, styles.body]}>Thường mất vài giây. Đọc trên máy nên không cần mạng.</Text>
        </View>
      </View>
      <View style={styles.footer}><FigmaButton label="Huỷ và nhập tay" variant="text" size="medium" onPress={onCancel} /></View>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 20, paddingTop: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { flex: 1, color: colors.text },
  center: { flex: 1, justifyContent: "center", gap: 20 },
  scan: { height: 330, alignSelf: "stretch" },
  paperWrap: { position: "absolute", top: 10, alignSelf: "center", width: 240, transform: [{ rotate: "2deg" }], boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 5, color: "#30213312" }] },
  paper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  line: { height: 8, borderRadius: 4, backgroundColor: colors.elevated },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  pill: { height: 12, borderRadius: 6 },
  beam: { position: "absolute", top: 118, left: 20, right: 20, height: 4, borderRadius: 2, backgroundColor: colors.primary, boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 14, spreadDistance: 2, color: "#78336973" }] },
  status: { position: "absolute", right: 10, bottom: 8, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.camera, transform: [{ rotate: "-3deg" }] },
  copy: { alignItems: "center", gap: 6 },
  title: { color: colors.text, textAlign: "center" },
  body: { color: colors.muted, textAlign: "center" },
  footer: { alignItems: "center", paddingBottom: 24 },
});
