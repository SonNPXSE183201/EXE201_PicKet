import {ledgerOpening,parseLedgerSnapshot,type LedgerSnapshot} from "./ledger-snapshot";
import type {ObservedVariableDay} from "./variable-spending";
export type HistoryReview={transactionId:string;kind:"variable"|"scheduled"|"one-off";reviewedAt:string};
export type CompleteDay={day:string;confirmedAt:string};
export type VariableHistoryInput={snapshot:LedgerSnapshot;accounts:string[];currency:string;startDay:string;pendingCount:number;completeScope:{accounts:string[];currency:string};completeDays:CompleteDay[];reviews:HistoryReview[];
 /** IANA zone of the owner (e.g. Asia/Ho_Chi_Minh). Expenses are bucketed by local calendar day; defaults to UTC. */
 timeZone?:string};
/** Calendar day of an instant in a time zone, as YYYY-MM-DD. */
export function localDayOf(instantIso:string,timeZone="UTC"){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(instantIso));
 const get=(type:string)=>parts.find(p=>p.type===type)?.value;
 return `${get("year")}-${get("month")}-${get("day")}`;
}
function day(value:string){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Invalid history day");
 const time=Date.parse(value+"T00:00:00Z");
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error("Invalid history day");
 return time;
}
function instant(value:string){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!/(Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error("Invalid review timestamp");
 day(value.slice(0,10));const time=Date.parse(value);if(!Number.isFinite(time))throw new Error("Invalid review timestamp");return time;
}
/** Completeness and expense classifications are explicit caller attestations for
 * this exact wallet scope, not inferred or independently verified real-world truth.
 * Refunds/income/transfers do not reduce the gross variable-spending baseline. */
export function buildVariableHistory(input:VariableHistoryInput):{history:ObservedVariableDay[];unclassified:string[];completeDays:number;includedVariableTransactionIds:string[]}{
 const origin=day(input.startDay),snapshot=parseLedgerSnapshot(input.snapshot);
 if(instant(snapshot.asOf)!==origin||input.completeDays.length>28||input.reviews.length>100000)throw new Error("Invalid frozen history scope");
 if(input.completeScope.currency!==input.currency||input.completeScope.accounts.length!==input.accounts.length||new Set(input.completeScope.accounts).size!==input.accounts.length||input.accounts.some(id=>!input.completeScope.accounts.includes(id)))throw new Error("Completeness belongs to another wallet scope");
 const facts=ledgerOpening(snapshot,input.accounts,input.currency,input.pendingCount),included=new Set(facts.includedTransactionIds);
 const expenses=new Map(snapshot.entries.filter(row=>included.has(row.id)&&input.accounts.includes(row.accountId)&&row.kind==="expense").map(row=>[row.id,row]));
 const complete=new Set<string>();
 for(const row of input.completeDays){
  const date=day(row.day),confirmed=instant(row.confirmedAt);
  if(date<origin-28*86400000||date>=origin||confirmed<date+86400000||confirmed>origin||complete.has(row.day))throw new Error("Invalid completeness attestation");
  complete.add(row.day);
 }
 const reviews=new Map<string,HistoryReview>();
 for(const review of input.reviews){
  const expense=expenses.get(review.transactionId),reviewed=instant(review.reviewedAt);
  if(!expense||reviews.has(review.transactionId)||!["variable","scheduled","one-off"].includes(review.kind)||reviewed>origin||reviewed<instant(expense.updatedAt)||reviewed<instant(expense.occurredAt))throw new Error("Invalid or stale expense review");
  reviews.set(review.transactionId,review);
 }
 const history:ObservedVariableDay[]=Array.from({length:28},(_,index)=>{
  const date=new Date(origin-(28-index)*86400000).toISOString().slice(0,10);
  return {day:date,currency:input.currency,complete:complete.has(date),amount:0};
 });
 const byDay=new Map(history.map(row=>[row.day,row])),unclassified:string[]=[],includedVariableTransactionIds:string[]=[];
 for(const expense of expenses.values()){
  const row=byDay.get(localDayOf(expense.occurredAt,input.timeZone));if(!row)continue;
  const review=reviews.get(expense.id);
  if(!review){row.complete=false;unclassified.push(expense.id);continue;}
  if(review.kind==="variable"){
   const amount=row.amount+expense.amount;if(!Number.isSafeInteger(amount)||amount>9e12)throw new Error("Variable expense overflow");
   row.amount=amount;includedVariableTransactionIds.push(expense.id);
  }
 }
 return {history,unclassified:unclassified.sort(),completeDays:history.filter(row=>row.complete).length,includedVariableTransactionIds:includedVariableTransactionIds.sort()};
}
