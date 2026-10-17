type FilterableTransaction = {
  title: string; note: string; kind: string; accountId: string;
  destinationAccountId: string | null; categoryId: string | null; occurredAt: string;
};
export interface TransactionFilters {
  query?: string; kind?: string; accountId?: string; categoryId?: string; month?: string;
}

export function filterTransactions<T extends FilterableTransaction>(
  rows: T[], filters: TransactionFilters, categoryNames: Record<string, string> = {},
): T[] {
  const query = filters.query?.trim().toLocaleLowerCase("vi-VN") ?? "";
  return rows.filter((row) => {
    if (filters.kind && row.kind !== filters.kind) return false;
    if (filters.accountId && row.accountId !== filters.accountId && row.destinationAccountId !== filters.accountId) return false;
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.month && row.occurredAt.slice(0, 7) !== filters.month) return false;
    return !query || `${row.title} ${row.note} ${categoryNames[row.categoryId ?? ""] ?? ""}`.toLocaleLowerCase("vi-VN").includes(query);
  });
}
