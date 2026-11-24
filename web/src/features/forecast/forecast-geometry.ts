import type { ForecastPoint } from "@picket/domain";

export type ChartGeometry = {
  /** Polyline for the expected balance, from today to month end. */
  line: string;
  /** Closed shape between the low and high ends of the range. */
  band: string;
  /** Vertical position of the zero line, or null when the range never goes below zero. */
  zeroY: number | null;
  /** Vertical positions of the baseline (zero) and top of the plot. */
  baseY: number;
  topY: number;
  today: { x: number; y: number };
  end: { x: number; y: number };
};

/** Scales a forecast path into an SVG viewport. Pure so it can be tested without a browser. */
export function chartGeometry(path: ForecastPoint[], width: number, height: number, pad = 8, scalePath = path): ChartGeometry {
  if (!path.length) throw new Error("Empty forecast path");
  const top = Math.max(0, ...scalePath.map((point) => point.high));
  const bottom = Math.min(0, ...scalePath.map((point) => point.low));
  const span = Math.max(1, top - bottom);
  const inner = Math.max(1, height - pad * 2);
  const y = (value: number) => Number((height - pad - ((value - bottom) / span) * inner).toFixed(2));
  const x = (index: number) => Number((path.length > 1 ? (index / (path.length - 1)) * width : 0).toFixed(2));
  const pairs = (pick: (point: ForecastPoint) => number) => path.map((point, index) => `${x(index)},${y(pick(point))}`);
  const high = pairs((point) => point.high);
  const low = pairs((point) => point.low).reverse();
  return {
    line: pairs((point) => point.expected).join(" "),
    band: `M${[...high, ...low].join(" L")} Z`,
    zeroY: bottom < 0 ? y(0) : null,
    baseY: y(0),
    topY: y(top),
    today: { x: x(0), y: y(path[0].expected) },
    end: { x: x(path.length - 1), y: y(path[path.length - 1].expected) },
  };
}

/** Share of `value` against `max`, in whole percent clamped to 0–100 (for progress bars). */
export function percentOf(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

/** "2026-11-30" -> "30/11". */
export function shortDay(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}
