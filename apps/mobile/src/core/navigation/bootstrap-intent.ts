/** Initial URLs mount the app; later intents must wait for its nested Stack. */
export function latestInitialNativeIntent(path: string, activityUrl: string | null) {
  // The prebuild plugin retains the newest Activity Intent, including launcher
  // intents without VIEW data. Expo's process-static URL can predate recreation.
  return activityUrl ?? path;
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
    notReady() {
      mounted = false;
    },
  };
}

export const bootstrapIntentGate = createBootstrapIntentGate();
