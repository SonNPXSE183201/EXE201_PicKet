import type { MutationKind } from "@/core/sync/mutation-queue";

/**
 * Signals that a safe, idempotent write was persisted locally and will be
 * retried by SyncProvider. It is deliberately distinct from a request error:
 * callers should inform the user that no data has been lost.
 */
export class OfflineQueuedError extends Error {
  constructor(readonly kind: MutationKind) {
    super("Thay đổi đã được lưu trên thiết bị và đang chờ đồng bộ.");
    this.name = "OfflineQueuedError";
  }
}

export function isOfflineQueuedError(error: unknown): error is OfflineQueuedError {
  return error instanceof OfflineQueuedError;
}
