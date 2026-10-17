import * as Crypto from "expo-crypto";
import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { ReconciliationJournal, type PendingReconciliation } from "./reconciliation-journal";

export const reconciliationJournal = new ReconciliationJournal({
  read: async (owner) => (await readOfflineCache<PendingReconciliation[]>(owner, "reconciliation-requests"))?.value ?? [],
  write: (owner, rows) => writeOfflineCache(owner, "reconciliation-requests", rows),
  newId: () => Crypto.randomUUID(),
});
