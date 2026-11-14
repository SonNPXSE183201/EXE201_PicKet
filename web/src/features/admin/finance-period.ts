/* Finance report periods (Vietnam time, UTC+7, no DST). Pure helpers, no I/O. */
export const FINANCE_PERIODS = ["day", "week", "month", "quarter", "year"] as const;
export type FinancePeriod = (typeof FINANCE_PERIODS)[number];
export const FINANCE_PERIOD_LABELS: Record<FinancePeriod, string> = {
  day: "Ngày", week: "Tuần", month: "Tháng", quarter: "Quý", year: "Năm",
};
const VN_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shifted "VN wall clock" as a UTC Date so getUTC* gives Vietnam local fields. */
const toVn = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS);
const vnDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const fromVn = (shifted: Date) => new Date(shifted.getTime() - VN_OFFSET_MS);
const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (shifted: Date) => `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;

export function parseFinancePeriod(value?: string): FinancePeriod {
  return (FINANCE_PERIODS as readonly string[]).includes(value ?? "") ? (value as FinancePeriod) : "month";
}
/** Anchor day (YYYY-MM-DD, VN). Falls back to today; never in the future. */
export function parseAnchor(value: string | undefined, now = new Date()): string {
  const today = dateKey(toVn(now));
  if (!value || !DATE_RE.test(value)) return today;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value) return today;
  return value > today ? today : value;
}

export type FinanceRange = { from: string; to: string; label: string; start: string; end: string };
/** Range [from, to) as ISO instants plus VN date keys (end inclusive). */
export function financeRange(period: FinancePeriod, anchor: string): FinanceRange {
  const a = new Date(`${anchor}T00:00:00Z`);
  const y = a.getUTCFullYear(), m = a.getUTCMonth(), d = a.getUTCDate();
  let start: Date, endExclusive: Date, label: string;
  if (period === "day") {
    start = vnDate(y, m, d); endExclusive = vnDate(y, m, d + 1); label = `Ngày ${pad(d)}/${pad(m + 1)}/${y}`;
  } else if (period === "week") {
    const offset = (a.getUTCDay() + 6) % 7; // Monday first
    start = vnDate(y, m, d - offset); endExclusive = vnDate(y, m, d - offset + 7);
    const last = new Date(endExclusive.getTime() - DAY_MS);
    label = `Tuần ${pad(start.getUTCDate())}/${pad(start.getUTCMonth() + 1)} – ${pad(last.getUTCDate())}/${pad(last.getUTCMonth() + 1)}/${last.getUTCFullYear()}`;
  } else if (period === "month") {
    start = vnDate(y, m, 1); endExclusive = vnDate(y, m + 1, 1); label = `Tháng ${m + 1}/${y}`;
  } else if (period === "quarter") {
    const q = Math.floor(m / 3);
    start = vnDate(y, q * 3, 1); endExclusive = vnDate(y, q * 3 + 3, 1); label = `Quý ${q + 1}/${y}`;
  } else {
    start = vnDate(y, 0, 1); endExclusive = vnDate(y + 1, 0, 1); label = `Năm ${y}`;
  }
  return {
    from: fromVn(start).toISOString(), to: fromVn(endExclusive).toISOString(), label,
    start: dateKey(start), end: dateKey(new Date(endExclusive.getTime() - DAY_MS)),
  };
}
/** Previous/next anchor for the period navigation arrows. */
export function shiftAnchor(period: FinancePeriod, anchor: string, direction: -1 | 1): string {
  const a = new Date(`${anchor}T00:00:00Z`);
  const y = a.getUTCFullYear(), m = a.getUTCMonth(), d = a.getUTCDate();
  const next = period === "day" ? vnDate(y, m, d + direction)
    : period === "week" ? vnDate(y, m, d + 7 * direction)
    : period === "month" ? vnDate(y, m + direction, 1)
    : period === "quarter" ? vnDate(y, Math.floor(m / 3) * 3 + 3 * direction, 1)
    : vnDate(y + direction, 0, 1);
  return dateKey(next);
}

export type ChartBucket = "day" | "week" | "month" | "quarter" | "year";
export type ChartPlan = { from: string; to: string; bucket: ChartBucket; rpcBucket: "day" | "month"; start: string; end: string };
/** Every point of the chart is one unit of the chosen filter, including units without revenue:
    Ngày: each day of the month; Tuần: each week of the quarter; Tháng: each month of the year;
    Quý: each quarter of the year; Năm: the last four years. */
export function chartPlan(period: FinancePeriod, anchor: string): ChartPlan {
  const make = (r: FinanceRange, bucket: ChartBucket, rpcBucket: "day" | "month"): ChartPlan => ({ from: r.from, to: r.to, bucket, rpcBucket, start: r.start, end: r.end });
  if (period === "day") return make(financeRange("month", anchor), "day", "day");
  if (period === "week") return make(financeRange("quarter", anchor), "week", "day");
  if (period === "month") return make(financeRange("year", anchor), "month", "month");
  if (period === "quarter") return make(financeRange("year", anchor), "quarter", "month");
  const last = financeRange("year", anchor);
  const first = financeRange("year", `${Number(anchor.slice(0, 4)) - 3}-01-01`);
  return { from: first.from, to: last.to, bucket: "year", rpcBucket: "month", start: first.start, end: last.end };
}
/** Monday-start week key (VN date) for a `YYYY-MM-DD` day. */
export function weekKey(day: string): string {
  const a = new Date(`${day}T00:00:00Z`);
  return dateKey(new Date(a.getTime() - ((a.getUTCDay() + 6) % 7) * DAY_MS));
}
/** Key of the chart point a day belongs to. */
export function bucketKey(bucket: ChartBucket, day: string): string {
  if (bucket === "day") return day;
  if (bucket === "week") return weekKey(day);
  if (bucket === "month") return `${day.slice(0, 7)}-01`;
  if (bucket === "quarter") return `${day.slice(0, 4)}-${pad(Math.floor((Number(day.slice(5, 7)) - 1) / 3) * 3 + 1)}-01`;
  return `${day.slice(0, 4)}-01-01`;
}
/** Ordered unique point keys between two VN dates (inclusive). */
export function bucketKeys(bucket: ChartBucket, start: string, end: string): string[] {
  const keys: string[] = [];
  const last = new Date(`${end}T00:00:00Z`).getTime();
  for (let t = new Date(`${start}T00:00:00Z`).getTime(); t <= last; t += DAY_MS) {
    const key = bucketKey(bucket, dateKey(new Date(t)));
    if (keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys;
}
const dm = (key: string) => `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}`;
export function bucketLabel(bucket: ChartBucket, key: string): string {
  if (bucket === "month") return `T${Number(key.slice(5, 7))}`;
  if (bucket === "quarter") return `Q${(Number(key.slice(5, 7)) - 1) / 3 + 1}/${key.slice(2, 4)}`;
  if (bucket === "year") return key.slice(0, 4);
  return dm(key);
}
export function bucketTitle(bucket: ChartBucket, key: string): string {
  if (bucket === "day") return `Ngày ${dm(key)}/${key.slice(0, 4)}`;
  if (bucket === "week") {
    const end = dateKey(new Date(new Date(`${key}T00:00:00Z`).getTime() + 6 * DAY_MS));
    return `Tuần ${dm(key)} – ${dm(end)}`;
  }
  if (bucket === "month") return `Tháng ${Number(key.slice(5, 7))}/${key.slice(0, 4)}`;
  if (bucket === "quarter") return `Quý ${(Number(key.slice(5, 7)) - 1) / 3 + 1}/${key.slice(0, 4)}`;
  return `Năm ${key.slice(0, 4)}`;
}
