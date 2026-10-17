import type { Transaction, TransactionSplit } from "@picket/domain";

export async function loadBudgetSplits(
  transactions: Transaction[],
  month: string,
  fetchBatch: (ids: string[]) => Promise<TransactionSplit[]>,
): Promise<TransactionSplit[]> {
  const byId = new Map(transactions.map((item) => [item.id, item]));
  const ids = new Set<string>();
  for (const item of transactions) {
    if (item.occurredAt.slice(0, 7) !== month) continue;
    if (item.kind === "expense") ids.add(item.id);
    if (item.kind === "refund" && item.refundOfTransactionId && byId.get(item.refundOfTransactionId)?.kind === "expense") {
      ids.add(item.id);
      ids.add(item.refundOfTransactionId);
    }
  }
  const all = [...ids];
  const splits: TransactionSplit[] = [];
  for (let index = 0; index < all.length; index += 25) {
    splits.push(...await fetchBatch(all.slice(index, index + 25)));
  }
  return splits;
}
