/** Initial URLs mount the app; later intents must wait for its nested Stack. */
export function latestInitialNativeIntent(path: string, activityUrl: string | null, nativeUrl: string | null) {
  // A launcher start has no VIEW data. Never reuse a previous activity's URL.
  return activityUrl ? nativeUrl ?? path : path;
}

export function createBootstrapIntentGate() {
  let mounted = false;
  let pending: { path: string; resolve(path: string): void } | null = null;
  return {
    redirect({ path, initial }: { path: string; initial: boolean }): string | Promise<string> {
      if (initial || mounted) return path;
      // Expo Router ignores an empty redirected warm path. A newer intent must
      // not be overwritten by an older one completing auth bootstrap later.
      pending?.resolve("");
      return new Promise<string>(resolve => { pending = { path, resolve }; });
    },
    ready() {
      mounted = true;
      const latest = pending;
      pending = null;
      latest?.resolve(latest.path);
    },
  };
}

export const bootstrapIntentGate = createBootstrapIntentGate();
