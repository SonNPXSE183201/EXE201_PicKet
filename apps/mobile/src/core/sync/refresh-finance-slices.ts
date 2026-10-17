type Refresh = () => Promise<void>;

export function refreshFinanceSlices(refresh: {
  profile: Refresh;
  accounts: Refresh;
  transactions: Refresh;
  budgets: Refresh;
  bills: Refresh;
  subscriptions: Refresh;
}) {
  return Promise.all(Object.values(refresh).map((run) => run())).then(() => undefined);
}
