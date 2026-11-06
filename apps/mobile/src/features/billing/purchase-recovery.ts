/** Foreground checkout recovery must bypass the normal background refresh interval. */
export function createPurchaseRecovery(read: () => Promise<boolean>, now = Date.now) {
  let active = true;
  let running = false;
  let queued = false;
  let lastSuccess: number | null = null;
  return {
    async refresh(force = false) {
      if (!active) return;
      if (running) { queued ||= force; return; }
      if (!force && lastSuccess !== null && now() - lastSuccess < 12 * 60 * 60 * 1000) return;
      running = true;
      try {
        do {
          queued = false;
          try { if (await read()) lastSuccess = now(); } catch { /* Retry at the next resume. */ }
        } while (active && queued);
      } finally { running = false; }
    },
    stop() { active = false; queued = false; },
  };
}
