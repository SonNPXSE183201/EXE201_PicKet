import type { Transaction } from "@picket/domain";
export interface TransactionFilters {
  q?: string;
  from?: string;
  to?: string;
  kind?: string;
  account?: string;
  category?: string;
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export function filterTransactions<
  T extends Pick<
    Transaction,
    | "title"
    | "note"
    | "kind"
    | "occurredAt"
    | "accountId"
    | "categoryId"
    | "deletedAt"
  >,
>(rows: T[], filters: TransactionFilters) {
  const q = normalize((filters.q ?? "").trim());
  return rows.filter((row) => {
    if (row.deletedAt) return false;
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(row.occurredAt));
    return (
      (!q || normalize(row.title + " " + (row.note ?? "")).includes(q)) &&
      (!filters.from || day >= filters.from) &&
      (!filters.to || day <= filters.to) &&
      (!filters.kind || row.kind === filters.kind) &&
      (!filters.account || row.accountId === filters.account) &&
      (!filters.category || row.categoryId === filters.category)
    );
  });
}
