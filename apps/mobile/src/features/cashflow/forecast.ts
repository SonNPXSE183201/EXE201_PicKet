export type CashflowOccurrence = { id: string; day: string; amount: number; currency: string; settled: boolean;walletId?:string };
type ForecastInput = { startDay: string; days: number; currency: string; openingBalance: number; occurrences: CashflowOccurrence[] };
type PurchaseScenario = { day: string; amount: number };
function dateDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid date-only value");
  const date = new Date(day + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== day) throw new Error("Invalid calendar day");
  return date.getTime();
}
function money(value: number) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 9_000_000_000_000) throw new Error("Invalid or overflowing money amount");
  return value;
}
/** F0 arithmetic scenario from explicit occurrences; not a calibrated prediction. */
export function calculateCashflow(input: ForecastInput, purchase?: PurchaseScenario) {
  const start = dateDay(input.startDay);
  if (![7,30].includes(input.days) || !/^[A-Z]{3}$/.test(input.currency)) throw new Error("Invalid forecast scope");
  money(input.openingBalance);
  const ids = new Set<string>();
  for (const row of input.occurrences) {
    if (typeof row.id !== "string" || !row.id || ids.has(row.id) || typeof row.settled !== "boolean") throw new Error("Invalid cashflow occurrence");
    ids.add(row.id); dateDay(row.day); money(row.amount);
    if (row.currency !== input.currency) throw new Error("Currencies must be scoped separately");
  }
  if (purchase) {
    money(purchase.amount);
    if (purchase.amount <= 0 || dateDay(purchase.day) < start || dateDay(purchase.day) >= start + input.days*86400000) throw new Error("Purchase must be inside scenario horizon");
  }
  let balance = input.openingBalance, scenarioBalance = input.openingBalance;
  const baseline: { day: string; balance: number }[] = [], scenario: typeof baseline = [];
  for (let i=0;i<input.days;i++) {
    const day = new Date(start+i*86400000).toISOString().slice(0,10);
    const movement = input.occurrences.filter(row => !row.settled && row.day === day).reduce((sum,row) => money(sum+row.amount),0);
    balance = money(balance+movement); scenarioBalance = money(scenarioBalance+movement-(purchase?.day === day ? purchase.amount : 0));
    baseline.push({ day, balance }); if (purchase) scenario.push({ day, balance: scenarioBalance });
  }
  return { kind: "explicit-schedule-scenario" as const, currency: input.currency, baseline,
    scenario: purchase ? scenario : null, minimum: Math.min(input.openingBalance,...baseline.map(row => row.balance)),
    limitations: ["Only supplied occurrences are included; missing records are unknown, not zero spending.", "No calibrated confidence interval or permission to spend is implied."] };
}
