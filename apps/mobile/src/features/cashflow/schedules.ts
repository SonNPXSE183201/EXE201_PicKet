import type { CashflowOccurrence } from "./forecast";
import type { CashflowSchedule } from "@picket/domain";
export type { CashflowSchedule } from "@picket/domain";
function utcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid schedule day");
  const result = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0,10) !== value) throw new Error("Invalid calendar day");
  return result;
}
/** No ledger mutation: settled occurrences are marked for the forecast to exclude. */
export function expandSchedules(schedules: CashflowSchedule[], from: string, through: string, settledIds: string[] = []): CashflowOccurrence[] {
  const lower = utcDay(from), upper = utcDay(through);
  if (upper < lower || upper.getTime()-lower.getTime() > 366*86400000 || schedules.length > 1000) throw new Error("Schedule scope is too large");
  const seen = new Set<string>(), settled = new Set(settledIds), result: CashflowOccurrence[] = [];
  for (const row of schedules) {
    if(row.walletId!==undefined&&(typeof row.walletId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.walletId)))throw new Error("Invalid schedule wallet");
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(row.id) || seen.has(row.id) || !["once","weekly","monthly"].includes(row.frequency) ||
        !Number.isSafeInteger(row.amount) || row.amount === 0 || Math.abs(row.amount) > 9e12 || !/^[A-Z]{3}$/.test(row.currency) || typeof row.active !== "boolean") throw new Error("Invalid schedule");
    seen.add(row.id);
    const anchor = utcDay(row.startDay), end = row.endDay ? utcDay(row.endDay) : upper;
    if (end < anchor) throw new Error("Schedule ends before it starts");
    if (!row.active || anchor > upper || end < lower) continue;
    let cursor = new Date(anchor), step = 0;
    if (row.frequency === "weekly") step = Math.max(0,Math.ceil((lower.getTime()-anchor.getTime())/(7*86400000)));
    if (row.frequency === "monthly") step = Math.max(0,(lower.getUTCFullYear()-anchor.getUTCFullYear())*12+lower.getUTCMonth()-anchor.getUTCMonth());
    while (true) {
      if (row.frequency === "weekly") cursor = new Date(anchor.getTime()+step*7*86400000);
      if (row.frequency === "monthly") {
        cursor = new Date(anchor); cursor.setUTCDate(1); cursor.setUTCMonth(anchor.getUTCMonth()+step);
        const last = new Date(cursor); last.setUTCMonth(last.getUTCMonth()+1); last.setUTCDate(0);
        cursor.setUTCDate(Math.min(anchor.getUTCDate(),last.getUTCDate()));
      }
      if (cursor > upper || cursor > end) break;
      if (cursor >= lower) {
        const day = cursor.toISOString().slice(0,10), id = `${row.id}:${day}`;
        result.push({id,day,amount:row.amount,currency:row.currency,settled:settled.has(id),...(row.walletId?{walletId:row.walletId}:{})});
      }
      if (row.frequency === "once") break;
      step++;
    }
  }
  return result.sort((a,b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
}
