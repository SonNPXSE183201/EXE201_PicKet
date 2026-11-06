import type { Budget, Transaction, TransactionSplit } from "@picket/domain";
import { budgetOverview } from "@/core/local/budget-overview";

/** Share the budget allocation rule, including explicit/proportional refunds. */
export function categorySpending(rows: Transaction[], month: string, splits: TransactionSplit[]) {
  const live = rows.filter(row => !row.deletedAt);
  const ids = new Set([...live.map(row => row.categoryId ?? "uncategorized"), ...splits.map(part => part.categoryId)]);
  return [...ids].map(id => ({ id, amount: budgetOverview({ categoryId: id === "uncategorized" ? null : id, defaultLimit: 0 } as unknown as Budget, month, live, null, splits).spent }))
    .filter(row => row.amount > 0).sort((a,b) => b.amount-a.amount);
}
