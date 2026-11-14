import { formatVnd } from "@picket/domain";
import { REVENUE_SOURCE_LABELS } from "./revenue-labels";
import { RevenueLineChart } from "./revenue-line-chart";
import "./modules.css";

export type SeriesRow = { period: string; source: string; amount: number; entries: number };
export type BarColumn = { key: string; parts: { source: string; amount: number }[]; total: number; label?: string; title?: string };
export const SOURCE_COLORS: Record<string, string> = { google_play: "#2f9e77", payos: "var(--ap-mauve)" };
const shortDay = (key: string) => `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}`;

/** Line chart per source; PayOS and Google Play are always in the legend. */
export function RevenueBars({ columns, sources, isSelected }: {
  columns: BarColumn[]; sources: string[]; isSelected?: (key: string) => boolean;
}) {
  const all = [...new Set(["payos", "google_play", ...sources])];
  const series = all.map((source) => ({ source, name: REVENUE_SOURCE_LABELS[source] ?? source, color: SOURCE_COLORS[source] ?? "var(--ap-blue)" }));
  const lineColumns = columns.map((c) => ({ ...c, label: c.label ?? shortDay(c.key), title: c.title ?? `Ngày ${shortDay(c.key)}` }));
  const selected = isSelected ? columns.filter((c) => isSelected(c.key)).map((c) => c.key) : [];
  return (
    <>
      <RevenueLineChart columns={lineColumns} series={series} selected={selected} />
      <ul className="am-legend">
        {series.map((s) => <li key={s.source}><i style={{ background: s.color }} />{s.name}</li>)}
        
      </ul>
    </>
  );
}

/** Daily columns for the last `days` days (VN dates), filled from a daily revenue series. */
export function dailyColumns(series: SeriesRow[], days: number, today: string) {
  const end = new Date(`${today}T00:00:00Z`);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) keys.push(new Date(end.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  const sources = [...new Set(series.map((r) => r.source))];
  const columns: BarColumn[] = keys.map((key) => {
    const parts = sources.map((source) => ({ source, amount: series.filter((r) => r.source === source && r.period.slice(0, 10) === key).reduce((t, r) => t + r.amount, 0) }));
    return { key, parts, total: parts.reduce((t, p) => t + p.amount, 0) };
  });
  return { columns, sources };
}
