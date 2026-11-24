/**
 * End-of-month balance forecast, computed on the device from the user's own records.
 *
 * Method (deterministic and explainable):
 * - Balance now: every active wallet in the currency, as on Home.
 * - Rest of the month: for each of the previous `lookbackMonths` months, take the balance
 *   change over the same days of the month (today+1 .. month end). Fixed bills and salary
 *   land on similar days each month, so they are carried over without double counting
 *   what was already paid this month. The forecast is the median of those months; the
 *   range is their minimum and maximum.
 * - Days are local calendar days in the profile time zone (Asia/Ho_Chi_Minh by default).
 *
 * It is an estimate from past records, not a calibrated prediction or financial advice.
 */
type Wallet = { id: string; currencyCode: string; openingBalance: number; archived: boolean; deletedAt: string | null };
type Entry = { id: string; accountId: string; destinationAccountId: string | null; kind: string; amount: number; occurredAt: string; deletedAt: string | null };

export type ForecastInput = {
  accounts: Wallet[];
  transactions: Entry[];
  currency: string;
  timeZone: string;
  now: Date;
  /** Previous months compared (1–6). */
  lookbackMonths: number;
  /** Distinct days with records in the last 90 days needed before a forecast is shown. */
  minHistoryDays: number;
  /** Optional "what if I buy this today" scenario, in minor units. */
  purchase?: number;
};

export type ForecastPoint = { day: string; expected: number; low: number; high: number };

export type MonthForecast =
  | { status: "insufficient-history"; month: string; today: string; historyDays: number; neededDays: number; monthsAvailable: number }
  | {
      status: "ready";
      month: string;
      today: string;
      endDay: string;
      balanceNow: number;
      expected: number;
      low: number;
      high: number;
      /** Typical income and spending for the rest of the month (medians, positive numbers). */
      remainingIncome: number;
      remainingExpense: number;
      /** Spending so far this month and the typical spending by the same day. */
      spentSoFar: number;
      typicalSpentSoFar: number;
      monthsUsed: number;
      historyDays: number;
      /** One point per remaining day (today first). */
      path: ForecastPoint[];
      lowest: ForecastPoint;
      /** First day the expected balance drops below zero, if any. */
      negativeDay: string | null;
      /** First day the low end of the range drops below zero, if any. */
      riskDay: string | null;
      purchase: number;
    };

const dayMillis = 86_400_000;
const maxMoney = 9e12;

