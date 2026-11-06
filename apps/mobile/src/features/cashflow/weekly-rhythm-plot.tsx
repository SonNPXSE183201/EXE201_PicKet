import { useState } from "react";
import { ScrollView, View } from "react-native";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAppTheme } from "@/features/settings/appearance-provider";
import type { RhythmDay } from "./weekly-rhythm";

/** Native-only chart. Future days remain blank and the accessible values are real Text. */
export function WeeklyRhythmPlot({ days, selected, onSelect, label }: { days: RhythmDay[]; selected: string; onSelect(day: string): void; label(day: RhythmDay, index: number): string }) {
  const { colors: c, language } = useAppTheme();
  const [measuredWidth, setWidth] = useState(0);
  const width = Math.max(measuredWidth, 7 * 48), height = 84, padding = width / 14;
  const known = days.filter(day => day.expense !== null);
  const maximum = Math.max(1, ...known.map(day => day.expense!));
  const points = known.map((day, i) => ({ x: padding + i * (width - padding * 2) / 6, y: height - 12 - day.expense! / maximum * 58 }));
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    for (let j = 0; j < 10; j++) {
      const t1 = j / 10, t2 = (j + 1) / 10;
      const smooth = (t: number) => t * t * (3 - 2 * t);
      segments.push({ x1: a.x + (b.x - a.x) * t1, x2: a.x + (b.x - a.x) * t2, y1: a.y + (b.y - a.y) * smooth(t1), y2: a.y + (b.y - a.y) * smooth(t2) });
    }
  }
  const names = language === "vi" ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] : ["M", "T", "W", "T", "F", "S", "S"];
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width }}>
      <View style={{ width }}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height, overflow: "hidden" }}>
          {segments.map((s, i) => {
            const length = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
            return <View key={i}><View style={{ position: "absolute", left: s.x1, top: (s.y1 + s.y2) / 2, width: s.x2 - s.x1 + .5, height: height - (s.y1 + s.y2) / 2, backgroundColor: c.pocketMint, opacity: .35 }} /><View style={{ position: "absolute", left: (s.x1 + s.x2 - length) / 2, top: (s.y1 + s.y2) / 2 - 1.2, width: length + .5, height: 2.4, borderRadius: 2, backgroundColor: c.chart1, transform: [{ rotate: `${Math.atan2(s.y2 - s.y1, s.x2 - s.x1)}rad` }] }} /></View>;
          })}
          {points.map((point, i) => <View key={days[i].day} style={{ position: "absolute", left: point.x - 3, top: point.y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: days[i].day === selected ? c.primary : c.chart1 }} />)}
        </View>
        <View style={{ flexDirection: "row" }}>{days.map((day, index) => <Pressable key={day.day} accessibilityRole="radio" accessibilityState={{ checked: day.day === selected, disabled: day.expense === null }} disabled={day.expense === null} accessibilityLabel={label(day, index)} onPress={() => onSelect(day.day)} style={{ width: width / 7, alignItems: "center", justifyContent: "center", opacity: day.expense === null ? .45 : 1 }}><Text style={{ fontSize: 12, color: day.day === selected ? c.selectedText : c.muted, fontWeight: day.day === selected ? "800" : "400", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: day.day === selected ? c.selectedSurface : undefined }}>{names[index]}</Text></Pressable>)}</View>
      </View>
    </ScrollView>
  </View>;
}
