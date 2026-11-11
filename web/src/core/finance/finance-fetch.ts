import { createHash } from "node:crypto";

// Share frequently repeated reads across user screens, not across sessions.
// Account access, entitlements, exports and other sensitive reads stay uncached.
export const financeReadCacheSeconds = 15;
const cachedPaths = [
  "/v1/me",
  "/v1/accounts",
  "/v1/categories",
  "/v1/transactions",
  "/v1/transaction-splits",
  "/v1/budgets",
  "/v1/planning",
] as const;

export function financeCacheTag(accessToken: string) {
  return `user-finance:${createHash("sha256").update(accessToken).digest("hex")}`;
}

export function createFinanceFetch(
  apiBaseUrl: string,
  accessToken: string,
  invalidate: () => void,
  options: { fetch?: typeof fetch; cacheReads?: boolean } = {},
): typeof fetch {
  const fetcher = options.fetch ?? globalThis.fetch;
  const base = apiBaseUrl.replace(/\/$/, "");
  const apiUrl = new URL(`${base}/v1/`);
  const reads = new Set(cachedPaths.map((path) => `${base}${path}`));
  const tag = financeCacheTag(accessToken);

  return async (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? String(input));
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers ?? request?.headers);
    const ownRequest = url.origin === apiUrl.origin &&
      url.pathname.startsWith(apiUrl.pathname) &&
      headers.get("authorization") === `Bearer ${accessToken}`;
    const cached = options.cacheReads !== false && init?.cache !== "no-store" &&
      ownRequest && method === "GET" &&
      reads.has(`${url.origin}${url.pathname}`);
    const requestOptions: RequestInit & {
      next?: { revalidate: number; tags: string[] };
    } = {
      ...init,
      cache: cached ? "force-cache" : "no-store",
      next: cached ? { revalidate: financeReadCacheSeconds, tags: [tag] } : undefined,
    };

    try {
      return await fetcher(input, requestOptions);
    } finally {
      // A dropped response can follow a committed write. Invalidate on failed
      // attempts too, so a retry never reads a pre-mutation balance/version.
      if (ownRequest && method !== "GET" && method !== "HEAD") invalidate();
    }
  };
}
