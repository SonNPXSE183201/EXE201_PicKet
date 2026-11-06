import { expandSchedules, type CashflowSchedule } from "./schedules";
export type ScheduleDocument = { schemaVersion: 1; revision: number; schedules: CashflowSchedule[] };
function checkSchedule(value: CashflowSchedule) {
  expandSchedules([value],value.startDay,value.startDay);
  return { id: value.id, startDay: value.startDay, ...(value.endDay ? {endDay:value.endDay} : {}),
    frequency:value.frequency,amount:value.amount,currency:value.currency,active:value.active,...(value.walletId?{walletId:value.walletId}:{}) };
}
export function parseScheduleDocument(value: unknown): ScheduleDocument {
  if (value == null) return { schemaVersion:1, revision:0, schedules:[] };
  const doc = value as ScheduleDocument;
  if (doc.schemaVersion !== 1 || !Number.isSafeInteger(doc.revision) || doc.revision < 0 || !Array.isArray(doc.schedules) || doc.schedules.length > 1000) throw new Error("Invalid schedule storage");
  const ids = new Set<string>();
  const schedules = doc.schedules.map(row => {
    if (!row || ids.has(row.id)) throw new Error("Invalid schedule identity");
    ids.add(row.id); return checkSchedule(row);
  });
  return {schemaVersion:1,revision:doc.revision,schedules};
}
export function createScheduleStore(storage: { read(owner: string): Promise<unknown>; write(owner: string, value: ScheduleDocument): Promise<void> }) {
  const queues = new Map<string,Promise<unknown>>();
  const checkOwner = (owner: string) => { if (!/^[A-Za-z0-9_-]{1,200}$/.test(owner)) throw new Error("Invalid schedule owner"); };
  async function load(owner: string) {
    checkOwner(owner); await queues.get(owner)?.catch(()=>undefined);
    return parseScheduleDocument(await storage.read(owner));
  }
  async function mutate(owner: string, revision: number, change: (rows: CashflowSchedule[])=>CashflowSchedule[]) {
    checkOwner(owner);
    const operation = (queues.get(owner) ?? Promise.resolve()).catch(()=>undefined).then(async()=>{
      const doc = parseScheduleDocument(await storage.read(owner));
      if (!Number.isSafeInteger(revision) || revision !== doc.revision || revision === Number.MAX_SAFE_INTEGER) throw new Error("Schedule changed; reload before editing");
      const next = parseScheduleDocument({...doc,revision:revision+1,schedules:change(doc.schedules)});
      await storage.write(owner,next); return next;
    });
    queues.set(owner,operation);
    try { return await operation; } finally { if (queues.get(owner) === operation) queues.delete(owner); }
  }
  return { load,
    save: (owner:string, revision:number, schedule:CashflowSchedule) => mutate(owner,revision,rows=>[...rows.filter(row=>row.id!==schedule.id),checkSchedule(schedule)]),
    remove: (owner:string, revision:number, id:string) => mutate(owner,revision,rows=>rows.filter(row=>row.id!==id)),
  };
}
