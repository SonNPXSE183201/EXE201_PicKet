type DeliveryIO<Context> = {
  read(owner: string): Promise<string[]>;
  save(owner: string, ids: string[]): Promise<void>;
  show(owner: string, id: string, isCurrent: () => boolean, context:Context|undefined): Promise<void>;
};

/** Logout may finish cancellation before an in-flight OS schedule resolves. */
export async function scheduleOwnedReminder(identifier: string, isCurrent: () => boolean, io: {
  schedule(identifier: string): Promise<void>;
  cancel(identifier: string): Promise<void>;
}): Promise<boolean> {
  if (!isCurrent()) return false;
  await io.schedule(identifier);
  if (!isCurrent()) {
    await io.cancel(identifier);
    return false;
  }
  return true;
}

/** Serialized owner/month ledger; a successful OS request is not repeated on recalculation. */
export function createBudgetNoticeDelivery<Context=undefined>(io: DeliveryIO<Context>) {
  let pending = Promise.resolve();
  const acknowledged = new Map<string, Set<string>>();
  return {
    forgetOwner(owner:string){acknowledged.delete(owner);},
    deliver(owner: string, ids: string[], isCurrent = () => true,context?:Context): Promise<void> {
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
          await io.show(owner, id, isCurrent,context);
          seen.add(id);
          await persist();
        }
      });
      pending = operation;
      return operation;
    },
  };
}
