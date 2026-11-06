import type { Budget, Transaction, TransactionSplit } from "@picket/domain";
import { budgetOverview } from "@/core/local/budget-overview";

/** Match Planning: exclude archives, allocate splits and deduct linked refunds. */
export function budgetWarnings(input: {
  budgets: Budget[];
  transactions: Transaction[];
  month: string;
  splits?: TransactionSplit[];
  periodLimits?: Record<string, number>;
}): Budget[] {
  const live = input.transactions.filter(item => !item.deletedAt);
  const splits = (input.splits ?? []).filter(item => !item.deletedAt);
  return input.budgets.filter(budget => {
    if (!budget.active || budget.deletedAt) return false;
    const { spent, limit } = budgetOverview(budget, input.month, live, input.periodLimits?.[budget.id] ?? null, splits);
    return limit > 0 && spent >= limit * budget.alertPercent / 100;
  });
}
