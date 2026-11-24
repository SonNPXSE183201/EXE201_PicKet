import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { ForecastPoint } from "@picket/domain";

/** One dash is two days long; every other segment is left out so the line reads as dashed. */
const dashEvery = 2;

/**
 * Expected balance as a dashed line from today to month end, with the low–high range as a
 * shaded band, a zero line, and a dot on today. Built from Views (no SVG dependency); values
 * are read out through the accessibility label, not drawn text.
 */
export function ForecastChart({ path, height = 96, label, dayLabel, legend, todayLabel }: {
  path: ForecastPoint[];
  height?: number;
  label: string;
  dayLabel?(point: ForecastPoint): string;
  /** Legend captions; omitted legend hides the row. */
  legend?: { forecast: string; range: string };
  todayLabel?: string;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const [width, setWidth] = useState(0);
  const top = Math.max(0, ...path.map(point => point.high));
  const bottom = Math.min(0, ...path.map(point => point.low));
  const span = Math.max(1, top - bottom);
  const pad = 6;
  const inner = Math.max(1, height - pad * 2);
  const y = (value: number) => height - pad - ((value - bottom) / span) * inner;
  const step = path.length > 1 ? width / (path.length - 1) : 0;
  const x = (index: number) => index * step;
  const summary = dayLabel ? path.map(dayLabel).join(", ") : undefined;
  const lineColor = path.some(point => point.expected < 0) ? colors.expense : colors.primary;
  const segments = path.slice(1).map((point, index) => {
    const x1 = x(index), y1 = y(path[index].expected), x2 = x(index + 1), y2 = y(point.expected);
    const length = Math.hypot(x2 - x1, y2 - y1);
    return { key: point.day, length, angle: Math.atan2(y2 - y1, x2 - x1), mx: (x1 + x2) / 2, my: (y1 + y2) / 2, show: Math.floor(index / dashEvery) % 2 === 0 || index === path.length - 2 };
  });
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary ? `${label}. ${summary}` : label}>
      <View style={[styles.plot, { height }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <View style={[styles.grid, { top: y(top) }]} />
        <View style={[styles.grid, { top: y(0) }, bottom < 0 && styles.zero]} />
        {width > 0 && path.map((point, index) => index === 0 ? null : (
          <View key={`band-${point.day}`} style={[styles.band, { left: x(index - 1), width: step + 0.5, top: Math.min(y(point.high), y(path[index - 1].high)), height: Math.max(3, Math.max(y(point.low), y(path[index - 1].low)) - Math.min(y(point.high), y(path[index - 1].high))) }]} />
        ))}
        {width > 0 && segments.filter(segment => segment.show).map(segment => (
          <View key={segment.key} style={[styles.segment, { backgroundColor: lineColor, left: segment.mx - segment.length / 2, top: segment.my - 1, width: segment.length + 0.5, transform: [{ rotate: `${segment.angle}rad` }] }]} />
        ))}
        {width > 0 && <View style={[styles.dot, { backgroundColor: lineColor, borderColor: colors.surface, left: -5, top: y(path[0].expected) - 5 }]} />}
      </View>
      {path.length > 1 && (
        <View style={styles.axis}>
          <Text style={styles.axisText}>{todayLabel ?? path[0].day.slice(8)}</Text>
          <Text style={styles.axisText}>{path[path.length - 1].day.slice(8)}</Text>
        </View>
      )}
      {legend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={styles.sampleDash}>{[0, 1, 2].map(i => <View key={i} style={[styles.sampleDashPiece, { backgroundColor: lineColor }]} />)}</View><Text style={styles.axisText}>{legend.forecast}</Text></View>
          <View style={styles.legendItem}><View style={styles.sampleBand} /><Text style={styles.axisText}>{legend.range}</Text></View>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  plot: { position: "relative", overflow: "visible" },
  grid: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: c.border, opacity: 0.6 },
  zero: { opacity: 1, backgroundColor: c.muted },
  band: { position: "absolute", backgroundColor: c.selectedSurface },
  segment: { position: "absolute", height: 2.5, borderRadius: 2 },
  dot: { position: "absolute", width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { color: c.muted, fontSize: 11, lineHeight: 16, fontWeight: "600", flexShrink: 1 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", maxWidth: "100%", flexShrink: 1, gap: 6 },
  sampleDash: { flexDirection: "row", gap: 2, width: 20, flexShrink: 0 },
  sampleDashPiece: { width: 5, height: 2.5, borderRadius: 2 },
  sampleBand: { width: 16, height: 10, flexShrink: 0, borderRadius: 3, backgroundColor: c.selectedSurface },
});
