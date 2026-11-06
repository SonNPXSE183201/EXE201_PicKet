import {scopeSchedules} from "./schedule-scope";
import {parseSettlementDocument} from "./settlement-store";
import {ledgerOpening,parseLedgerSnapshot,type LedgerSnapshot} from "./ledger-snapshot";
import {expandSchedules,type CashflowSchedule} from "./schedules";
import {resolveSettlements,type SettlementLink} from "./settlements";
import {calculateCashflow} from "./forecast";
import {evaluateForecast,type BalanceDay} from "./forecast-evaluation";
export type CaptureInput={snapshot:LedgerSnapshot;accounts:string[];currency:string;days:7|30;schedules:CashflowSchedule[];links:SettlementLink[];pendingCount:number};
export type ClosingObservation={day:string;balance:number;observedAt:string;source:"user-confirmed"};
export type FrozenForecastCase={id:string;revision:number;engineVersion:"f0-schedule-v1";capturedAt:string;sourceAsOf:string;accountIds:string[];includedCount:number;input:Parameters<typeof calculateCashflow>[0];baseline:BalanceDay[];observations:ClosingObservation[];changes:(ClosingObservation&{replacedAt:string})[]};
export function observationDay(value:string){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Invalid observation day");
 const time=Date.parse(value+"T00:00:00Z");if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error("Invalid observation day");return time;
}
export function observationInstant(value:string){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!/(Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error("Invalid observation timestamp");
 observationDay(value.slice(0,10));const time=Date.parse(value);if(!Number.isFinite(time))throw new Error("Invalid observation timestamp");return time;
}
function money(value:number){if(!Number.isSafeInteger(value)||Math.abs(value)>9e12)throw new Error("Invalid closing balance");}
function id(value:string){if(typeof value!=="string"||!/^[A-Za-z0-9_-]{1,200}$/.test(value))throw new Error("Invalid capture identity");}
function normalizedInput(value:FrozenForecastCase["input"],accounts:string[]){
 if(!value||!Array.isArray(value.occurrences)||value.occurrences.length>1000)throw new Error("Capture exceeds scope");
 const occurrences=value.occurrences.map(row=>{
  if(!row||typeof row.walletId!=="string"||!accounts.includes(row.walletId))throw new Error("Invalid captured wallet scope");
  return {id:row.id,day:row.day,amount:row.amount,currency:row.currency,settled:row.settled,walletId:row.walletId};
 });
 const input={startDay:value.startDay,days:value.days,currency:value.currency,openingBalance:value.openingBalance,occurrences};
 calculateCashflow(input);return input;
}
/** Capture only facts and explicit F0 assumptions. No full ledger, names, notes or
 * automatic observation of historic balances is retained. */
export function buildCapturedForecast(recordId:string,input:CaptureInput,now:string):FrozenForecastCase{
 id(recordId);const snapshot=parseLedgerSnapshot(input.snapshot),asOf=observationInstant(snapshot.asOf),captured=observationInstant(now);
 if(captured-asOf>60000||captured-asOf< -5000)throw new Error("Reload a fresh ledger snapshot");
 const facts=ledgerOpening(snapshot,input.accounts,input.currency,input.pendingCount),startDay=new Date(asOf).toISOString().slice(0,10),start=observationDay(startDay);
 if(![7,30].includes(input.days))throw new Error("Invalid capture horizon");
 const rows=expandSchedules(scopeSchedules(input.schedules,input.accounts,input.currency),startDay,new Date(start+(input.days-1)*86400000).toISOString().slice(0,10));
 const expected=new Set(rows.map(row=>row.id)),links=parseSettlementDocument({schemaVersion:1,revision:0,links:input.links}).links.filter(link=>expected.has(link.occurrenceId));
 const settled=new Set(resolveSettlements(snapshot,input.accounts,input.currency,rows,links));
 const frozen=normalizedInput({startDay,days:input.days,currency:input.currency,openingBalance:facts.balance,occurrences:rows.map(row=>({...row,settled:settled.has(row.id)}))},input.accounts);
 const baseline=calculateCashflow(frozen).baseline.map(row=>({...row,currency:input.currency}));
 return parseFrozenForecast({id:recordId,revision:0,engineVersion:"f0-schedule-v1",capturedAt:now,sourceAsOf:snapshot.asOf,accountIds:[...input.accounts].sort(),includedCount:facts.includedTransactionIds.length,input:frozen,baseline,observations:[],changes:[]});
}
export function parseFrozenForecast(value:unknown):FrozenForecastCase{
 if(!value||typeof value!=="object")throw new Error("Invalid captured forecast");const raw=value as FrozenForecastCase;id(raw.id);
 const captured=observationInstant(raw.capturedAt),asOf=observationInstant(raw.sourceAsOf);
 if(raw.engineVersion!=="f0-schedule-v1"||!Number.isSafeInteger(raw.revision)||raw.revision<0||captured-asOf>60000||captured-asOf< -5000||!Number.isSafeInteger(raw.includedCount)||raw.includedCount<0||raw.includedCount>100000||!Array.isArray(raw.accountIds)||raw.accountIds.length===0||raw.accountIds.length>1000||new Set(raw.accountIds).size!==raw.accountIds.length||raw.accountIds.some(account=>typeof account!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(account)))throw new Error("Invalid capture provenance");
 const input=normalizedInput(raw.input,raw.accountIds);
 if(input.startDay!==new Date(asOf).toISOString().slice(0,10)||!Array.isArray(raw.observations)||raw.observations.length>input.days||!Array.isArray(raw.changes)||raw.changes.length>300||raw.revision!==raw.observations.length+raw.changes.length)throw new Error("Invalid capture observations");
 const baseline=calculateCashflow(input).baseline.map(row=>({...row,currency:input.currency}));
 if(!Array.isArray(raw.baseline)||raw.baseline.length!==baseline.length||raw.baseline.some((row,index)=>row.day!==baseline[index].day||row.balance!==baseline[index].balance||row.currency!==input.currency))throw new Error("Captured prediction changed");
 const start=observationDay(input.startDay),seen=new Set<string>();
 const parseObservation=(row:ClosingObservation):ClosingObservation=>{
  const date=observationDay(row.day),at=observationInstant(row.observedAt);money(row.balance);
  if(row.source!=="user-confirmed"||date<start||date>=start+input.days*86400000||at<date+86400000||at<captured)throw new Error("Invalid confirmed closing");
  return {day:row.day,balance:row.balance,observedAt:row.observedAt,source:"user-confirmed"};
 };
 const observations=raw.observations.map(row=>{const parsed=parseObservation(row);if(seen.has(parsed.day))throw new Error("Duplicate closing");seen.add(parsed.day);return parsed;}).sort((a,b)=>a.day.localeCompare(b.day));
 const changes=raw.changes.map(row=>{const parsed=parseObservation(row);if(observationInstant(row.replacedAt)<observationInstant(row.observedAt)||!seen.has(row.day))throw new Error("Invalid closing correction");return {...parsed,replacedAt:row.replacedAt};});
 return {id:raw.id,revision:raw.revision,engineVersion:"f0-schedule-v1",capturedAt:raw.capturedAt,sourceAsOf:raw.sourceAsOf,accountIds:[...raw.accountIds].sort(),includedCount:raw.includedCount,input,baseline,observations,changes};
}
export function evaluateCapturedForecast(value:FrozenForecastCase,now:string){
 const record=parseFrozenForecast(value),time=observationInstant(now);
 if(time<observationInstant(record.capturedAt)||record.observations.some(row=>observationInstant(row.observedAt)>time)||record.changes.some(row=>observationInstant(row.replacedAt)>time))throw new Error("Captured evidence is from the future");
 const closedDays=record.baseline.filter(row=>observationDay(row.day)+86400000<=time).length;
 if(record.observations.length!==record.input.days)return {status:"waiting" as const,recordedDays:record.observations.length,closedDays,metrics:null};
 const metrics=evaluateForecast(record.baseline,record.observations.map(row=>({day:row.day,balance:row.balance,currency:record.input.currency})));
 return {status:"evaluated" as const,recordedDays:record.observations.length,closedDays,metrics};
}
