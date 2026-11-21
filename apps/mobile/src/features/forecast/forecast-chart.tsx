import { StyleSheet, View } from "react-native";

import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { ForecastPoint } from "./month-forecast";

/**
 * Expected balance per remaining day as columns, with the low–high range as a faint band
 * behind each column. Built from Views (no SVG dependency); values are read out through
 * the accessibility label, not drawn text.
 */
export function ForecastChart({ path, height = 96, label, dayLabel }: { path: ForecastPoint[]; height?: number; label: string; dayLabel?(point: ForecastPoint): string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const top = Math.max(0, ...path.map(point => point.high));
  const bottom = Math.min(0, ...path.map(point => point.low));
  const span = Math.max(1, top - bottom);
  const y = (value: number) => ((value - bottom) / span) * height;
  const zero = y(0);
  const summary = dayLabel ? path.map(dayLabel).join(", ") : undefined;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary ? `${label}. ${summary}` : label}>
      <View style={[styles.plot, { height }]}>
        {bottom < 0 && <View style={[styles.zero, { bottom: zero }]} />}
        {path.map(point => {
          const negative = point.expected < 0;
          const from = Math.min(zero, y(point.expected)), to = Math.max(zero, y(point.expected));
          return (
            <View key={point.day} style={styles.column}>
              <View style={[styles.band, { bottom: y(point.low), height: Math.max(2, y(point.high) - y(point.low)) }]} />
              <View style={[styles.bar, { bottom: from, height: Math.max(2, to - from), backgroundColor: negative ? colors.expense : colors.primary }]} />
            </View>
          );
        })}
      </View>
      {path.length > 1 && (
        <View style={styles.axis}>
          <Text style={styles.axisText}>{path[0].day.slice(8)}</Text>
          <Text style={styles.axisText}>{path[path.length - 1].day.slice(8)}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  plot: { flexDirection: "row", alignItems: "stretch", gap: 3 },
  column: { flex: 1, position: "relative" },
  band: { position: "absolute", left: 0, right: 0, borderRadius: 4, backgroundColor: c.selectedSurface },
  bar: { position: "absolute", left: "20%", right: "20%", borderRadius: 3 },
  zero: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: c.border },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  axisText: { color: c.muted, fontSize: 11, fontWeight: "600" },
});
