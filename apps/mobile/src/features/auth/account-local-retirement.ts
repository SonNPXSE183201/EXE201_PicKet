import { retireOfflineCacheOwner } from "@/core/sync/offline-cache";
import { purgeRetiredMutationOwner } from "@/core/sync/mutation-queue";
import { purgeRetiredCaptureOwner } from "@/core/ocr/capture-storage";
import { purgeRetiredReceiptOwner } from "@/core/receipts/pending-receipt";
import { purgeRetiredKeepsakeOwner } from "@/features/keepsakes/keepsake-store";
import { purgeRetiredOwnerPreferences } from "@/features/notifications/reminders";

export async function retireAccountLocalData(owner: string) {
  // The durable fence first drains both cache and outbox operations. Raw erasure
  // bypasses the fence only after it is committed; failures stop remote deletion.
  await retireOfflineCacheOwner(owner);
  await purgeRetiredMutationOwner(owner);
  await purgeRetiredCaptureOwner(owner);
  await purgeRetiredReceiptOwner(owner);
  await purgeRetiredKeepsakeOwner(owner);
  await purgeRetiredOwnerPreferences(owner);
}
