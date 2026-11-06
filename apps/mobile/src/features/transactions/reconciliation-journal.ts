export type PendingReconciliation = { payload: string; id: string };
type JournalStore = {
  read(owner: string): Promise<PendingReconciliation[]>;
  write(owner: string, rows: PendingReconciliation[]): Promise<void>;
  newId(): string;
};

/** Persist before sending. Never evict an ambiguous write just to make room. */
export class ReconciliationJournal {
  private readonly pending = new Map<string, Promise<unknown>>();
  constructor(private readonly store: JournalStore) {}

  private async serialized<T>(owner: string, operation: (rows: PendingReconciliation[]) => Promise<T>): Promise<T> {
    if (!owner) throw new Error("Missing reconciliation owner");
    const previous = this.pending.get(owner) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      const rows = await this.store.read(owner);
      if (!Array.isArray(rows) || rows.some((row) => !row || typeof row.payload !== "string" || typeof row.id !== "string" || !row.id)) {
        throw new Error("Invalid reconciliation journal");
      }
      return operation(rows);
    });
    this.pending.set(owner, next);
    try { return await next; }
    finally { if (this.pending.get(owner) === next) this.pending.delete(owner); }
  }

  list(owner: string): Promise<PendingReconciliation[]> {
    return this.serialized(owner, async (rows) => rows.map((row) => ({ ...row })));
  }

  reserve(owner: string, payload: string, expectedId?: string): Promise<string> {
    return this.serialized(owner, async (rows) => {
      const existing = rows.find((row) => row.payload === payload);
      if (expectedId !== undefined && existing?.id !== expectedId) throw new Error("Saved reconciliation is no longer pending");
      if (existing) return existing.id;
      if (rows.length >= 100) throw new Error("Too many unconfirmed reconciliations");
      const id = this.store.newId();
      await this.store.write(owner, [...rows, { payload, id }]);
      return id;
    });
  }

  complete(owner: string, payload: string, id: string): Promise<void> {
    return this.serialized(owner, async (rows) => {
      const next = rows.filter((row) => row.payload !== payload || row.id !== id);
      if (next.length !== rows.length) await this.store.write(owner, next);
    });
  }
}
