import type { ReceiptDraftLine } from "./receipt-parser";

/** Only an interruption marker, never a pending photo/result to adopt. */
export function createPickerRecoveryStore(open: () => Promise<{
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...values: string[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...values: string[]): Promise<T | null>;
}>, access: <T>(owner:string, operation:()=>Promise<T>)=>Promise<T> = (_owner,operation)=>operation()) {
  let ready: ReturnType<typeof open> | null = null;
  function database() {
    ready ??= open().then(async db => {
      await db.execAsync("CREATE TABLE IF NOT EXISTS capture_picker_attempts (owner_id TEXT PRIMARY KEY NOT NULL, operation_id TEXT NOT NULL)");
      return db;
    }).catch(error => { ready = null; throw error; });
    return ready;
  }
  function validate(value: string) {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw new Error("Invalid picker recovery identity");
  }
  return {
    async begin(owner: string, operation: string) {
      validate(owner); validate(operation);
      await access(owner, async()=>{ await (await database()).runAsync("INSERT INTO capture_picker_attempts(owner_id,operation_id) VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET operation_id=excluded.operation_id", owner, operation); });
    },
    async pending(owner: string) {
      validate(owner);
      return access(owner, async()=>(await (await database()).getFirstAsync<{ operation_id: string }>("SELECT operation_id FROM capture_picker_attempts WHERE owner_id=?", owner)) !== null);
    },
    async complete(owner: string, operation: string) {
      validate(owner); validate(operation);
      await access(owner, async()=>{ await (await database()).runAsync("DELETE FROM capture_picker_attempts WHERE owner_id=? AND operation_id=?", owner, operation); });
    },
  };
}

export type CaptureSnapshot = {
  version: 1; id: string; imageRef: string; title: string; amount: string;
  purchasedAt: string; explicitDate: string | null; attachReceipt: boolean;
  provider: "manual" | "ml-kit" | "pp-ocr"; localConfidence: number;
  needsFallback: boolean; rawText: string | null; lineItems: ReceiptDraftLine[];
  fallbackStoragePath: string | null;
};

/** A damaged image must not make the intact text and date inaccessible. */
export async function restoreCaptureSnapshot(owner: string, snapshot: CaptureSnapshot,
  restoreImage: (owner: string, imageRef: string) => Promise<string>) {
  try { return { snapshot, imageUri: await restoreImage(owner, snapshot.imageRef), imageUnavailable: false }; }
  catch { return { snapshot, imageUri: null, imageUnavailable: true }; }
}
function validate(value: unknown): CaptureSnapshot {
  const d = value as CaptureSnapshot;
  if (!d || d.version !== 1 || !d.id || typeof d.id !== "string" || typeof d.imageRef !== "string" || !d.imageRef
    || typeof d.title !== "string" || typeof d.amount !== "string" || typeof d.purchasedAt !== "string"
    || !Number.isFinite(Date.parse(d.purchasedAt)) || !(d.explicitDate === null || typeof d.explicitDate === "string")
    || typeof d.attachReceipt !== "boolean" || !["manual", "ml-kit", "pp-ocr"].includes(d.provider)
    || !Number.isFinite(d.localConfidence) || typeof d.needsFallback !== "boolean" || !Array.isArray(d.lineItems)
    || !(d.rawText === null || typeof d.rawText === "string") || !(d.fallbackStoragePath === null || typeof d.fallbackStoragePath === "string")) {
    throw new Error("Invalid capture draft");
  }
  return d;
}

/** Serialize durable changes per owner, including reads and completion. */
export function createCaptureJournal(io: {
  read(owner: string): Promise<unknown>;
  write(owner: string, value: CaptureSnapshot | null): Promise<void>;
}) {
  const pending = new Map<string, Promise<unknown>>();
  const completed = new Set<string>();
  function enqueue<T>(owner: string, action: () => Promise<T>): Promise<T> {
    const operation = (pending.get(owner) ?? Promise.resolve()).catch(() => undefined).then(action);
    pending.set(owner, operation);
    void operation.finally(() => { if (pending.get(owner) === operation) pending.delete(owner); }).catch(() => undefined);
    return operation;
  }
  return {
    load: (owner: string) => enqueue(owner, async () => { const value = await io.read(owner); return value === null ? null : validate(value); }),
    save: (owner: string, value: CaptureSnapshot) => enqueue(owner, async () => {
      if (completed.has(`${owner}:${value.id}`)) return false;
      await io.write(owner, validate(value));
      return true;
    }),
    complete: (owner: string, id: string) => enqueue(owner, async () => {
      const value = await io.read(owner);
      if (value === null || validate(value).id !== id) return false;
      await io.write(owner, null);
      completed.add(`${owner}:${id}`);
      return true;
    }),
  };
}
