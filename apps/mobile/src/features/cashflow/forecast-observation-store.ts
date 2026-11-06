import {buildCapturedForecast,parseFrozenForecast,evaluateCapturedForecast,observationDay,observationInstant,type CaptureInput,type FrozenForecastCase} from "./forecast-observations";
export type ObservationDocument={schemaVersion:1;owner:string;revision:number;cases:FrozenForecastCase[];retired?:true};
function parse(value:unknown,owner:string):ObservationDocument{
 if(value==null)return {schemaVersion:1,owner,revision:0,cases:[]};const raw=value as ObservationDocument;
 if(raw.schemaVersion!==1||raw.owner!==owner||!Number.isSafeInteger(raw.revision)||raw.revision<0||raw.revision>Number.MAX_SAFE_INTEGER||!Array.isArray(raw.cases)||raw.cases.length>50)throw new Error("Invalid forecast history");
 if(raw.retired!==undefined&&raw.retired!==true||raw.retired&&raw.cases.length)throw new Error("Invalid retired history");
 const cases=raw.cases.map(parseFrozenForecast);if(new Set(cases.map(row=>row.id)).size!==cases.length)throw new Error("Duplicate capture identity");
 return {schemaVersion:1,owner,revision:raw.revision,cases,...(raw.retired?{retired:true}:{})};
}
export function createObservationStore(storage:{read(owner:string):Promise<unknown>;write(owner:string,value:ObservationDocument):Promise<void>;newId():string;now():string}){
 const queues=new Map<string,Promise<unknown>>(),epochs=new Map<string,number>(),retiring=new Set<string>();
 async function enqueue<T>(owner:string,operation:(value:unknown)=>Promise<T>,read=true):Promise<T>{
  if(!/^[A-Za-z0-9_-]{1,200}$/.test(owner))throw new Error("Invalid history owner");
  const next=(queues.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>operation(read?await storage.read(owner):undefined));
  queues.set(owner,next);try{return await next;}finally{if(queues.get(owner)===next)queues.delete(owner);}
 }
 function atomic<T>(owner:string,operation:(doc:ObservationDocument)=>Promise<T>,write=false):Promise<T>{
  const epoch=epochs.get(owner)??0;
  return enqueue(owner,async value=>{const doc=parse(value,owner);if(write&&(doc.retired||retiring.has(owner)||epoch!==(epochs.get(owner)??0)))throw new Error("History retired or operation superseded");return operation(doc);});
 }
 const persist=(owner:string,value:ObservationDocument)=>{if(retiring.has(owner)||value.retired)throw new Error("History retired");return storage.write(owner,parse(value,owner));};
 const active=(current:()=>boolean)=>{if(!current())throw new Error("Forecast history session changed");};
 return {
  retireOwner:(owner:string):Promise<void>=>{
   retiring.add(owner);epochs.set(owner,(epochs.get(owner)??0)+1);
   return enqueue(owner,async()=>{await storage.write(owner,{schemaVersion:1,owner,revision:0,cases:[],retired:true});},false);
  },
  resumeOwner:(owner:string):Promise<void>=>{
   epochs.set(owner,(epochs.get(owner)??0)+1);
   return enqueue(owner,async value=>{const doc=parse(value,owner);const {retired,...next}=doc;void retired;await storage.write(owner,parse({...next,revision:doc.revision+1},owner));retiring.delete(owner);});
  },
  load:(owner:string)=>atomic(owner,async doc=>doc),
  capture:(owner:string,input:CaptureInput,current:()=>boolean=()=>true)=>atomic(owner,async doc=>{
   active(current);const candidate=buildCapturedForecast(storage.newId(),input,storage.now());
   const existing=doc.cases.find(row=>row.sourceAsOf===candidate.sourceAsOf&&JSON.stringify(row.accountIds)===JSON.stringify(candidate.accountIds)&&JSON.stringify(row.input)===JSON.stringify(candidate.input));
   if(existing)return parseFrozenForecast(existing);
   if(doc.cases.length>=50||doc.cases.some(row=>row.id===candidate.id))throw new Error("Forecast history capacity or identity conflict");
   active(current);await persist(owner,{...doc,revision:doc.revision+1,cases:[...doc.cases,candidate]});active(current);return parseFrozenForecast(candidate);
  },true),
  observe:(owner:string,id:string,revision:number,day:string,balance:number,current:()=>boolean=()=>true)=>atomic(owner,async doc=>{
   active(current);const record=doc.cases.find(row=>row.id===id);if(!record)throw new Error("Capture not found");
   if(!Number.isSafeInteger(revision)||revision<0||revision>record.revision||!Number.isSafeInteger(balance)||Math.abs(balance)>9e12)throw new Error("Invalid observation revision or balance");
   const now=storage.now(),time=observationInstant(now),start=observationDay(day);
   evaluateCapturedForecast(record,now);
   if(!record.baseline.some(row=>row.day===day)||time<start+86400000)throw new Error("Only closed forecast days can be confirmed");
   const previous=record.observations.find(row=>row.day===day);
   if(time<observationInstant(record.capturedAt)||(previous&&time<observationInstant(previous.observedAt)))throw new Error("Device clock precedes saved evidence");
   if(previous?.balance===balance)return parseFrozenForecast(record);
   if(revision!==record.revision||record.changes.length>=300)throw new Error("Closing changed; reload before correcting");
   const next=parseFrozenForecast({...record,revision:record.revision+1,observations:[...record.observations.filter(row=>row.day!==day),{day,balance,observedAt:now,source:"user-confirmed"}],changes:previous?[...record.changes,{...previous,replacedAt:now}]:record.changes});
   active(current);await persist(owner,{...doc,revision:doc.revision+1,cases:doc.cases.map(row=>row.id===id?next:row)});active(current);return parseFrozenForecast(next);
  },true),
  remove:(owner:string,id:string,revision:number)=>atomic(owner,async doc=>{
   const record=doc.cases.find(row=>row.id===id);if(!record||record.revision!==revision)throw new Error("Capture changed");
   await persist(owner,{...doc,revision:doc.revision+1,cases:doc.cases.filter(row=>row.id!==id)});
  },true),
  clear:(owner:string,revision:number)=>atomic(owner,async doc=>{
   if(doc.revision!==revision)throw new Error("Forecast history changed");await persist(owner,{...doc,revision:doc.revision+1,cases:[]});
  },true),
 };
}
