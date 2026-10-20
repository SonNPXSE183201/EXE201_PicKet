import { colors } from "@picket/design-tokens";
import { useState } from "react";
import { Keyboard, Modal, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "./accessible-pressable";
import { MonthCalendar } from "./month-calendar";
import { calendarDate, displayCalendarDate, shiftCalendarMonth } from "./date-field-policy";
import { AppIcon } from "./app-icon";

export function DateField({ label, value, onChange, style, disabled }: {
  label: string; value: string; onChange(value: string): void; style?: StyleProp<TextStyle>; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const now = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
  return <>
    <Pressable disabled={disabled} accessibilityLabel={`${label}: ${displayCalendarDate(value)}`} accessibilityHint="Mở lịch để chọn ngày" onPress={() => { Keyboard.dismiss(); setMonth(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0,7) : now()); setOpen(true); }} style={[{ backgroundColor: colors.white, borderColor: colors.peach, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, style as StyleProp<ViewStyle>]}>
      <Text style={{ color: colors.ink, fontSize: 16 }}>{displayCalendarDate(value)}</Text><AppIcon name="calendar-outline" color={colors.mauve} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 16 }}>
        <ScrollView accessibilityViewIsModal style={{ maxHeight: "90%", flexGrow: 0, backgroundColor: colors.cream, borderRadius: 24 }} contentContainerStyle={{ padding: 12, gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 20, fontWeight: "700" }}>{label}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable accessibilityLabel="Tháng trước trên lịch" onPress={() => setMonth(current => shiftCalendarMonth(current,-1))}><AppIcon name="chevron-left" /></Pressable>
            <Text style={{ color: colors.ink, fontWeight: "700" }}>Tháng {Number(month.slice(5))}/{month.slice(0,4)}</Text>
            <Pressable accessibilityLabel="Tháng sau trên lịch" onPress={() => setMonth(current => shiftCalendarMonth(current,1))}><AppIcon name="chevron-right" /></Pressable>
          </View>
          {month && <MonthCalendar month={month} activeDays={new Set()} selected={value.startsWith(month) ? Number(value.slice(8)) : null} onSelect={day => { if (day !== null) { onChange(calendarDate(month,day)); setOpen(false); } }} />}
          <Pressable onPress={() => { onChange(`${now()}-${String(new Date().getDate()).padStart(2,"0")}`); setOpen(false); }}><Text style={{ color: colors.mauve, textAlign: "center", fontWeight: "700" }}>Hôm nay</Text></Pressable>
          <Pressable onPress={() => setOpen(false)}><Text style={{ color: colors.muted, textAlign: "center" }}>Hủy chọn ngày</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
