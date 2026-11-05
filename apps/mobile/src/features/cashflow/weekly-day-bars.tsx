import { View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Skeleton } from "@/core/ui/figma-ui";
import { useAppTheme } from "@/features/settings/appearance-provider";
import type { RhythmDay } from "./weekly-rhythm";

const compact = (value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
const names = (vi: boolean) => vi ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Figma DayBar row: pill tracks (past lilac, selected/today primary, future dimmed). */
export function WeeklyDayBars({ days, today, selected, hidden = false, onSelect, label }: { days: RhythmDay[]; today: string; selected: string; hidden?: boolean; onSelect(day: string): void; label(day: RhythmDay, index: number): string }) {
  const { colors, language } = useAppTheme();
  const labels = names(language === "vi");
  const maximum = Math.max(1, ...days.map(day => day.expense ?? 0));
  return <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>{days.map((day, index) => {
    const future = day.expense === null;
    const active = day.day === selected;
    const level = future ? 0 : Math.min(1, (day.expense ?? 0) / maximum);
    return <Pressable key={day.day} accessibilityRole="radio" accessibilityState={{ checked: active, disabled: future }} accessibilityLabel={label(day, index)} disabled={future} onPress={() => onSelect(day.day)} hitSlop={0} style={{ width: 44, alignItems: "center", gap: 6, minHeight: 44 }}>
      {!future && <Text style={[figmaType.micro, { color: active ? colors.primary : colors.muted }]}>{hidden ? "•••" : compact(day.expense ?? 0)}</Text>}
      <View style={{ width: 26, height: 52, borderRadius: 13, overflow: "hidden", justifyContent: "flex-end", backgroundColor: active ? colors.selectedSurface : colors.border }}>
        {level > 0 && !hidden && <View style={{ width: 26, height: Math.max(26, Math.round(52 * level)), borderRadius: 13, backgroundColor: active ? colors.primary : colors.pocketLilac }} />}
      </View>
      <Text style={[active ? { fontSize: 11, lineHeight: 16, fontWeight: "800", color: colors.primary } : figmaType.bodySmall, !active && { fontSize: 11, lineHeight: 16, color: colors.muted }, future && { opacity: .5 }]}>{labels[index]}</Text>
    </Pressable>;
  })}</View>;
}

/** Empty week: a tick per day plus today's tick in expense colour. */
export function WeeklyEmptyDays({ today, days, hint }: { today: string; days: RhythmDay[]; hint: string }) {
  const { colors, language } = useAppTheme();
  const labels = names(language === "vi");
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: "row" }}>{days.map((day, index) => {
      const isToday = day.day === today;
      return <View key={day.day} accessible={false} style={{ flex: 1, alignItems: "center", gap: 8 }}>
        <View style={{ height: 4, borderRadius: 2, width: isToday ? 18 : 14, backgroundColor: isToday ? colors.expense : colors.border }} />
        <Text style={isToday ? { fontSize: 12, lineHeight: 18, fontWeight: "700", color: colors.text } : [figmaType.micro, { color: colors.muted }]}>{labels[index]}</Text>
      </View>;
    })}</View>
    <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{hint}</Text>
  </View>;
}

export function WeeklySkeleton() {
  const heights = [34, 22, 46, 18, 40, 26, 12];
  return <View style={{ height: 64, flexDirection: "row", alignItems: "flex-end" }}>{heights.map((h, i) => <View key={i} style={{ flex: 1, alignItems: "center", gap: 8 }}><Skeleton width={22} height={h} radius={11} /><Skeleton width={14} height={6} /></View>)}</View>;
}
