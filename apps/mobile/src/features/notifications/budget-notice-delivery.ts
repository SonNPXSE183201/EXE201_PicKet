type DeliveryIO = {
  read(owner: string): Promise<string[]>;
  save(owner: string, ids: string[]): Promise<void>;
  show(owner: string, id: string, isCurrent: () => boolean): Promise<void>;
};

/** Serialized owner/month ledger; a successful OS request is not repeated on recalculation. */
export function createBudgetNoticeDelivery(io: DeliveryIO) {
  let pending = Promise.resolve();
  const acknowledged = new Map<string, Set<string>>();
  return {
    deliver(owner: string, ids: string[], isCurrent = () => true): Promise<void> {
      const operation = pending.catch(() => undefined).then(async () => {
        if (!isCurrent()) return;
        const stored = await io.read(owner);
        const seen = new Set([...stored, ...(acknowledged.get(owner) ?? [])]);
        acknowledged.set(owner, seen);
        const persist = () => io.save(owner, [...seen].slice(-500));
        if (seen.size > stored.length) await persist();
        for (const id of new Set(ids)) {
          if (!isCurrent()) return;
          if (!/^budget:[A-Za-z0-9_-]+:\d{4}-(0[1-9]|1[0-2])$/.test(id) || seen.has(id)) continue;
          await io.show(owner, id, isCurrent);
          seen.add(id);
          await persist();
        }
      });
      pending = operation;
      return operation;
    },
  };
}
