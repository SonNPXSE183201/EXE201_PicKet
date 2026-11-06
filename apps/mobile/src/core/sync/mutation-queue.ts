import * as SQLite from "expo-sqlite";
import { decryptLocalPayload, encryptLocalPayload, withLocalOwnerAccess, isOfflineCacheOwnerRetired } from "./offline-cache";
import {createMutationQueueStore,eraseMutationQueueOwner} from "./mutation-queue-store";
import {mutationQueueSchema} from "./mutation-queue-schema";

export type { MutationKind, PendingMutation, MutationConflict } from "./mutation-queue-store";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
const queueListeners = new Set<() => void>();

function notifyQueueChanged() {
  for (const listener of queueListeners) listener();
}

export function subscribeToMutationQueue(listener: () => void) {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-sync.db").then(async (db) => {
    await db.execAsync(mutationQueueSchema);
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(pending_mutations)",
    );
    if (!columns.some((column) => column.name === "user_id")) {
      await db.execAsync("ALTER TABLE pending_mutations ADD COLUMN user_id TEXT");
    }
    if (!columns.some((column) => column.name === "entity_key")) {
      await db.execAsync("ALTER TABLE pending_mutations ADD COLUMN entity_key TEXT");
    }
    // Legacy rows cannot be safely attributed after another account signs in.
    await db.runAsync(
      "DELETE FROM pending_mutations WHERE user_id IS NULL OR user_id = ''",
    );
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS pending_mutations_owner_idx
        ON pending_mutations(user_id, created_at, id);
      CREATE INDEX IF NOT EXISTS pending_mutations_entity_idx
        ON pending_mutations(user_id, entity_key);
      CREATE INDEX IF NOT EXISTS mutation_conflicts_owner_idx
        ON mutation_conflicts(user_id, failed_at, id);
    `);
    return db;
  });
  const attempt = databasePromise;
  try { return await attempt; }
  catch(error) { if(databasePromise === attempt) databasePromise = null; throw error; }
}

function newId() {
  return `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const store=createMutationQueueStore({database,encrypt:encryptLocalPayload,decrypt:decryptLocalPayload,newId,notify:notifyQueueChanged,access:withLocalOwnerAccess});
export const {enqueueMutation,listPendingMutations,removeMutation,markMutationRetry,moveMutationToConflict,listMutationConflicts,removeMutationConflict,retryMutationConflict,listMutationEntityMappings,saveMutationEntityMapping}=store;

async function ownerCount(owner:string,read:()=>Promise<number>){
 try{return await read();}catch(error){if(await isOfflineCacheOwnerRetired(owner))return 0;throw error;}
}
export const pendingMutationCount=(owner:string)=>ownerCount(owner,()=>store.pendingMutationCount(owner));
export const mutationConflictCount=(owner:string)=>ownerCount(owner,()=>store.mutationConflictCount(owner));

export async function purgeRetiredMutationOwner(owner:string){
 if(!await isOfflineCacheOwnerRetired(owner))throw Error("Owner cache must be retired before purging outbox");
 await eraseMutationQueueOwner(await database(),owner);
 notifyQueueChanged();
}
