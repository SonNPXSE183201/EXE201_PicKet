import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape } from "@/core/theme/paper-foundations";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { colorSchemes, colorSchemeIds } from "@/core/theme/color-schemes";
import { useAppTheme, useThemedStyles } from "./appearance-provider";
import type { ThemeMode } from "./device-settings";
import type { AppTheme } from "@/core/theme/themes";
import { formatMoney } from "@/core/i18n/formatters";

export function AppearanceScreen() {
  const { colors: c, theme, language, themeMode, colorSchemeId, update, ready, error, retry, saving } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const vi = language === "vi";
  const [failed, setFailed] = useState(false);
  const selecting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const disabled = !ready || error || saving;
  async function select(patch: { colorSchemeId?: string; themeMode?: ThemeMode }) {
    if (disabled || selecting.current) return;
    selecting.current = true;
    setFailed(false);
    try { await update(patch); } catch { if (mounted.current) setFailed(true); }
    finally { selecting.current = false; }
  }
  return <PicketScreen>
    <TopAppBar title={vi ? "Giao diện" : "Appearance"} />
    {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={{ color: c.danger }}>{vi ? "Chưa đọc được tùy chọn giao diện." : "Appearance settings could not be loaded."}</Text><Pressable onPress={retry} accessibilityRole="button" style={styles.retry}><Text style={{ color: c.link }}>{vi ? "Thử lại" : "Retry"}</Text></Pressable></View>}
    <Text accessibilityRole="header" style={styles.heading}>{vi ? "Chế độ hiển thị" : "Display mode"}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={vi ? "Chế độ hiển thị" : "Display mode"} style={styles.modes}>
      {(["system", "light", "dark"] as const).map(mode => {
        const active = themeMode === mode;
        const label = mode === "system" ? (vi ? "Theo hệ thống" : "System") : mode === "light" ? (vi ? "Sáng" : "Light") : (vi ? "Tối" : "Dark");
        return <Pressable key={mode} disabled={disabled} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: active, disabled }} onPress={() => void select({ themeMode: mode })} style={[styles.mode, active && styles.selected]}>
          <AppIcon name={active ? "check-circle-outline" : "circle-outline"} color={active ? c.selectedText : c.muted} size={20} /><Text style={[styles.modeText, active && { color: c.selectedText }]}>{label}</Text>
        </Pressable>;
      })}
    </View>
    <Text accessibilityRole="header" style={styles.heading}>{vi ? "Bảng màu" : "Color palette"}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={vi ? "Bảng màu" : "Color palette"} style={styles.palettes}>
      {colorSchemeIds.map(id => {
        const palette = colorSchemes[id][theme], active = colorSchemeId === id;
        return <Pressable key={id} disabled={disabled} accessibilityRole="radio" accessibilityLabel={colorSchemes[id].name} accessibilityState={{ checked: active, disabled }} onPress={() => void select({ colorSchemeId: id })} style={[styles.palette, active && styles.selected]}>
          <View pointerEvents="none" accessible={false} style={[styles.sample, { backgroundColor: palette.canvas, borderColor: palette.controlBorder }]}>
            <View style={[styles.sampleCard, { backgroundColor: palette.surface, borderColor: palette.border }]}><View style={[styles.sampleLine, { backgroundColor: palette.text }]} /><View style={[styles.sampleButton, { backgroundColor: palette.primary }]} /></View>
            <View style={styles.swatches}>{[palette.income, palette.expense, palette.link].map((color, i) => <View key={i} style={[styles.swatch, { backgroundColor: color }]} />)}</View>
          </View>
          <View style={styles.paletteLabel}><Text style={styles.name}>{colorSchemes[id].name}</Text>{active && <AppIcon name="check-circle-outline" color={c.selectedText} size={20} />}</View>
          <Text style={styles.caption}>{active ? (vi ? "Đang dùng" : "Selected") : (vi ? "Chọn bảng màu" : "Select palette")}</Text>
        </Pressable>;
      })}
    </View>
    <View accessibilityLiveRegion="polite">{saving && <ActivityIndicator color={c.link} accessibilityLabel={vi ? "Đang lưu giao diện" : "Saving appearance"} />}{failed && <Text accessibilityRole="alert" style={{ color: c.danger }}>{vi ? "Chưa lưu được giao diện. Chọn lại để thử." : "Appearance was not saved. Select again to retry."}</Text>}</View>
    <Text accessibilityRole="header" style={styles.heading}>{vi ? "Xem trước · Dữ liệu minh họa" : "Preview · Sample data"}</Text>
    <View style={styles.preview}>
      <Text style={styles.caption}>{vi ? "Tổng số dư" : "Total balance"}</Text><Text style={styles.amount}>{formatMoney(12450000, language, "VND")}</Text>
      <View style={styles.previewRow}><Text style={{ color: c.income }}>{vi ? "Thu nhập" : "Income"}</Text><Text style={{ color: c.income }}>+{formatMoney(18000000, language, "VND")}</Text></View>
      <View style={styles.previewRow}><Text style={{ color: c.expense }}>{vi ? "Chi tiêu" : "Expense"}</Text><Text style={{ color: c.expense }}>−{formatMoney(5550000, language, "VND")}</Text></View>
      <View style={styles.sampleAction}><AppIcon name="line-scan" color={c.onPrimary} size={20} /><Text style={{ color: c.onPrimary, fontWeight: "700" }}>{vi ? "Quét hóa đơn" : "Scan receipt"}</Text></View>
      <View style={styles.warning}><AppIcon name="alert-circle-outline" color={c.warning} size={18} /><Text style={{ color: c.warning, flex: 1 }}>{vi ? "Có thông tin cần kiểm tra." : "Some details need review."}</Text></View>
    </View>
  </PicketScreen>;
}
const createStyles = (c: AppTheme) => StyleSheet.create({
  heading: { color: c.text, fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  modes: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mode: { minHeight: 48, padding: 12, borderRadius: paperShape.chip, borderWidth: 1, borderColor: c.controlBorder, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface },
  modeText: { color: c.text, fontSize: 14, flexShrink: 1 },
  selected: { backgroundColor: c.selectedSurface, borderColor: c.primaryOutline, borderWidth: 2 },
  palettes: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  palette: { flexGrow: 1, flexBasis: 140, borderWidth: 1, borderColor: c.controlBorder, backgroundColor: c.surface, borderRadius: 18, padding: 14, gap: 8 },
  sample: { borderRadius: paperShape.card, borderWidth: 1, padding: 12, gap: 10 },
  sampleCard: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 10 },
  sampleLine: { width: "65%", height: 6, borderRadius: 3 }, sampleButton: { width: "85%", height: 18, borderRadius: 6 },
  swatches: { flexDirection: "row", gap: 8 }, swatch: { width: 12, height: 12, borderRadius: 6 },
  paletteLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, name: { color: c.text, fontSize: 16, fontWeight: "700" },
  caption: { color: c.muted, fontSize: 13, lineHeight: 20 },
  preview: { padding: 20, borderRadius: paperShape.card, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 16 },
  amount: { color: c.text, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  previewRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  sampleAction: { borderRadius: paperShape.button, padding: 14, backgroundColor: c.primary, borderColor: c.primaryOutline, borderWidth: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  warning: { backgroundColor: c.warningSurface, padding: 12, borderRadius: 12, flexDirection: "row", gap: 8 },
  errorBox: { backgroundColor: c.dangerSurface, borderRadius: 12, padding: 14 }, retry: { minHeight: 52, justifyContent: "center" },
});
