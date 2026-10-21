/** Existing Supabase reconciliation RPC rejects dates after current_date (UTC). */
import type { Transaction } from "@picket/domain";
export function latestStatementDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
export function validStatementDay(value: string, latest: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value &&
    value <= latest
  );
}
export function statementCandidates(
  rows: Transaction[],
  wallet: string,
  day: string,
) {
  return rows.filter(
    (t) =>
      !t.deletedAt &&
      (t.accountId === wallet || t.destinationAccountId === wallet) &&
      t.occurredAt.slice(0, 10) <= day,
  );
}
export function clearedBalance(
  opening: number,
  wallet: string,
  rows: Transaction[],
  selected: string[],
) {
  const ids = new Set(selected);
  return (
    opening +
    rows
      .filter((t) => ids.has(t.id))
      .reduce(
        (sum, t) =>
          sum +
          (t.accountId === wallet
            ? t.kind === "income" || t.kind === "refund"
              ? t.amount
              : -t.amount
            : t.kind === "transfer" && t.destinationAccountId === wallet
              ? t.amount
              : 0),
        0,
      )
  );
}
