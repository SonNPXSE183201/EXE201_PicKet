/**
 * Sign-up timing for QA builds: `adb logcat -s ReactNativeJS | findstr PicketPerf`.
 * Release builds keep console.info, so the numbers are visible on real devices.
 */
export function perfStart(): number {
  return Date.now();
}

export function perfLog(step: string, startedAt: number): void {
  console.info(`[PicketPerf] ${step} ${Date.now() - startedAt}ms`);
}

/** Runs `work` and logs its duration under `step`, whether it resolves or rejects. */
export async function timed<T>(step: string, work: () => Promise<T>): Promise<T> {
  const startedAt = perfStart();
  try {
    return await work();
  } finally {
    perfLog(step, startedAt);
  }
}