function checkMoney(value: number): number {
  if (!Number.isSafeInteger(value) || Math.abs(value) > maxMoney) throw new Error("Forecast amount overflow");
  return value;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const pad = (value: number) => String(value).padStart(2, "0");
const dayKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
function shiftMonth(year: number, month: number, offset: number) {
  const index = year * 12 + (month - 1) + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function forecastMonthEnd(input: ForecastInput): MonthForecast {
  if (!Number.isFinite(input.now.getTime()) || !/^[A-Z]{3}$/.test(input.currency)) throw new Error("Invalid forecast scope");
  if (!Number.isInteger(input.lookbackMonths) || input.lookbackMonths < 1 || input.lookbackMonths > 6) throw new Error("Invalid lookback");
  if (!Number.isInteger(input.minHistoryDays) || input.minHistoryDays < 1 || input.minHistoryDays > 90) throw new Error("Invalid history threshold");
  const purchase = input.purchase === undefined ? 0 : checkMoney(input.purchase);
  if (purchase < 0) throw new Error("Invalid purchase");

  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const localParts = (instant: Date) => {
    const parts = formatter.formatToParts(instant);
    const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
    return { year: get("year"), month: get("month"), day: get("day") };
  };
  const now = localParts(input.now);
  const today = dayKey(now.year, now.month, now.day);
  const monthKey = today.slice(0, 7);
  const lastDay = daysInMonth(now.year, now.month);

  // Wallets in scope and the balance change each record makes to them.
  const wallets = new Map<string, Wallet>();
  for (const wallet of input.accounts) {
    if (wallet.deletedAt || wallet.archived) continue;
    if (wallets.has(wallet.id)) throw new Error("Invalid wallet scope");
    wallets.set(wallet.id, wallet);
  }
  const inScope = (id: string | null) => {
    const wallet = id ? wallets.get(id) : undefined;
    return Boolean(wallet && wallet.currencyCode === input.currency);
  };
  let balanceNow = 0;
  for (const wallet of wallets.values()) if (wallet.currencyCode === input.currency) balanceNow = checkMoney(balanceNow + wallet.openingBalance);

  type DayTotals = { net: number; income: number; expense: number };
  const byDay = new Map<string, DayTotals>();
  const recordDays = new Set<string>();
  const seen = new Set<string>();
  const historyFloor = new Date(input.now.getTime() - 90 * dayMillis);
  for (const row of input.transactions) {
    if (row.deletedAt) continue;
    const instant = new Date(row.occurredAt);
    if (seen.has(row.id) || !Number.isFinite(instant.getTime()) || !Number.isSafeInteger(row.amount) || row.amount <= 0 || row.amount > maxMoney) {
      throw new Error("Invalid forecast record");
    }
    seen.add(row.id);
    const source = inScope(row.accountId);
    const destination = row.kind === "transfer" && inScope(row.destinationAccountId);
    let net = 0, income = 0, expense = 0;
    if (row.kind === "income" && source) { net = row.amount; income = row.amount; }
    else if (row.kind === "refund" && source) { net = row.amount; expense = -row.amount; }
    else if (row.kind === "expense" && source) { net = -row.amount; expense = row.amount; }
    else if (row.kind === "transfer") net = (destination ? row.amount : 0) - (source ? row.amount : 0);
    else if (!["income", "refund", "expense", "transfer"].includes(row.kind)) throw new Error("Invalid forecast record");
    if (!source && !destination) continue;
    balanceNow = checkMoney(balanceNow + net);
    if (instant > input.now) continue;
    const parts = localParts(instant);
    const key = dayKey(parts.year, parts.month, parts.day);
    const totals = byDay.get(key) ?? { net: 0, income: 0, expense: 0 };
    totals.net = checkMoney(totals.net + net);
    totals.income = checkMoney(totals.income + income);
    totals.expense = checkMoney(totals.expense + expense);
    byDay.set(key, totals);
    if (instant >= historyFloor && key < today && (income || expense)) recordDays.add(key);
  }
  const earliest = [...byDay.keys()].sort()[0];

  // Previous months whose window (today+1 .. month end) is covered by the records.
  type MonthWindow = { cumulative: number[]; income: number; expense: number; spentToDay: number };
  const windows: MonthWindow[] = [];
  for (let offset = 1; offset <= input.lookbackMonths; offset++) {
    const { year, month } = shiftMonth(now.year, now.month, -offset);
    const length = daysInMonth(year, month);
    // The window must be covered by records (someone who started mid-month still has
    // the end of that month to compare with).
    if (!earliest || earliest > dayKey(year, month, Math.min(now.day + 1, length))) continue;
    const cumulative: number[] = [];
    let running = 0, income = 0, expense = 0, spentToDay = 0;
    for (let day = 1; day <= Math.min(now.day, length); day++) spentToDay += byDay.get(dayKey(year, month, day))?.expense ?? 0;
    for (let day = now.day + 1; day <= lastDay; day++) {
      const totals = day <= length ? byDay.get(dayKey(year, month, day)) : undefined;
      running = checkMoney(running + (totals?.net ?? 0));
      income += totals?.income ?? 0;
      expense += totals?.expense ?? 0;
      cumulative.push(running);
    }
    windows.push({ cumulative, income, expense, spentToDay });
  }

  if (recordDays.size < input.minHistoryDays || !windows.length) {
    return { status: "insufficient-history", month: monthKey, today, historyDays: recordDays.size, neededDays: input.minHistoryDays, monthsAvailable: windows.length };
  }

  let spentSoFar = 0;
  for (let day = 1; day <= now.day; day++) spentSoFar += byDay.get(dayKey(now.year, now.month, day))?.expense ?? 0;

  const todayPoint: ForecastPoint = { day: today, expected: balanceNow - purchase, low: balanceNow - purchase, high: balanceNow - purchase };
  const path: ForecastPoint[] = [todayPoint];
  for (let index = 0; index < lastDay - now.day; index++) {
    const values = windows.map(window => window.cumulative[index]);
    const base = balanceNow - purchase;
    path.push({
      day: dayKey(now.year, now.month, now.day + index + 1),
      expected: checkMoney(base + median(values)),
      low: checkMoney(base + Math.min(...values)),
      high: checkMoney(base + Math.max(...values)),
    });
  }
  const end = path[path.length - 1];
  const lowest = path.reduce((min, point) => (point.expected < min.expected ? point : min), path[0]);
  return {
    status: "ready",
    month: monthKey,
    today,
    endDay: end.day,
    balanceNow,
    expected: end.expected,
    low: end.low,
    high: end.high,
    remainingIncome: median(windows.map(window => window.income)),
    remainingExpense: Math.max(0, median(windows.map(window => window.expense))),
    spentSoFar: Math.max(0, spentSoFar),
    typicalSpentSoFar: Math.max(0, median(windows.map(window => window.spentToDay))),
    monthsUsed: windows.length,
    historyDays: recordDays.size,
    path,
    lowest,
    negativeDay: path.find(point => point.expected < 0)?.day ?? null,
    riskDay: path.find(point => point.low < 0)?.day ?? null,
    purchase,
  };
}

/** Spending pace this month against the typical pace by the same day, in whole percent. */
export function spendingPace(forecast: Extract<MonthForecast, { status: "ready" }>): number | null {
  if (forecast.typicalSpentSoFar <= 0) return null;
  return Math.round(((forecast.spentSoFar - forecast.typicalSpentSoFar) / forecast.typicalSpentSoFar) * 100);
}
