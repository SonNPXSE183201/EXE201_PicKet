import type { CashflowOccurrence } from "./forecast";
export type ObservedVariableDay={day:string;currency:string;complete:boolean;amount:number};
type Input={startDay:string;days:number;currency:string;history:ObservedVariableDay[]};
type Estimate={kind:"trailing-median-scenario"|"insufficient-history";dailyAmount:number|null;occurrences:CashflowOccurrence[];observedDays:number;limitations:string[]};
function day(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Invalid observed day");
  const time=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error("Invalid observed day");
  return time;
}
/** Experimental F1 baseline. Callers must exclude scheduled costs, transfers,
 * one-offs and unsettled refunds before supplying daily variable expenses.
 * Completeness is explicitly confirmed, never inferred from record presence. */
export function estimateVariableSpending(input:Input):Estimate {
  const origin=day(input.startDay);
  if(![7,30].includes(input.days)||!/^[A-Z]{3}$/.test(input.currency)||input.history.length>3660)throw new Error("Invalid estimate scope");
  const seen=new Set<string>();
  for(const row of input.history){
    day(row.day);
    if(seen.has(row.day)||row.currency!==input.currency||typeof row.complete!=="boolean"||!Number.isSafeInteger(row.amount)||row.amount<0||row.amount>9e12)throw new Error("Invalid variable expense history");
    seen.add(row.day);
  }
  const window=28;
  const observed=input.history.filter(row=>row.complete&&day(row.day)<origin&&day(row.day)>=origin-window*86400000);
  const limitations=["Experimental trailing median; no calibrated confidence interval or spending permission.","Only explicitly complete days and variable expenses are represented; missing days are unknown.","Scheduled obligations must be excluded from this input to prevent counting them twice."];
  if(observed.length<window)return{kind:"insufficient-history",dailyAmount:null,occurrences:[],observedDays:observed.length,limitations};
  const amounts=observed.map(row=>row.amount).sort((a,b)=>a-b);
  const dailyAmount=Math.ceil((amounts[13]+amounts[14])/2);
  return {kind:"trailing-median-scenario",dailyAmount,observedDays:observed.length,limitations,
    occurrences:Array.from({length:input.days},(_,index)=>{
      const date=new Date(origin+index*86400000).toISOString().slice(0,10);
      return{id:`variable-estimate:${date}`,day:date,amount:-dailyAmount,currency:input.currency,settled:false};
    })};
}
