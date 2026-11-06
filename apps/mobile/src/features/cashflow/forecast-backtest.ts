import {buildVariableHistory,type VariableHistoryInput} from "./variable-history";
import {expandSchedules,type CashflowSchedule} from "./schedules";
import {resolveSettlements,type SettlementLink} from "./settlements";
import {evaluateForecast,type BalanceDay} from "./forecast-evaluation";
import {calculateCashflow} from "./forecast";
import {ledgerOpening,parseLedgerSnapshot} from "./ledger-snapshot";
import {scopeSchedules} from "./schedule-scope";
import {parseSettlementDocument} from "./settlement-store";
import {estimateVariableSpending} from "./variable-spending";
export type BacktestSplit="development"|"validation"|"holdout";
export type BacktestOrigin={id:string;subjectId:string;family:string;cohort:string;split:BacktestSplit;days:7|30;input:VariableHistoryInput;schedules:{capturedAt:string;rows:CashflowSchedule[]};settlements:{capturedAt:string;links:SettlementLink[]};truth:(BalanceDay&{complete:boolean;observedAt:string})[]};
export type BacktestDataset={version:string;source:{kind:"synthetic"|"authorized-observations";reference:string};observationCutoff:string;origins:BacktestOrigin[]};
type Metrics=ReturnType<typeof evaluateForecast>;
export type BacktestResult={id:string;status:"evaluated"|"excluded";split:BacktestSplit;cohort:string;currency:string;days:7|30;f0:Metrics|null;f1:Metrics|null;reason:"incomplete-truth"|"unusable-features"|null;f1Reason:"insufficient-history"|"invalid-history"|null;completeHistoryDays:number|null};
function day(value:string){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Invalid backtest day");
 const time=Date.parse(value+"T00:00:00Z");if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error("Invalid backtest day");return time;
}
function instant(value:string){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!/(Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error("Invalid backtest timestamp");
 day(value.slice(0,10));const time=Date.parse(value);if(!Number.isFinite(time))throw new Error("Invalid backtest timestamp");return time;
}
function id(value:string){if(typeof value!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(value))throw new Error("Invalid backtest metadata");}
function median(values:number[]){const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
function summary(rows:Metrics[]){return {count:rows.length,medianMae:median(rows.map(row=>row.mae)),worstMae:Math.max(...rows.map(row=>row.mae)),medianMinimumDayError:median(rows.map(row=>row.minimumDayError)),missedLowBalanceDays:rows.reduce((sum,row)=>sum+row.missedLowBalanceDays,0),falseLowBalanceDays:rows.reduce((sum,row)=>sum+row.falseLowBalanceDays,0)};}
/** Offline evaluation of supplied frozen artifacts. Timestamp checks cannot prove
 * that a caller's completeness/authorization declarations are factually true.
 * This never sends data, calibrates confidence, or activates a forecast model. */
export function runForecastBacktest(dataset:BacktestDataset){
 id(dataset.version);const cutoff=instant(dataset.observationCutoff);
 if(!["synthetic","authorized-observations"].includes(dataset.source.kind)||typeof dataset.source.reference!=="string"||!dataset.source.reference.trim()||dataset.source.reference.length>200||!Array.isArray(dataset.origins)||dataset.origins.length===0||dataset.origins.length>500)throw new Error("Invalid backtest dataset");
 const seen=new Set<string>(),windows=new Set<string>(),subjects=new Map<string,BacktestSplit>(),families=new Map<string,BacktestSplit>(),rolling=new Map<string,number[]>();
 const outputs:BacktestResult[]=[];
 for(const sample of dataset.origins){
  for(const value of [sample.id,sample.subjectId,sample.family,sample.cohort])id(value);
  if(!["development","validation","holdout"].includes(sample.split)||![7,30].includes(sample.days)||seen.has(sample.id))throw new Error("Invalid origin identity");seen.add(sample.id);
  for(const [map,key]of [[subjects,sample.subjectId],[families,sample.family]] as const){if(map.has(key)&&map.get(key)!==sample.split)throw new Error("Cross-split subject or scenario leakage");map.set(key,sample.split);}
  const input=sample.input,origin=day(input.startDay),currency=input.currency;
  if(!/^[A-Z]{3}$/.test(currency)||instant(input.snapshot.asOf)!==origin||origin>cutoff)throw new Error("Origin must be frozen at UTC day start");
  for(const captured of [sample.schedules.capturedAt,sample.settlements.capturedAt,...input.completeDays.map(row=>row.confirmedAt),...input.reviews.map(row=>row.reviewedAt)])if(instant(captured)>origin)throw new Error("Future information in frozen inputs");
  const window=JSON.stringify([sample.subjectId,currency,input.startDay,sample.days]);if(windows.has(window))throw new Error("Duplicate evaluation window");windows.add(window);
  const series=JSON.stringify([sample.subjectId,currency,sample.days]);rolling.set(series,[...(rolling.get(series)??[]),origin]);
  if(!Array.isArray(sample.truth)||sample.truth.length>sample.days)throw new Error("Invalid truth horizon");
  const actual=new Map<string,BalanceDay&{complete:boolean;observedAt:string}>();
  for(const row of sample.truth){
   const date=day(row.day),observed=instant(row.observedAt);
   if(actual.has(row.day)||date<origin||date>=origin+sample.days*86400000||row.currency!==currency||!Number.isSafeInteger(row.balance)||Math.abs(row.balance)>9e12||typeof row.complete!=="boolean"||observed<date||(row.complete&&observed<date+86400000)||observed>cutoff)throw new Error("Invalid or unavailable observed truth");
   actual.set(row.day,row);
  }
  const result:BacktestResult={id:sample.id,status:"excluded",split:sample.split,cohort:sample.cohort,currency,days:sample.days,f0:null,f1:null,reason:null,f1Reason:null,completeHistoryDays:null};
  if(actual.size!==sample.days||[...actual.values()].some(row=>!row.complete)){outputs.push({...result,reason:"incomplete-truth"});continue;}
  const truth=Array.from({length:sample.days},(_,index)=>actual.get(new Date(origin+index*86400000).toISOString().slice(0,10))!);
  let occurrences:ReturnType<typeof expandSchedules>,opening:number;
  try{
   const snapshot=parseLedgerSnapshot(input.snapshot);
   if([...snapshot.wallets,...snapshot.entries].some(row=>instant(row.updatedAt)>origin||(row.deletedAt!==null&&instant(row.deletedAt)>origin)))throw new Error("Snapshot contains later versions");
   opening=ledgerOpening(snapshot,input.accounts,currency,input.pendingCount).balance;
   occurrences=expandSchedules(scopeSchedules(sample.schedules.rows,input.accounts,currency),input.startDay,new Date(origin+(sample.days-1)*86400000).toISOString().slice(0,10));
   const occurrenceIds=new Set(occurrences.map(row=>row.id)),links=parseSettlementDocument({schemaVersion:1,revision:0,links:sample.settlements.links}).links.filter(row=>occurrenceIds.has(row.occurrenceId));
   const settled=new Set(resolveSettlements(snapshot,input.accounts,currency,occurrences,links));occurrences=occurrences.map(row=>({...row,settled:settled.has(row.id)}));
   const predicted=calculateCashflow({startDay:input.startDay,days:sample.days,currency,openingBalance:opening,occurrences});
   result.f0=evaluateForecast(predicted.baseline.map(row=>({...row,currency})),truth);result.status="evaluated";
  }catch{outputs.push({...result,reason:"unusable-features"});continue;}
  try{
   const history=buildVariableHistory(input);result.completeHistoryDays=history.completeDays;
   const estimate=estimateVariableSpending({startDay:input.startDay,days:sample.days,currency,history:history.history});
   if(estimate.kind==="insufficient-history")result.f1Reason="insufficient-history";
   else{const predicted=calculateCashflow({startDay:input.startDay,days:sample.days,currency,openingBalance:opening,occurrences:[...occurrences,...estimate.occurrences]});result.f1=evaluateForecast(predicted.baseline.map(row=>({...row,currency})),truth);}
  }catch{result.f1Reason="invalid-history";}
  outputs.push(result);
 }
 for(const times of rolling.values()){
  times.sort((a,b)=>a-b);for(let index=1;index<times.length;index++)if((times[index]-times[index-1])%(7*86400000)!==0)throw new Error("Rolling origins must use whole weeks");
 }
 const buckets=new Map<string,BacktestResult[]>();
 for(const row of outputs.filter(row=>row.status==="evaluated")){const key=JSON.stringify([row.split,row.cohort,row.days,row.currency]);buckets.set(key,[...(buckets.get(key)??[]),row]);}
 const groups=[...buckets.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,rows])=>{
  const paired=rows.filter(row=>row.f1!==null),baseline=summary(rows.map(row=>row.f0!));
  const pairedF0=paired.length?summary(paired.map(row=>row.f0!)):null,challenger=paired.length?summary(paired.map(row=>row.f1!)):null;
  const ratio=pairedF0&&challenger&&pairedF0.medianMae>0?1-challenger.medianMae/pairedF0.medianMae:null;
  return {split:rows[0].split,cohort:rows[0].cohort,currency:rows[0].currency,days:rows[0].days,evaluatedOrigins:rows.length,pairedCount:paired.length,f1Unavailable:rows.length-paired.length,f0:baseline,pairedF0,f1:challenger,relativeImprovement:ratio,comparisonStatus:!paired.length?"no-pairs":pairedF0!.medianMae===0?"baseline-zero":"paired"};
 });
 return {schemaVersion:1,datasetVersion:dataset.version,source:{...dataset.source},observationCutoff:dataset.observationCutoff,origins:outputs.sort((a,b)=>a.id.localeCompare(b.id)),groups,
  excludedOrigins:outputs.filter(row=>row.status==="excluded").length,promotionDecision:"not-evaluated" as const,
  limitations:["Caller-supplied frozen snapshots and attestations are not independent proof of complete real finances or permission to use data.","Synthetic arithmetic tests do not establish real-world forecast quality.","Metrics use currency minor units and separate horizons, splits and cohorts; overlapping rolling windows are correlated.","Only paired eligible origins enter the F0/F1 improvement comparison; there is no automated promotion, confidence calibration or permission to spend."]};
}
