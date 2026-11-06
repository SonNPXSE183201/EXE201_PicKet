const PAGE_SIZE = 100;

export async function loadAllTransactions<T>(
  fetchPage: (options: { limit: number; offset: number; signal?: AbortSignal }) => Promise<T[]>,
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    if (signal?.aborted) throw new Error("Transaction load aborted.");
    const page = await fetchPage({ limit: PAGE_SIZE, offset: rows.length, signal });
    if (signal?.aborted) throw new Error("Transaction load aborted.");
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}
