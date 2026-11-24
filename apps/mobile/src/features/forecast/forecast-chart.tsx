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
export function ForecastChart({ path, scenarioPath, height = 96, label, dayLabel, legend, todayLabel, formatDay, lowestLabel, riskLabel, scenarioRiskDay }: {
  path: ForecastPoint[];
  scenarioPath?: ForecastPoint[];
  scenarioRiskDay?: string | null;
  formatDay?(day: string): string;
  lowestLabel?(day: string): string;
  riskLabel?(day: string): string;
  height?: number;
  label: string;
  dayLabel?(point: ForecastPoint): string;
  /** Legend captions; omitted legend hides the row. */
  legend?: { forecast: string; range: string; scenario?: string };
  todayLabel?: string;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const [width, setWidth] = useState(0);
  const all = [...path, ...(scenarioPath ?? [])];
  const top = Math.max(0, ...all.map(point => point.high));
  const bottom = Math.min(0, ...all.map(point => point.low));
  const span = Math.max(1, top - bottom);
  const pad = 6;
  const inner = Math.max(1, height - pad * 2);
  const y = (value: number) => height - pad - ((value - bottom) / span) * inner;
  const step = path.length > 1 ? width / (path.length - 1) : 0;
  const x = (index: number) => index * step;
  const summary = dayLabel ? path.map(dayLabel).join(", ") : undefined;
  const lineColor = colors.primary;
  const lowestPath = scenarioPath ?? path;
  const lowestIndex = lowestPath.reduce((best, point, i) => point.expected < lowestPath[best].expected ? i : best, 0);
  const lowest = lowestPath[lowestIndex];
  const shortDay = formatDay ?? ((day: string) => `${day.slice(8)}/${day.slice(5, 7)}`);
  const annotation = scenarioRiskDay ? riskLabel?.(scenarioRiskDay) : lowestLabel?.(lowest.day);
  const segmentsFor = (points: ForecastPoint[]) => points.slice(1).map((point, index) => {
    const x1 = x(index), y1 = y(points[index].expected), x2 = x(index + 1), y2 = y(point.expected);
    const length = Math.hypot(x2 - x1, y2 - y1);
    return { key: point.day, length, angle: Math.atan2(y2 - y1, x2 - x1), mx: (x1 + x2) / 2, my: (y1 + y2) / 2, show: Math.floor(index / dashEvery) % 2 === 0 || index === path.length - 2 };
  });
  const segments = segmentsFor(path);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={[label, annotation, summary, scenarioPath && dayLabel ? `${legend?.scenario ?? ""}: ${scenarioPath.map(dayLabel).join(", ")}` : undefined].filter(Boolean).join(". ")}>
      <View style={[styles.plot, { height }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <View style={[styles.grid, { top: y(top) }]} />
        <View style={[styles.grid, { top: y(0) }, bottom < 0 && styles.zero]} />
        {width > 0 && path.map((point, index) => index === 0 ? null : (
          <View key={`band-${point.day}`} style={[styles.band, { left: x(index - 1), width: step + 0.5, top: Math.min(y(point.high), y(path[index - 1].high)), height: Math.max(3, Math.max(y(point.low), y(path[index - 1].low)) - Math.min(y(point.high), y(path[index - 1].high))) }]} />
        ))}
        {width > 0 && segments.filter(segment => segment.show).map(segment => (
          <View key={segment.key} style={[styles.segment, { backgroundColor: lineColor, left: segment.mx - segment.length / 2, top: segment.my - 1, width: segment.length + 0.5, transform: [{ rotate: `${segment.angle}rad` }] }]} />
        ))}
        {width > 0 && scenarioPath && segmentsFor(scenarioPath).map(segment => <View key={`scenario-${segment.key}`} style={[styles.segment, { backgroundColor: colors.warning, left: segment.mx - segment.length / 2, top: segment.my - 1, width: segment.length + .5, transform: [{ rotate: `${segment.angle}rad` }] }]} />)}
        {width > 0 && <View style={[styles.dot, { backgroundColor: lineColor, borderColor: colors.surface, left: -5, top: y(path[0].expected) - 5 }]} />}
        {width > 0 && lowest && <View style={[styles.dot, { backgroundColor: scenarioPath ? colors.warning : lineColor, borderColor: colors.paper, left: Math.min(width - 5, x(lowestIndex) - 5), top: y(lowest.expected) - 5 }]} />}
        {annotation && <View style={[styles.annotation, { backgroundColor: scenarioRiskDay ? colors.warningSurface : colors.successSurface }]}><Text style={[styles.axisText, { color: scenarioRiskDay ? colors.warning : colors.success }]}>{annotation}</Text></View>}
      </View>
      {path.length > 1 && (
        <View style={styles.axis}>
          <Text style={styles.axisText}>{todayLabel ?? path[0].day.slice(8)}</Text>
          <Text style={styles.axisText}>{shortDay(path[Math.floor((path.length - 1) / 2)].day)}</Text>
          <Text style={styles.axisText}>{shortDay(path[path.length - 1].day)}</Text>
        </View>
      )}
      {legend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={styles.sampleDash}>{[0, 1, 2].map(i => <View key={i} style={[styles.sampleDashPiece, { backgroundColor: lineColor }]} />)}</View><Text style={styles.axisText}>{legend.forecast}</Text></View>
          <View style={styles.legendItem}><View style={styles.sampleBand} /><Text style={styles.axisText}>{legend.range}</Text></View>
          {scenarioPath && legend.scenario && <View style={styles.legendItem}><View style={[styles.sampleDashPiece, { backgroundColor: colors.warning, width: 14 }]} /><Text style={styles.axisText}>{legend.scenario}</Text></View>}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  plot: { position: "relative", overflow: "visible" },
  grid: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: c.border, opacity: 0.6 },
  zero: { opacity: 1, backgroundColor: c.muted },
  band: { position: "absolute", backgroundColor: c.primary, opacity: .14 },
  annotation: { position: "absolute", right: 0, bottom: 0, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  segment: { position: "absolute", height: 2.5, borderRadius: 2 },
  dot: { position: "absolute", width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { color: c.muted, fontSize: 10, lineHeight: 15, fontWeight: "800", letterSpacing: .3, flexShrink: 1 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", maxWidth: "100%", flexShrink: 1, gap: 6 },
  sampleDash: { flexDirection: "row", gap: 2, width: 20, flexShrink: 0 },
  sampleDashPiece: { width: 5, height: 2.5, borderRadius: 2 },
  sampleBand: { width: 14, height: 8, flexShrink: 0, borderRadius: 2, backgroundColor: c.primary, opacity: .14 },
});
