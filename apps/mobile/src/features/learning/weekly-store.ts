import { completeWeeklyPractice, weekStartForDay, type PracticeEvent } from "./practice";
type Document={schemaVersion:1;events:PracticeEvent[]};
function parse(value:unknown,owner:string):Document {
  if(value==null)return{schemaVersion:1,events:[]};
  const doc=value as Document;
  if(doc.schemaVersion!==1 || !Array.isArray(doc.events) || doc.events.length>1000)throw new Error("Invalid weekly practice storage");
  const weeks=new Set<string>();
  for(const row of doc.events) {
    if(!row||row.owner!==owner||row.action!=="review-records"||typeof row.skipped!=="boolean"||row.xp!==(row.skipped?0:10)||
        weekStartForDay(row.weekStart)!==row.weekStart||weeks.has(row.weekStart))throw new Error("Invalid weekly practice event");
    weeks.add(row.weekStart);
  }
  return {schemaVersion:1,events:doc.events.map(row=>({...row}))};
}
export function createWeeklyPracticeStore(storage:{read(owner:string):Promise<unknown>;write(owner:string,value:Document):Promise<void>}) {
  const pending=new Map<string,Promise<void>>();
  const listeners=new Map<string,Set<()=>void>>();
  async function write(owner:string,value:Document){
    await storage.write(owner,value);
    for(const listener of listeners.get(owner)??[]){try{listener();}catch{/* Keep successful persistence authoritative. */}}
  }
  const checkOwner=(owner:string)=>{if(!/^[A-Za-z0-9_-]{1,200}$/.test(owner))throw new Error("Invalid learning owner");};
  async function load(owner:string) {
    checkOwner(owner);await pending.get(owner)?.catch(()=>undefined);
    return parse(await storage.read(owner),owner).events;
  }
  async function record(owner:string,weekStart:string,skipped:boolean) {
    checkOwner(owner);
    const operation=(pending.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      const previous=parse(await storage.read(owner),owner);
      const events=completeWeeklyPractice(previous.events,{owner,weekStart,action:"review-records"},skipped);
      const next=parse({schemaVersion:1,events},owner);
      await write(owner,next);
    });
    pending.set(owner,operation);
    try{await operation;}finally{if(pending.get(owner)===operation)pending.delete(owner);}
    return load(owner);
  }
  async function mergeVerified(owner:string,value:unknown){
    checkOwner(owner);
    if(!Array.isArray(value)||value.length>1000)throw new Error("Invalid cloud weekly practice");
    const incoming=value.map(row=>{
      if(!row||typeof row!=="object"||Object.keys(row).length!==2||typeof row.skipped!=="boolean")throw new Error("Invalid cloud practice event");
      return {owner,weekStart:row.weekStart,action:"review-records" as const,skipped:row.skipped,xp:row.skipped?0:10};
    });
    parse({schemaVersion:1,events:incoming},owner);
    const operation=(pending.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      const previous=parse(await storage.read(owner),owner);
      let events=previous.events;
      for(const row of incoming)events=completeWeeklyPractice(events,{owner,weekStart:row.weekStart,action:"review-records"},row.skipped);
      await write(owner,parse({schemaVersion:1,events},owner));
    });
    pending.set(owner,operation);
    try{await operation;}finally{if(pending.get(owner)===operation)pending.delete(owner);}
    return load(owner);
  }
  return {load,record,mergeVerified,
    subscribe:(owner:string,listener:()=>void)=>{checkOwner(owner);const set=listeners.get(owner)??new Set<()=>void>();set.add(listener);listeners.set(owner,set);return()=>{set.delete(listener);if(!set.size)listeners.delete(owner);};},
  };
}
