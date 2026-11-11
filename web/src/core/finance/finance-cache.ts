import { revalidateTag } from "next/cache";

import { financeCacheTag } from "./finance-fetch";

export function invalidateFinanceCache(accessToken: string) {
  // Financial mutations and realtime refreshes require fresh reads immediately.
  revalidateTag(financeCacheTag(accessToken), { expire: 0 });
}
