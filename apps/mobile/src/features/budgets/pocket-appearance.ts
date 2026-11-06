import { categoryArt } from "@/core/theme/category-art";

export const pocketTones = ["pocketCoral", "pocketMint", "pocketBlue", "pocketLilac"] as const;
export type PocketAppearance = { assetId: string; tone: typeof pocketTones[number] };
export type PocketAppearances = Record<string, PocketAppearance>;
function validId(id: string) { return /^[A-Za-z0-9_-]{1,200}$/.test(id) && !Object.hasOwn(Object.prototype, id); }
function checked(value: unknown): PocketAppearance {
  if (!value || typeof value !== "object") throw new Error("Invalid pocket appearance");
  const data = value as PocketAppearance;
  if (!validId(data.assetId) || !pocketTones.includes(data.tone)) throw new Error("Invalid pocket appearance");
  return { assetId: data.assetId, tone: data.tone };
}
function parse(owner: string, value: unknown): PocketAppearances {
  if (value === null || value === undefined) return {};
  const data = value as { version: number; owner: string; pockets: PocketAppearances };
  if (!data || data.version !== 1 || data.owner !== owner || !data.pockets || typeof data.pockets !== "object" || Array.isArray(data.pockets) || Object.keys(data.pockets).length > 500) throw new Error("Invalid pocket preferences");
  return Object.fromEntries(Object.entries(data.pockets).map(([id, appearance]) => {
    if (!validId(id)) throw new Error("Invalid pocket ID");
    return [id, checked(appearance)];
  }));
}
export function defaultPocketAppearance(id: string, name?: string): PocketAppearance {
  const hash = [...id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  const index = hash % pocketTones.length;
  return { assetId: name ? categoryArt(null, name) : ["food", "transport", "leisure", "shopping"][index], tone: pocketTones[index] };
}
export function createPocketAppearanceStore(storage: { read(owner: string): Promise<unknown>; write(owner: string, value: unknown): Promise<void> }) {
  const queues = new Map<string, Promise<unknown>>();
  const listeners = new Map<string, Set<() => void>>();
  function run<T>(owner: string, action: () => Promise<T>): Promise<T> {
    if (!owner) return Promise.reject(new Error("Missing preference owner"));
    const next = (queues.get(owner) ?? Promise.resolve()).catch(() => undefined).then(action);
    queues.set(owner, next);
    void next.finally(() => { if (queues.get(owner) === next) queues.delete(owner); }).catch(() => undefined);
    return next;
  }
  return {
    load: (owner: string) => run(owner, async () => parse(owner, await storage.read(owner))),
    save: (owner: string, id: string, value: PocketAppearance) => run(owner, async () => {
      if (!validId(id)) throw new Error("Invalid pocket ID");
      const appearance = checked(value);
      const pockets = { ...parse(owner, await storage.read(owner)), [id]: appearance };
      if (Object.keys(pockets).length > 500) throw new Error("Pocket preference capacity reached");
      await storage.write(owner, { version: 1, owner, pockets });
      for (const listener of listeners.get(owner) ?? []) listener();
    }),
    subscribe(owner: string, listener: () => void) {
      const set = listeners.get(owner) ?? new Set<() => void>();
      set.add(listener); listeners.set(owner, set);
      return () => { set.delete(listener); if (!set.size) listeners.delete(owner); };
    },
  };
}
