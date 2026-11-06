import type { PicketApiClient } from "@picket/api-client";
import type { Transaction } from "@picket/domain";

/** Never silently calculate a balance from only the first API page. */
export async function loadAllTransactions(api: PicketApiClient, token: string) {
  const rows: Transaction[] = [];
  const ids = new Set<string>();
  for (let offset = 0; offset < 100000; offset += 100) {
    const { transactions } = await api.listTransactions(token, {
      limit: 100,
      offset,
    });
    for (const row of transactions) {
      if (!ids.has(row.id)) {
        ids.add(row.id);
        rows.push(row);
      }
    }
    if (transactions.length < 100) return rows;
  }
  throw new Error("Dữ liệu quá lớn để tổng hợp. Hãy thu hẹp khoảng thời gian.");
}
