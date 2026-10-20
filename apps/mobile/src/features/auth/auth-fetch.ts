/** Bound only this project's auth transport. Keep SDK session removal/events intact. */
export function createAuthFetch(fetcher: typeof fetch, authUrl: string, timeoutMs = 10_000, authFetcher: typeof fetch = fetcher): typeof fetch {
  const base = new URL(authUrl);
  const authPath = base.pathname.replace(/\/$/, "") + "/";
  return async (input, init) => {
    const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input));
    if (url.origin !== base.origin || !url.pathname.startsWith(authPath)) return fetcher(input, init);

    const controller = new AbortController();
    const callerSignal = init?.signal ?? request?.signal;
    let phase: "request" | "body" = "request";
    let rejectAbort!: (error: Error) => void;
    const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
    const abort = () => {
      controller.abort();
      const error = new Error("Authentication request was interrupted. Please try again.");
      error.name = "AbortError";
      Object.assign(error, { authPhase: phase, authFailureReason: callerSignal?.aborted ? "caller" : "deadline" });
      rejectAbort(error);
    };
    const timer = setTimeout(abort, timeoutMs);
    callerSignal?.addEventListener("abort", abort, { once: true });
    if (callerSignal?.aborted) abort();
    try {
      return await Promise.race([
        aborted,
        (async () => {
          if (controller.signal.aborted) return aborted;
          const response = await authFetcher(input, { ...init, signal: controller.signal });
          // Auth parses JSON after fetch returns. Buffer under the same deadline
          // so stalled bodies cannot leave the SDK auth lock held indefinitely.
          if ([204, 205, 304].includes(response.status)) return response;
          phase = "body";
          const body = await response.text();
          return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
        })(),
      ]);
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", abort);
    }
  };
}
