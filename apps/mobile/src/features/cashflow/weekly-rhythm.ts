type Wallet = { id: string; currencyCode: string; deletedAt: string | null };
type Entry = { id: string; accountId: string; kind: string; amount: number; occurredAt: string; deletedAt: string | null };
export type RhythmDay = { day: string; expense: number | null; refunds: number | null; count: number; previousExpense: number | null; closed: boolean };
const dayMillis = 86_400_000;
const shiftDay = (day: string, offset: number) => new Date(Date.parse(`${day}T00:00:00Z`) + offset * dayMillis).toISOString().slice(0, 10);

/** A presentation of saved records, never a spending allowance or savings recommendation. */
export function buildWeeklyRhythm(input: { accounts: Wallet[]; transactions: Entry[]; currency: string; timeZone: string; now: Date }): { today: string; start: string; days: RhythmDay[]; recordCount: number } {
  if (!Number.isFinite(input.now.getTime()) || !/^[A-Z]{3}$/.test(input.currency)) throw new Error("Invalid weekly scope");
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const localDay = (instant: Date) => {
    const parts = formatter.formatToParts(instant);
    return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}-${parts.find(p => p.type === "day")!.value}`;
  };
  const today = localDay(input.now);
  const start = shiftDay(today, -(new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7);
  const wallets = new Map(input.accounts.filter(a => !a.deletedAt).map(a => [a.id, a]));
  const totals = new Map<string, { expense: number; refunds: number; count: number; expenses: number }>();
  const seen = new Set<string>();
  for (const row of input.transactions) {
    if (row.deletedAt || !["expense", "refund"].includes(row.kind)) continue;
    const instant = new Date(row.occurredAt);
    if (!Number.isFinite(instant.getTime()) || !Number.isSafeInteger(row.amount) || row.amount <= 0 || row.amount > 9e12 || seen.has(row.id)) throw new Error("Invalid weekly record");
    seen.add(row.id);
    if (instant > input.now) continue;
    const day = localDay(instant);
    if (day < shiftDay(start, -7) || day > today) continue;
    const wallet = wallets.get(row.accountId);
    if (!wallet) throw new Error("Weekly wallet scope is unavailable");
    if (wallet.currencyCode !== input.currency) continue;
    const current = totals.get(day) ?? { expense: 0, refunds: 0, count: 0, expenses: 0 };
    if (row.kind === "expense") { current.expense += row.amount; current.expenses++; } else current.refunds += row.amount;
    if (!Number.isSafeInteger(current.expense) || current.expense > 9e12 || !Number.isSafeInteger(current.refunds) || current.refunds > 9e12) throw new Error("Weekly total overflow");
    current.count++;
    totals.set(day, current);
  }
  const days = Array.from({ length: 7 }, (_, index): RhythmDay => {
    const day = shiftDay(start, index), current = totals.get(day), prior = totals.get(shiftDay(day, -7));
    return { day, expense: day > today ? null : current?.expense ?? 0, refunds: day > today ? null : current?.refunds ?? 0, count: current?.count ?? 0, previousExpense: day < today && prior?.expenses ? prior.expense : null, closed: day < today };
  });
  return { today, start, days, recordCount: days.reduce((sum, day) => sum + day.count, 0) };
}
