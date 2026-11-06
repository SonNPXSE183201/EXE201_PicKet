import {readFileSync,writeFileSync,statSync} from "node:fs";
import {resolve} from "node:path";
import {runForecastBacktest,type BacktestDataset,type BacktestOrigin} from "../src/features/cashflow/forecast-backtest";
import {syntheticBacktestOrigin} from "../src/features/cashflow/synthetic-backtest-fixture";

function syntheticDataset():BacktestDataset{
 const origins:BacktestOrigin[]=[];
 for(const days of [7,30] as const){
  origins.push(syntheticBacktestOrigin({id:`regular-${days}-week-one`,days}),syntheticBacktestOrigin({id:`regular-${days}-week-two`,days,startDay:"2026-10-08"}));
  const oneoff=syntheticBacktestOrigin({id:`oneoff-${days}`,days,split:"validation",subjectId:"validation-subject",family:"oneoff-family",cohort:"oneoff"});
  const paid={id:"synthetic-oneoff",accountId:oneoff.input.accounts[0],destinationAccountId:null,kind:"expense",amount:20000,occurredAt:"2026-09-30T12:00:00Z",updatedAt:"2026-09-30T12:00:00Z",deletedAt:null};
  oneoff.input.snapshot.wallets[0].openingBalance+=paid.amount;oneoff.input.snapshot.entries.push(paid);oneoff.input.snapshot.confirmations.push({transactionId:paid.id,source:"cloud-verified",confirmedAt:oneoff.input.snapshot.asOf});oneoff.input.reviews.push({transactionId:paid.id,kind:"one-off",reviewedAt:oneoff.input.snapshot.asOf});origins.push(oneoff);
  const refund=syntheticBacktestOrigin({id:`refund-${days}`,days,split:"holdout",subjectId:"holdout-subject",family:"refund-family",cohort:"refund"});
  const inflow={...paid,id:"synthetic-refund",kind:"refund",amount:5000};refund.input.snapshot.wallets[0].openingBalance-=inflow.amount;refund.input.snapshot.entries.push(inflow);refund.input.snapshot.confirmations.push({transactionId:inflow.id,source:"cloud-verified",confirmedAt:refund.input.snapshot.asOf});origins.push(refund);
  const missing=syntheticBacktestOrigin({id:`missing-history-${days}`,days,split:"holdout",subjectId:"missing-subject",family:"missing-family",cohort:"missing-history"});missing.input.completeDays.pop();origins.push(missing);
  const unknown=syntheticBacktestOrigin({id:`incomplete-truth-${days}`,days,subjectId:"unknown-subject",family:"unknown-family",cohort:"incomplete-truth"});unknown.truth[0].complete=false;origins.push(unknown);
  origins.push(syntheticBacktestOrigin({id:`usd-${days}`,days,currency:"USD",dailySpend:100,subjectId:"usd-subject",family:"usd-family",cohort:"usd"}));
 }
 return {version:"synthetic-v1",source:{kind:"synthetic",reference:"picket-synthetic-cashflow-v1"},observationCutoff:"2026-12-01T00:00:00Z",origins};
}

try{
 const args=process.argv.slice(2),options=new Map<string,string>();let synthetic=false;
 for(let index=0;index<args.length;index++){
  const flag=args[index];
  if(flag==="--synthetic"&&!synthetic){synthetic=true;continue;}
  if(!["--input","--output"].includes(flag)||options.has(flag)||!args[index+1]||args[index+1].startsWith("--"))throw new Error("Invalid options");
  options.set(flag,args[++index]);
 }
 const input=options.get("--input"),output=options.get("--output");
 if(!output||!output.endsWith(".json")||synthetic===Boolean(input)||input&&resolve(input)===resolve(output))throw new Error("Choose input and a distinct JSON output");
 if(input&&statSync(input).size>10*1024*1024)throw new Error("Input exceeds limit");
 const dataset=synthetic?syntheticDataset():JSON.parse(readFileSync(input!,"utf8").replace(/^\uFEFF/,"")) as BacktestDataset;
 const report=runForecastBacktest(dataset);
 // Exclusive creation prevents accidentally replacing a source dataset or report.
 writeFileSync(resolve(output),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
 process.stdout.write(`Backtest report created. Source: ${report.source.kind}. Origins: ${report.origins.length}; excluded: ${report.excludedOrigins}. No model activated.\n`);
}catch{
 process.stderr.write("Backtest failed. Check options, frozen data and an unused JSON output path. Input contents were not logged.\n");
 process.exitCode=1;
}
