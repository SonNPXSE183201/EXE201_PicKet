import { isOfflineQueuedError } from "../../core/sync/offline-queued-error";

export async function runBulkAction(
  ids: string[],
  action: (id: string) => Promise<void>,
) {
  const completedIds: string[] = [];
  const queuedIds: string[] = [];
  const failedIds: string[] = [];
  for (const id of new Set(ids)) {
    try {
      await action(id);
      completedIds.push(id);
    } catch (error) {
      if (isOfflineQueuedError(error)) queuedIds.push(id);
      else failedIds.push(id);
    }
  }
  return { completedIds, queuedIds, failedIds };
}
