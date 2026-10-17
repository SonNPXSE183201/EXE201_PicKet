/** A confirmed write is successful even when its subsequent read refresh fails. */
export async function runReconciliationAttempt<T>(mutate: () => Promise<T>, refresh: () => Promise<unknown>): Promise<{ result: T; refreshFailed: boolean }> {
  const result = await mutate();
  try { await refresh(); return { result, refreshFailed: false }; }
  catch { return { result, refreshFailed: true }; }
}

export function isValidStatementDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type ReconciliationRequest = { accountId: string; statementDate: string; statementBalance: number; selectedTransactionIds: string[]; reason: string };

/** Recovery must never replace saved financial fields with current form values. */
export function decodeReconciliationRequest(payload: string): ReconciliationRequest | null {
  try {
    const value = JSON.parse(payload);
    const keys = ["accountId", "statementDate", "statementBalance", "selectedTransactionIds", "reason"];
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key)) ||
        typeof value.accountId !== "string" || !value.accountId || typeof value.statementDate !== "string" || !isValidStatementDate(value.statementDate, "9999-12-31") ||
        !Number.isSafeInteger(value.statementBalance) || Math.abs(value.statementBalance) > 9_000_000_000_000 || typeof value.reason !== "string" ||
        !Array.isArray(value.selectedTransactionIds) || value.selectedTransactionIds.some((id: unknown) => typeof id !== "string" || !id) || new Set(value.selectedTransactionIds).size !== value.selectedTransactionIds.length) return null;
    return value as ReconciliationRequest;
  } catch { return null; }
}
