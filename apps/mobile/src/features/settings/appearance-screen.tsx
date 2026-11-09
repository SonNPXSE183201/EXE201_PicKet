import { PicketText as Text } from "@/core/ui/picket-text";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PicketScreen } from "@/core/ui/picket-ui";
import { ReceiptSheet, TransactionRow } from "@/core/ui/figma-ui";
import { FigmaHeader, GroupLabel } from "./settings-figma";
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
  const modeLabels = { system: vi ? "Theo máy" : "System", light: vi ? "Sáng" : "Light", dark: vi ? "Tối" : "Dark" } as const;
  const modeA11y = { system: vi ? "Theo hệ thống" : "System", light: vi ? "Sáng" : "Light", dark: vi ? "Tối" : "Dark" } as const;
  const captions: Record<string, [string, string]> = {
    paper: ["Picket", vi ? "Kem & mận" : "Cream & plum"], nomad: ["Nomad", vi ? "Cát & rêu" : "Sand & moss"],
    rose: ["Rose", vi ? "Hồng & gỗ" : "Pink & wood"], ocean: ["Ocean", vi ? "Sương & biển" : "Mist & sea"],
  };
  return <PicketScreen>
    <FigmaHeader title={vi ? "Giao diện" : "Appearance"} />
    {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={{ color: c.danger }}>{vi ? "Chưa đọc được tùy chọn giao diện." : "Appearance settings could not be loaded."}</Text><Pressable onPress={retry} accessibilityRole="button" style={styles.retry}><Text style={{ color: c.link }}>{vi ? "Thử lại" : "Retry"}</Text></Pressable></View>}
    <View style={styles.section}>
      <GroupLabel>{vi ? "Chế độ" : "Mode"}</GroupLabel>
      <View accessibilityRole="radiogroup" accessibilityLabel={vi ? "Chế độ hiển thị" : "Display mode"} style={styles.segment}>
        {(["light", "dark", "system"] as const).map(mode => {
          const active = themeMode === mode;
          return <Pressable key={mode} disabled={disabled} accessibilityRole="radio" accessibilityLabel={modeA11y[mode]} accessibilityState={{ checked: active, disabled }} onPress={() => void select({ themeMode: mode })} style={[styles.segmentItem, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && { color: c.primary, fontWeight: "800" }]}>{modeLabels[mode]}</Text>
          </Pressable>;
        })}
      </View>
    </View>
    <View style={styles.section}>
      <GroupLabel>{vi ? "Bảng màu giấy" : "Paper palette"}</GroupLabel>
      <View accessibilityRole="radiogroup" accessibilityLabel={vi ? "Bảng màu" : "Color palette"} style={styles.palettes}>
        {colorSchemeIds.map(id => {
          const palette = colorSchemes[id][theme], active = colorSchemeId === id;
          const [shortName, caption] = captions[id] ?? [colorSchemes[id].name, ""];
          return <Pressable key={id} disabled={disabled} accessibilityRole="radio" accessibilityLabel={colorSchemes[id].name} accessibilityState={{ checked: active, disabled }} onPress={() => void select({ colorSchemeId: id })} style={[styles.palette, active && styles.paletteActive]}>
            <View pointerEvents="none" accessible={false} style={[styles.sample, { backgroundColor: palette.canvas }]}>
              <View style={[styles.sampleBar, { backgroundColor: palette.primary }]} />
              <View style={styles.swatches}><View style={[styles.swatch, { backgroundColor: palette.pocketCoral }]} /><View style={[styles.swatch, { backgroundColor: palette.pocketMint }]} /></View>
            </View>
            <View style={styles.paletteLabel}>
              <View style={{ flex: 1 }}><Text style={styles.name}>{shortName}</Text><Text style={styles.caption}>{caption}</Text></View>
              {active && <View style={[styles.check, { backgroundColor: c.primary }]}><AppIcon name="check" color={c.onPrimary} size={14} /></View>}
            </View>
          </Pressable>;
        })}
      </View>
    </View>
    <View accessibilityLiveRegion="polite">{saving && <ActivityIndicator color={c.link} accessibilityLabel={vi ? "Đang lưu giao diện" : "Saving appearance"} />}{failed && <Text accessibilityRole="alert" style={{ color: c.danger }}>{vi ? "Chưa lưu được giao diện. Hãy thử lại." : "Appearance could not be saved. Try again."}</Text>}</View>
    <View style={styles.section}>
      <GroupLabel>{vi ? "Xem trước" : "Preview"}</GroupLabel>
      <ReceiptSheet style={{ gap: 12, padding: 16 }}>
        <TransactionRow tile={<AppIcon name="silverware-fork-knife" size={20} color={c.text} />} tileColor={c.pocketCoral} title={vi ? "Bữa trưa cùng nhóm" : "Team lunch"} meta={vi ? "Ăn uống · Ví hằng ngày" : "Food · Daily wallet"} amount={`−${formatMoney(85000, language, "VND")}`} amountColor={c.expense} />
        <TransactionRow tile={<AppIcon name="cash" size={20} color={c.text} />} tileColor={c.pocketMint} title={vi ? "Lương tháng 10" : "October salary"} meta={vi ? "Lương · Tiết kiệm" : "Salary · Savings"} amount={`+${formatMoney(12000000, language, "VND")}`} amountColor={c.income} />
      </ReceiptSheet>
    </View>
  </PicketScreen>;
}
const createStyles = (c: AppTheme) => StyleSheet.create({
  section: { gap: 10, marginTop: 24 },
  segment: { flexDirection: "row", backgroundColor: c.elevated, borderRadius: 999, padding: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: "#FFFFFF", boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 6, color: "#3021331f" }] },
  segmentText: { color: c.muted, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  palettes: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  palette: { width: "47.5%", flexGrow: 1, borderWidth: 1, borderColor: c.border, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12, gap: 12 },
  paletteActive: { borderWidth: 2, borderColor: c.primary },
  sample: { borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 8, height: 72 },
  sampleBar: { flex: 1, height: 44, borderRadius: 14 },
  swatches: { gap: 6 }, swatch: { width: 22, height: 22, borderRadius: 11 },
  paletteLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: c.text, fontSize: 14, fontWeight: "800", lineHeight: 21 },
  caption: { color: c.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  errorBox: { backgroundColor: c.dangerSurface, borderRadius: 12, padding: 14 }, retry: { minHeight: 52, justifyContent: "center" },
});
