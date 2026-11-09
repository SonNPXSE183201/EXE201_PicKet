import { figmaColors } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
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
  const { colors: mc } = useMobileStyles(() => ({}));
  const { t } = useTranslation("calendar");
  const displayDate = () => { try { return formatCalendarDate(value,language); } catch { return t("choose"); } };
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [pending, setPending] = useState("");
  const now = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
  const dayOffset = (delta: number) => { const d = new Date(); d.setDate(d.getDate()+delta); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  return <>
    <Pressable disabled={disabled} accessibilityLabel={`${label}: ${displayDate()}`} accessibilityHint={t("open")} onPress={() => { Keyboard.dismiss(); const valid = /^\d{4}-\d{2}-\d{2}$/.test(value); setMonth(valid ? value.slice(0,7) : now()); setPending(valid ? value : dayOffset(0)); setOpen(true); }} style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, style as StyleProp<ViewStyle>]}>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: "700" }}>{displayDate()}</Text><AppIcon name="calendar-outline" color={colors.link} />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel={t("cancel")} onPress={() => setOpen(false)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: figmaColors.text, opacity: 0.5 }} />
        <SafeAreaView edges={["bottom"]} accessibilityViewIsModal style={{ backgroundColor: mc.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <ScrollView style={{ maxHeight: "92%", flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 14 }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 16, lineHeight: 26, fontWeight: "800" }}>{label}</Text>
              <Pressable accessibilityLabel={t("cancel")} hitSlop={10} onPress={() => setOpen(false)}><AppIcon name="close" size={24} color={colors.text} /></Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[{ key: "today", text: t("today"), date: dayOffset(0) }, { key: "yesterday", text: language === "en" ? "Yesterday" : "Hôm qua", date: dayOffset(-1) }].map((chip) => {
                const active = pending === chip.date;
                return <Pressable key={chip.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { setMonth(chip.date.slice(0, 7)); setPending(chip.date); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? colors.selectedSurface : "transparent", borderWidth: active ? 0 : 1, borderColor: colors.border }}><Text style={{ fontSize: 11, lineHeight: 16, fontWeight: "800", color: active ? colors.primary : colors.muted }}>{chip.text}</Text></Pressable>;
              })}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Pressable accessibilityLabel={t("previous")} onPress={() => setMonth(current => shiftCalendarMonth(current,-1))} style={navButton(mc)}><AppIcon name="chevron-left" size={16} color={colors.text} /></Pressable>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: "700" }}>{t("month", {month:Number(month.slice(5)),year:month.slice(0,4)})}</Text>
              <Pressable accessibilityLabel={t("next")} onPress={() => setMonth(current => shiftCalendarMonth(current,1))} style={navButton(mc)}><AppIcon name="chevron-right" size={16} color={colors.text} /></Pressable>
            </View>
            {month && <MonthCalendar month={month} activeDays={new Set()} selected={pending.startsWith(month) ? Number(pending.slice(8)) : null} onSelect={day => { if (day !== null) setPending(calendarDate(month,day)); }} />}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !pending }} disabled={!pending} onPress={() => { onChange(pending); setOpen(false); }} style={{ height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: pending ? 1 : 0.5 }}>
              <Text style={{ color: colors.onPrimary, fontSize: 13, lineHeight: 19, fontWeight: "800" }}>{pending ? `${t("choose")} ${formatCalendarDate(pending, language)}` : t("choose")}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}

const navButton = (colors: { paper: string; border: string }) => ({ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, alignItems: "center" as const, justifyContent: "center" as const });
