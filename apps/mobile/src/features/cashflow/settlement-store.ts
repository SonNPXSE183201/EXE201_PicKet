import type { SettlementLink } from "./settlements";
export type SettlementDocument={schemaVersion:1;revision:number;links:SettlementLink[]};
export type SettlementReview={owner:string;local:SettlementDocument;remote:SettlementDocument};
export type SettlementSend=(revision:number,links:SettlementLink[],key:string)=>Promise<unknown>;
export class SettlementMutationRejected extends Error {}
export function parseSettlementDocument(value:unknown):SettlementDocument{
 if(value==null)return {schemaVersion:1,revision:0,links:[]};
 const doc=value as SettlementDocument;
 if(doc.schemaVersion!==1||!Number.isSafeInteger(doc.revision)||doc.revision<0||!Array.isArray(doc.links)||doc.links.length>1000)throw new Error("Invalid settlement storage");
 const occurrences=new Set<string>(),transactions=new Set<string>();
 const links=doc.links.map(link=>{
  if(!link||![link.occurrenceId,link.transactionId].every(id=>typeof id==="string"&&id.length>0&&id.length<=250)||
     !/^\d{4}-\d{2}-\d{2}$/.test(link.day)||!Number.isFinite(Date.parse(link.day+"T00:00:00Z"))||new Date(link.day+"T00:00:00Z").toISOString().slice(0,10)!==link.day||
     !Number.isSafeInteger(link.amount)||link.amount===0||Math.abs(link.amount)>9e12||!/^[A-Z]{3}$/.test(link.currency)||
     typeof link.transactionUpdatedAt!=="string"||!Number.isFinite(Date.parse(link.transactionUpdatedAt))||
     occurrences.has(link.occurrenceId)||transactions.has(link.transactionId))throw new Error("Invalid settlement link");
  occurrences.add(link.occurrenceId);transactions.add(link.transactionId);
  return {occurrenceId:link.occurrenceId,day:link.day,amount:link.amount,currency:link.currency,transactionId:link.transactionId,transactionUpdatedAt:link.transactionUpdatedAt};
 });
 return {schemaVersion:1,revision:doc.revision,links};
}
type Attempt={key:string;expectedRevision:number;links:SettlementLink[]};
type State=SettlementDocument&{owner:string;cloudAttempt?:Attempt;recovery?:SettlementDocument};
function cloud(value:unknown){if(!value||typeof value!=="object")throw new Error("Invalid cloud settlement document");return parseSettlementDocument(value);}
function same(a:SettlementDocument,b:SettlementDocument){
 const sorted=(doc:SettlementDocument)=>[...doc.links].sort((x,y)=>x.occurrenceId.localeCompare(y.occurrenceId));
 return a.revision===b.revision&&JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
}
function state(value:unknown,owner:string):State{
 const doc=parseSettlementDocument(value),raw=value as Partial<State>|null;
 if(raw?.owner!==undefined&&raw.owner!==owner)throw new Error("Settlement owner mismatch");
 if(raw?.recovery===null)throw new Error("Invalid settlement recovery copy");
 const recovery=raw?.recovery===undefined?undefined:parseSettlementDocument(raw.recovery);
 const attempt=raw?.cloudAttempt;
 if(raw?.cloudAttempt!==undefined&&(!attempt||typeof attempt!=="object"))throw new Error("Invalid settlement operation");
 if(attempt){
  if(!/^[A-Za-z0-9._:-]{8,128}$/.test(attempt.key)||!Number.isSafeInteger(attempt.expectedRevision)||attempt.expectedRevision<0||attempt.expectedRevision>=Number.MAX_SAFE_INTEGER)throw new Error("Invalid settlement operation");
  const links=parseSettlementDocument({schemaVersion:1,revision:doc.revision,links:attempt.links});
  if(!same(doc,links))throw new Error("Settlement operation no longer matches device data");
 }
 return {...doc,owner,...(recovery?{recovery}:{}),...(attempt?{cloudAttempt:{key:attempt.key,expectedRevision:attempt.expectedRevision,links:doc.links}}:{})};
}
export function createSettlementStore(storage:{read(owner:string):Promise<unknown>;write(owner:string,value:SettlementDocument):Promise<void>}){
 const queues=new Map<string,Promise<unknown>>();
 async function atomic<T>(owner:string,operation:(doc:State)=>Promise<T>):Promise<T>{
  if(!/^[A-Za-z0-9_-]{1,200}$/.test(owner))throw new Error("Invalid settlement owner");
  const next=(queues.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>operation(state(await storage.read(owner),owner)));
  queues.set(owner,next);try{return await next;}finally{if(queues.get(owner)===next)queues.delete(owner);}
 }
 const active=(current:()=>boolean)=>{if(!current())throw new Error("Settlement session changed");};
 const checkedReview=(owner:string,doc:State,review:SettlementReview)=>{
  if(review.owner!==owner||!same(doc,parseSettlementDocument(review.local))||doc.cloudAttempt)throw new Error("Settlement copy changed; review again");
 };
 return {
  load:(owner:string)=>atomic(owner,async doc=>parseSettlementDocument(doc)),
  status:(owner:string)=>atomic(owner,async doc=>({pending:Boolean(doc.cloudAttempt),...(doc.recovery?{recovery:parseSettlementDocument(doc.recovery)}:{})})),
  save:(owner:string,revision:number,links:SettlementLink[])=>atomic(owner,async doc=>{
   if(doc.cloudAttempt||revision!==doc.revision||revision===Number.MAX_SAFE_INTEGER)throw new Error("Settlement changed or has an unconfirmed cloud write");
   const next=state({...doc,revision:revision+1,links},owner);await storage.write(owner,next);return parseSettlementDocument(next);
  }),
  review:(owner:string,fetch:()=>Promise<unknown>,current:()=>boolean=()=>true)=>atomic(owner,async doc=>{
   active(current);const remote=cloud(await fetch());active(current);
   return {owner,local:parseSettlementDocument(doc),remote};
  }),
  publish:(owner:string,review:SettlementReview|null,fetch:()=>Promise<unknown>,send:SettlementSend,newKey:()=>string,current:()=>boolean=()=>true)=>atomic(owner,async doc=>{
   active(current);let next=doc;
   if(!next.cloudAttempt){
    if(!review)throw new Error("Review required");checkedReview(owner,next,review);
    const remote=cloud(await fetch());active(current);
    if(!same(remote,parseSettlementDocument(review.remote)))throw new Error("Cloud copy changed");
    next=state({...doc,cloudAttempt:{key:newKey(),expectedRevision:remote.revision,links:doc.links}},owner);
    await storage.write(owner,next);active(current);
   }
   const attempt=next.cloudAttempt!;let response:unknown;
   try{response=await send(attempt.expectedRevision,attempt.links,attempt.key);}
   catch(error){
    if(error instanceof SettlementMutationRejected){active(current);const {cloudAttempt,...rejected}=next;void cloudAttempt;await storage.write(owner,rejected);}
    throw error;
   }
   active(current);
   const remote=cloud(response),applied=(response as {appliedRevision?:number})?.appliedRevision;
   if(applied!==attempt.expectedRevision+1||remote.revision<applied||(remote.revision===applied&&!same(remote,{schemaVersion:1,revision:applied,links:attempt.links})))throw new Error("Invalid settlement acknowledgment");
   const {cloudAttempt,...acknowledged}=next;void cloudAttempt;
   await storage.write(owner,acknowledged);active(current);return remote;
  }),
  adopt:(owner:string,review:SettlementReview,fetch:()=>Promise<unknown>,current:()=>boolean=()=>true)=>atomic(owner,async doc=>{
   active(current);checkedReview(owner,doc,review);
   if(doc.revision===Number.MAX_SAFE_INTEGER)throw new Error("Settlement revision exhausted");
   const remote=cloud(await fetch());active(current);
   if(!same(remote,parseSettlementDocument(review.remote)))throw new Error("Cloud copy changed");
   const next=state({...doc,revision:doc.revision+1,links:remote.links,recovery:parseSettlementDocument(doc)},owner);
   await storage.write(owner,next);active(current);return parseSettlementDocument(next);
  }),
 };
}
