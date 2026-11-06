import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, View } from "react-native";
import { AccessiblePressable as Pressable } from "./accessible-pressable";

export function MonthCalendar({ month, activeDays, selected, onSelect, thumbnails = {}, receiptMode = false, disabled = false, warningDays = new Set<number>() }: { warningDays?: Set<number>; thumbnails?: Record<number, string>; receiptMode?: boolean; disabled?: boolean; month: string; activeDays: Set<number>; selected: number | null; onSelect(value: number | null): void }) {
  const { t } = useTranslation("calendar");
  const { colors, styles } = useMobileStyles(createStyles);
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return null;
  const offset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, monthNumber, 0).getDate();
  return <View style={styles.container}><View style={styles.week}>{[t("monday"),t("tuesday"),t("wednesday"),t("thursday"),t("friday"),t("saturday"),t("sunday")].map((d) => <Text key={d} style={styles.weekday}>{d}</Text>)}</View><View style={styles.grid}>{Array.from({ length: offset }, (_, i) => <View key={`blank${i}`} style={styles.blank} />)}{Array.from({ length: days }, (_, i) => i + 1).map((day) => <View key={day} style={styles.cell}><Pressable disabled={disabled} accessibilityLabel={`${t("day",{day,month:monthNumber})}${warningDays.has(day) ? t("due") : ""}${activeDays.has(day) ? receiptMode ? t("receipt") : t("transaction") : receiptMode ? t("scan") : ""}`} accessibilityState={{ selected: day === selected }} onPress={() => onSelect(day === selected ? null : day)} style={[styles.day, selected === day && styles.selected]}>{thumbnails[day] && <Image resizeMethod="resize" accessible={false} accessibilityElementsHidden importantForAccessibility="no" source={{ uri: thumbnails[day] }} style={{ position: "absolute", width: 40, height: 44, borderRadius: 10, opacity: 0.24 }} />}<Text style={[styles.dayText, selected === day && styles.selectedText]}>{day}</Text>{warningDays.has(day) && <Text accessible={false} style={{ position: "absolute", top: 0, right: 0, color: colors.expense, fontWeight: "900" }}>!</Text>}{activeDays.has(day) && <View style={[styles.dot, selected === day && { backgroundColor: colors.onPrimary }]} />}</Pressable></View>)}</View></View>;
}
const createStyles = (colors: MobileThemeColors) => StyleSheet.create({ container: { backgroundColor: colors.white, borderRadius: 20, paddingVertical: 12, marginBottom: 12 }, week: { flexDirection: "row", paddingBottom: 8 }, weekday: { flex: 1, textAlign: "center", color: colors.muted, fontSize: 12 }, grid: { flexDirection: "row", flexWrap: "wrap" }, cell: { width: "14.2857%", alignItems: "center", paddingVertical: 2 }, blank: { width: "14.2857%" }, day: { borderRadius: 24, alignItems: "center", justifyContent: "center" }, selected: { backgroundColor: colors.mauve }, dayText: { color: colors.ink, fontSize: 14 }, selectedText: { color: colors.onPrimary, fontWeight: "700" }, dot: { height: 4, width: 4, borderRadius: 2, backgroundColor: colors.mauve, position: "absolute", bottom: 6 } });
