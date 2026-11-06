type FilterableTransaction = {
  title: string; note: string; kind: string; accountId: string;
  destinationAccountId: string | null; categoryId: string | null; occurredAt: string;
};
export interface TransactionFilters {
  query?: string; kind?: string; accountId?: string; categoryId?: string; month?: string; day?: string; currency?: string; timeZone?: string;
}

export function filterTransactions<T extends FilterableTransaction>(
  rows: T[], filters: TransactionFilters, categoryNames: Record<string, string> = {}, accountCurrencies: Record<string, string> = {},
): T[] {
  if (filters.day && (!/^\d{4}-\d{2}-\d{2}$/.test(filters.day) || !Number.isFinite(Date.parse(filters.day + "T00:00:00Z")) || new Date(filters.day + "T00:00:00Z").toISOString().slice(0, 10) !== filters.day)) return [];
  const dayFormatter = filters.day && filters.timeZone ? new Intl.DateTimeFormat("en-US", { timeZone: filters.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }) : null;
  const query = filters.query?.trim().toLocaleLowerCase("vi-VN") ?? "";
  const monthFormatter=filters.timeZone ? new Intl.DateTimeFormat("en-US",{timeZone:filters.timeZone,year:"numeric",month:"2-digit"}) : null;
  return rows.filter((row) => {
    if (filters.currency && accountCurrencies[row.accountId] !== filters.currency) return false;
    if (filters.day) {
      let day = row.occurredAt.slice(0, 10);
      if (dayFormatter) {
        const date = new Date(row.occurredAt);
        if (!Number.isFinite(date.getTime())) return false;
        const parts = dayFormatter.formatToParts(date);
        day = `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
      }
      if (day !== filters.day) return false;
    }
    if (filters.kind && row.kind !== filters.kind) return false;
    if (filters.accountId && row.accountId !== filters.accountId && row.destinationAccountId !== filters.accountId) return false;
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.month) {
      let month=row.occurredAt.slice(0,7);
      if(monthFormatter) {
        const date=new Date(row.occurredAt);
        if(!Number.isFinite(date.getTime()))return false;
        const parts=monthFormatter.formatToParts(date);
        month=`${parts.find(part=>part.type==="year")?.value}-${parts.find(part=>part.type==="month")?.value}`;
      }
      if(month!==filters.month)return false;
    }
    return !query || `${row.title} ${row.note} ${categoryNames[row.categoryId ?? ""] ?? ""}`.toLocaleLowerCase("vi-VN").includes(query);
  });
}
