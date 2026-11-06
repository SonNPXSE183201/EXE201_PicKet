import type { FinancePayload } from "@picket/domain";
type Collections =
  | "wallets"
  | "entries"
  | "budgets"
  | "bills"
  | "keepsakes"
  | "subscriptions";
/** Legacy export RPC includes tombstones. Project against independently loaded
 * live IDs, then require completeness and valid references before any download.
 * Never mutate the server payload or invent a missing financial record. */
export function projectLiveBackup<T extends Pick<FinancePayload, Collections>>(
  data: T,
  live: Record<Collections, Set<string>>,
): T {
  const projected = { ...data };
  for (const name of [
    "wallets",
    "entries",
    "budgets",
    "bills",
    "keepsakes",
    "subscriptions",
  ] as const) {
    if (!Array.isArray(data[name]))
      throw Error("Backup collection is missing.");
    Object.assign(projected, {
      [name]: data[name].filter((row) => live[name].has(row.id)),
    });
  }
  assertLiveBackup(projected, live);
  return projected;
}
/** Fail closed: the legacy backup contract cannot represent archive tombstones. */
export function assertLiveBackup(
  data: Pick<FinancePayload, Collections>,
  live: Record<Collections, Set<string>>,
) {
  for (const name of [
    "wallets",
    "entries",
    "budgets",
    "bills",
    "keepsakes",
    "subscriptions",
  ] as const) {
    if (
      !Array.isArray(data[name]) ||
      data[name].length !== live[name].size ||
      new Set(data[name].map((row) => row.id)).size !== data[name].length ||
      data[name].some((row) => !live[name].has(row.id))
    )
      throw Error("Backup contains unsupported archived or missing records.");
  }
  const wallets = new Set(data.wallets.map((w) => w.id));
  for (const row of data.entries)
    if (
      !wallets.has(row.walletId) ||
      (row.destinationId && !wallets.has(row.destinationId))
    )
      throw Error("Backup has an unavailable wallet reference.");
}
