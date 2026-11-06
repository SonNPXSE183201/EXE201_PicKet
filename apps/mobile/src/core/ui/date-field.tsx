import { paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useTranslation } from "react-i18next";
import { formatCalendarDate } from "@/core/i18n/formatters";
import { useState } from "react";
import { Keyboard, Modal, ScrollView, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "./accessible-pressable";
import { MonthCalendar } from "./month-calendar";
import { calendarDate, shiftCalendarMonth } from "./date-field-policy";
import { AppIcon } from "./app-icon";

export function DateField({ label, value, onChange, style, disabled }: {
  label: string; value: string; onChange(value: string): void; style?: StyleProp<TextStyle>; disabled?: boolean;
}) {
  const { colors, language } = useAppTheme();
  const { t } = useTranslation("calendar");
  const displayDate = () => { try { return formatCalendarDate(value,language); } catch { return t("choose"); } };
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const now = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
  return <>
    <Pressable disabled={disabled} accessibilityLabel={`${label}: ${displayDate()}`} accessibilityHint={t("open")} onPress={() => { Keyboard.dismiss(); setMonth(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0,7) : now()); setOpen(true); }} style={[{ backgroundColor: colors.surface, borderColor: colors.controlBorder, borderWidth: 1, borderRadius: paperShape.input, paddingHorizontal: 16, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, style as StyleProp<ViewStyle>]}>
      <Text style={{ color: colors.text, fontSize: 16 }}>{displayDate()}</Text><AppIcon name="calendar-outline" color={colors.link} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 16 }}>
        <ScrollView accessibilityViewIsModal style={{ maxHeight: "90%", flexGrow: 0, backgroundColor: colors.canvas, borderRadius: paperShape.card }} contentContainerStyle={{ padding: 12, gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>{label}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable accessibilityLabel={t("previous")} onPress={() => setMonth(current => shiftCalendarMonth(current,-1))}><AppIcon name="chevron-left" /></Pressable>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{t("month", {month:Number(month.slice(5)),year:month.slice(0,4)})}</Text>
            <Pressable accessibilityLabel={t("next")} onPress={() => setMonth(current => shiftCalendarMonth(current,1))}><AppIcon name="chevron-right" /></Pressable>
          </View>
          {month && <MonthCalendar month={month} activeDays={new Set()} selected={value.startsWith(month) ? Number(value.slice(8)) : null} onSelect={day => { if (day !== null) { onChange(calendarDate(month,day)); setOpen(false); } }} />}
          <Pressable onPress={() => { onChange(`${now()}-${String(new Date().getDate()).padStart(2,"0")}`); setOpen(false); }}><Text style={{ color: colors.link, textAlign: "center", fontWeight: "700" }}>{t("today")}</Text></Pressable>
          <Pressable onPress={() => setOpen(false)}><Text style={{ color: colors.muted, textAlign: "center" }}>{t("cancel")}</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
