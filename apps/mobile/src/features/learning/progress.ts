import { curriculum, recordCompletion, type Completion } from "./curriculum";
import { reviewDueDays } from "./practice";
export type LearningProgress = { version: 1; completed: Completion[] };
function parseProgress(value: unknown, owner: string): LearningProgress {
  if (value === undefined || value === null) return { version: 1, completed: [] };
  const data = value as LearningProgress;
  if (data.version !== 1 || !Array.isArray(data.completed)) throw new Error("Unsupported learning progress");
  const ids = new Set<string>();
  for (const row of data.completed) {
    const key = `${row.lessonId}:${row.version}`;
    if (row.owner !== owner || ids.has(key) || row.xp !== 20 || !curriculum.lessons.some(lesson => lesson.lessonId === row.lessonId && lesson.version === row.version)) throw new Error("Invalid learning history");
    ids.add(key);
    if(row.completedAt!==undefined && (typeof row.completedAt!=="string"||!Number.isFinite(Date.parse(row.completedAt))))throw new Error("Invalid completion date");
    if(row.reviewedOffsets!==undefined && (!Array.isArray(row.reviewedOffsets)||new Set(row.reviewedOffsets).size!==row.reviewedOffsets.length||row.reviewedOffsets.some(offset=>offset!==7&&offset!==30)))throw new Error("Invalid review history");
  }
  return { version: 1, completed: data.completed.map(row => ({ ...row })) };
}
export function createLearningProgressStore(storage: { read(owner: string): Promise<unknown>; write(owner: string, progress: LearningProgress): Promise<void> }, now=()=>new Date()) {
  const queues = new Map<string, Promise<void>>();
  const listeners=new Map<string,Set<()=>void>>();
  async function write(owner:string,value:LearningProgress){
    await storage.write(owner,value);
    for(const listener of listeners.get(owner)??[]){try{listener();}catch{/* Persisted learning must survive UI errors. */}}
  }
  const validateOwner = (owner: string) => { if (!/^[A-Za-z0-9_-]{1,200}$/.test(owner)) throw new Error("Invalid learning owner"); };
  async function load(owner: string) {
    validateOwner(owner); await queues.get(owner)?.catch(() => undefined);
    return parseProgress(await storage.read(owner), owner);
  }
  async function complete(owner: string, lessonId: string, version: number) {
    validateOwner(owner);
    if (!curriculum.lessons.some(lesson => lesson.lessonId === lessonId && lesson.version === version)) throw new Error("Unknown lesson version");
    const operation = (queues.get(owner) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      const previous = parseProgress(await storage.read(owner),owner);
      const completed=recordCompletion(previous.completed,owner,lessonId,version).map(row=>previous.completed.includes(row)?row:{...row,completedAt:now().toISOString()});
      await write(owner, { version: 1, completed });
    });
    queues.set(owner,operation);
    try { await operation; } finally { if (queues.get(owner) === operation) queues.delete(owner); }
    return load(owner);
  }
  async function mergeVerified(owner:string,value:unknown) {
    validateOwner(owner);
    if(!Array.isArray(value)||value.length>1000)throw new Error("Invalid cloud learning progress");
    const incoming:Completion[]=value.map(row=>{
      if(!row||typeof row.completed_at!=="string"||!Number.isFinite(Date.parse(row.completed_at)))throw new Error("Invalid cloud completion");
      return {owner,lessonId:row.lesson_id,version:row.content_version,xp:row.xp,completedAt:new Date(row.completed_at).toISOString()};
    });
    parseProgress({version:1,completed:incoming},owner);
    const operation=(queues.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      const previous=parseProgress(await storage.read(owner),owner);
      let completed=previous.completed;
      for(const row of incoming){
        const existing=completed.find(item=>item.lessonId===row.lessonId&&item.version===row.version);
        completed=existing?completed.map(item=>item===existing?{...item,completedAt:item.completedAt??row.completedAt}:item):[...completed,row];
      }
      await write(owner,{version:1,completed});
    });
    queues.set(owner,operation);
    try{await operation;}finally{if(queues.get(owner)===operation)queues.delete(owner);}
    return load(owner);
  }
  async function dueReviews(owner:string,today:string){
    reviewDueDays(today);
    return (await load(owner)).completed.flatMap(row=>row.completedAt?reviewDueDays(new Date(row.completedAt).toISOString().slice(0,10)).flatMap((dueDay,index)=>{
      const offset=index===0?7:30;
      return dueDay<=today&&!row.reviewedOffsets?.includes(offset)?[{lessonId:row.lessonId,version:row.version,offset,dueDay}]:[];
    }):[]).sort((a,b)=>a.dueDay.localeCompare(b.dueDay)||a.lessonId.localeCompare(b.lessonId));
  }
  async function review(owner:string,lessonId:string,version:number,offset:number){
    validateOwner(owner);
    const operation=(queues.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      const previous=parseProgress(await storage.read(owner),owner);
      const row=previous.completed.find(item=>item.lessonId===lessonId&&item.version===version);
      if(!row?.completedAt||(offset!==7&&offset!==30)||reviewDueDays(new Date(row.completedAt).toISOString().slice(0,10))[offset===7?0:1]>now().toISOString().slice(0,10))throw new Error("Review is not due");
      await write(owner,{version:1,completed:previous.completed.map(item=>item===row?{...item,reviewedOffsets:[...new Set([...(item.reviewedOffsets??[]),offset])]}:item)});
    });
    queues.set(owner,operation);
    try{await operation;}finally{if(queues.get(owner)===operation)queues.delete(owner);}
    return load(owner);
  }
  async function mergeReviews(owner:string,value:unknown){
    validateOwner(owner);
    if(!Array.isArray(value)||value.length>1000)throw new Error("Invalid cloud reviews");
    const seen=new Set<string>();
    const incoming=value.map(row=>{
      if(!row||typeof row!=="object"||Object.keys(row).length!==3||
        !curriculum.lessons.some(lesson=>lesson.lessonId===row.lessonId&&lesson.version===row.contentVersion)||
        (row.offset!==7&&row.offset!==30))throw new Error("Invalid cloud review");
      const id=`${row.lessonId}:${row.contentVersion}:${row.offset}`;
      if(seen.has(id))throw new Error("Duplicate cloud review");seen.add(id);
      return {lessonId:row.lessonId as string,version:row.contentVersion as number,offset:row.offset as number};
    });
    const operation=(queues.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      const previous=parseProgress(await storage.read(owner),owner);
      const completed=previous.completed.map(row=>({...row,reviewedOffsets:[...new Set([...(row.reviewedOffsets??[]),...incoming.filter(item=>item.lessonId===row.lessonId&&item.version===row.version).map(item=>item.offset)])].sort((a,b)=>a-b)}));
      await write(owner,{version:1,completed});
    });
    queues.set(owner,operation);
    try{await operation;}finally{if(queues.get(owner)===operation)queues.delete(owner);}
    return load(owner);
  }
  return { load, complete, mergeVerified, mergeReviews, dueReviews, review,
    subscribe:(owner:string,listener:()=>void)=>{validateOwner(owner);const set=listeners.get(owner)??new Set<()=>void>();set.add(listener);listeners.set(owner,set);return()=>{set.delete(listener);if(!set.size)listeners.delete(owner);};},
  };
}
