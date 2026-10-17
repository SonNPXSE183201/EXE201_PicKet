export const financeRealtimeTables = [
  { table: "profiles", ownerColumn: "id" },
  { table: "user_preferences", ownerColumn: "user_id" },
  { table: "wallets", ownerColumn: "user_id" },
  { table: "categories", ownerColumn: "user_id" },
  { table: "transactions", ownerColumn: "user_id" },
  { table: "transaction_splits", ownerColumn: "user_id" },
  { table: "budgets", ownerColumn: "user_id" },
] as const;

export function shouldRefreshFromRealtime(input: {
  pendingCount: number;
  syncing: boolean;
}) {
  return input.pendingCount === 0 && !input.syncing;
}
let financeChannelSequence = 0;

/** Supabase caches channels by topic; old unsubscribe/removal is asynchronous. */
export function nextFinanceChannelName(userId: string): string {
  return `finance-sync-${userId}-${++financeChannelSequence}`;
}
