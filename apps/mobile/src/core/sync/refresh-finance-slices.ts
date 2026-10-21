type Refresh = () => Promise<void>;

export function refreshFinanceSlices(refresh: {
  profile: Refresh;
  accounts: Refresh;
  transactions: Refresh;
  budgets: Refresh;
  bills: Refresh;
  subscriptions: Refresh;
}, tables?: readonly string[]) {
  const affected: Record<string, readonly (keyof typeof refresh)[]> = {
    profiles: ["profile"], user_preferences: ["profile"],
    wallets: ["accounts", "transactions"], categories: ["transactions", "budgets"],
    transactions: ["transactions", "accounts", "budgets"],
    transaction_splits: ["transactions", "budgets"], budgets: ["budgets"],
  };
  // Polling/reconnect still refresh everything. Unknown future events fail safe.
  const keys = !tables?.length || tables.some(table => !affected[table])
    ? Object.keys(refresh) as (keyof typeof refresh)[]
    : [...new Set(tables.flatMap(table => affected[table]))];
  return Promise.all(keys.map(key => refresh[key]())).then(() => undefined);
}
