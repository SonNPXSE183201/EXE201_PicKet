import type { Budget, Transaction, TransactionSplit } from "@picket/domain";

export interface BudgetOverview {
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
}

export function budgetOverview(budget: Budget, month: string, transactions: Transaction[], periodLimit: number | null, splits: TransactionSplit[] = []): BudgetOverview {
  const limit = periodLimit ?? budget.defaultLimit;
  const byId = new Map(transactions.map((item) => [item.id, item]));
  const splitsByTransaction = new Map<string, TransactionSplit[]>();
  for (const split of splits) splitsByTransaction.set(split.transactionId, [...(splitsByTransaction.get(split.transactionId) ?? []), split]);
  const categoryAmount = (item: Transaction) => {
    const parts = splitsByTransaction.get(item.id);
    return parts?.length ? parts.filter((part) => part.categoryId === budget.categoryId).reduce((sum, part) => sum + part.amount, 0)
      : item.categoryId === budget.categoryId ? item.amount : 0;
  };
  const spent = transactions.reduce((total, item) => {
    if (item.occurredAt.slice(0, 7) !== month) return total;
    if (item.kind === "expense") return total + categoryAmount(item);
    if (item.kind === "refund" && item.refundOfTransactionId) {
      const original = byId.get(item.refundOfTransactionId);
      if (original?.kind === "expense") {
        const refundParts = splitsByTransaction.get(item.id);
        return total - (refundParts?.length ? categoryAmount(item) : Math.round(item.amount * categoryAmount(original) / original.amount));
      }
    }
    return total;
  }, 0);
  return { limit, spent, remaining: limit - spent, percent: limit > 0 ? Math.round(spent / limit * 100) : 0 };
}
