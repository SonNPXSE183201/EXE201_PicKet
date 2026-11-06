import type { Budget, Transaction, TransactionSplit } from "@picket/domain";

export interface BudgetOverview {
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
}

export function budgetOverview(budget: Budget, month: string, transactions: Transaction[], periodLimit: number | null, splits: TransactionSplit[] = []): BudgetOverview {
  const limit = periodLimit ?? budget.defaultLimit;
  const live = transactions.filter(item => !item.deletedAt);
  const byId = new Map(live.map((item) => [item.id, item]));
  const splitsByTransaction = new Map<string, TransactionSplit[]>();
  for (const split of splits) if (!split.deletedAt) splitsByTransaction.set(split.transactionId, [...(splitsByTransaction.get(split.transactionId) ?? []), split]);
  const categoryAmount = (item: Transaction) => {
    const parts = splitsByTransaction.get(item.id);
    return parts?.length ? parts.filter((part) => part.categoryId === budget.categoryId).reduce((sum, part) => sum + part.amount, 0)
      : item.categoryId === budget.categoryId ? item.amount : 0;
  };
  const spent = live.reduce((total, item) => {
    if (item.occurredAt.slice(0, 7) !== month) return total;
    if (item.kind === "expense") return total + categoryAmount(item);
    if (item.kind === "refund") {
      const refundParts = splitsByTransaction.get(item.id);
      if (refundParts?.length) return total - categoryAmount(item);
      const original = item.refundOfTransactionId ? byId.get(item.refundOfTransactionId) : null;
      if (original?.kind === "expense") {
        const allocation = categoryAmount(original);
        if (!Number.isSafeInteger(item.amount) || item.amount < 0 || !Number.isSafeInteger(allocation) || allocation < 0 || !Number.isSafeInteger(original.amount) || original.amount <= 0) throw new Error("Invalid refund allocation");
        // Integer half-up rounding matches SQL round(numeric), without a lossy product.
        const denominator = BigInt(original.amount);
        const refund = Number((BigInt(item.amount) * BigInt(allocation) + denominator / 2n) / denominator);
        return total - refund;
      }
    }
    return total;
  }, 0);
  return { limit, spent, remaining: limit - spent, percent: limit > 0 ? Math.round(spent / limit * 100) : 0 };
}
