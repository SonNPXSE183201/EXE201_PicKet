type Driver = {
  isRetired(owner: string): Promise<boolean>;
  retire(owner: string): Promise<void>;
  resume(owner: string): Promise<void>;
};

export function createOwnerCacheLifecycle(driver: Driver) {
  const queues = new Map<string, Promise<unknown>>();
  const blocked = new Set<string>();
  const generations = new Map<string, number>();
  function validate(owner: string) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(owner)) throw Error("Invalid cache owner");
  }
  function enqueue<T>(owner: string, operation: () => Promise<T>): Promise<T> {
    const previous = queues.get(owner) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    queues.set(owner, next);
    void next.finally(() => {
      if (queues.get(owner) === next) queues.delete(owner);
    }).catch(() => undefined);
    return next;
  }
  function invalidate(owner: string) {
    blocked.add(owner);
    generations.set(owner, (generations.get(owner) ?? 0) + 1);
  }
  return {
    async isRetired(owner: string): Promise<boolean> {
      validate(owner);
      return blocked.has(owner) || await driver.isRetired(owner);
    },
    async recover(owner: string, verify: () => Promise<string | null>, isCurrent: () => boolean): Promise<boolean> {
      validate(owner);
      const generation = generations.get(owner) ?? 0;
      const current = () => isCurrent() && generation === (generations.get(owner) ?? 0);
      return enqueue(owner, async () => {
        if (!current()) return false;
        const retired = blocked.has(owner) || await driver.isRetired(owner);
        if (!current()) return false;
        const verifiedOwner = await verify();
        if (verifiedOwner !== owner || !current()) return false;
        if (!retired) return true;
        await driver.resume(owner);
        if (!current()) return false;
        // Old callbacks queued during verification cannot repopulate the empty cache.
        generations.set(owner, generation + 1);
        blocked.delete(owner);
        return true;
      });
    },
    async run<T>(owner: string, operation: () => Promise<T>): Promise<T> {
      validate(owner);
      if (blocked.has(owner)) throw Error("Owner cache is retired");
      const generation = generations.get(owner) ?? 0;
      return enqueue(owner, async () => {
        if (blocked.has(owner) || generation !== (generations.get(owner) ?? 0)) throw Error("Owner cache is retired");
        const retired = await driver.isRetired(owner);
        // Retirement can begin while the durable marker is being read.
        if (retired || blocked.has(owner) || generation !== (generations.get(owner) ?? 0)) throw Error("Owner cache is retired");
        return operation();
      });
    },
    async retire(owner: string): Promise<void> {
      validate(owner);
      // Synchronous invalidation rejects already queued work before any await.
      invalidate(owner);
      await enqueue(owner, () => driver.retire(owner));
    },
    async resume(owner: string): Promise<void> {
      validate(owner);
      invalidate(owner);
      const generation = generations.get(owner);
      await enqueue(owner, async () => {
        await driver.resume(owner);
        if (generation === generations.get(owner)) blocked.delete(owner);
      });
    },
  };
}
