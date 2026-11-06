import assert from "node:assert/strict";
import {test} from "node:test";
import {runForecastBacktest,type BacktestDataset} from "./forecast-backtest";
import {syntheticBacktestOrigin} from "./synthetic-backtest-fixture";
const dataset=():BacktestDataset=>({version:"synthetic-v1",source:{kind:"synthetic",reference:"unit-fixtures-v1"},observationCutoff:"2026-12-01T00:00:00Z",origins:[syntheticBacktestOrigin()]});
test("frozen F0/F1 share truth and report paired improvement without promoting a model",()=>{
 const input=dataset(),before=structuredClone(input);const result=runForecastBacktest(input);
 assert.equal(result.origins[0].f0?.mae,4000);assert.equal(result.origins[0].f1?.mae,0);
 assert.equal(result.groups[0].relativeImprovement,1);assert.equal(result.groups[0].pairedCount,1);
 assert.equal(result.promotionDecision,"not-evaluated");assert.deepEqual(input,before);
});
test("missing or explicitly incomplete truth is excluded instead of filling zeros",()=>{
 for(const change of ["missing","incomplete"]){const input=dataset();if(change==="missing")input.origins[0].truth.pop();else input.origins[0].truth[0].complete=false;
  const result=runForecastBacktest(input);assert.equal(result.origins[0].status,"excluded");assert.equal(result.origins[0].reason,"incomplete-truth");assert.equal(result.origins[0].f0,null);assert.equal(result.groups.length,0);
 }
 const partial=dataset();partial.origins[0].truth[0].complete=false;partial.origins[0].truth[0].observedAt="2026-10-01T12:00:00Z";
 assert.equal(runForecastBacktest(partial).origins[0].reason,"incomplete-truth");
});
test("insufficient reviewed history abstains from F1 and never fabricates a paired comparison",()=>{
 const input=dataset();input.origins[0].input.completeDays.pop();const result=runForecastBacktest(input);
 assert.ok(result.origins[0].f0);assert.equal(result.origins[0].f1,null);assert.equal(result.groups[0].pairedCount,0);assert.equal(result.groups[0].f1Unavailable,1);assert.equal(result.groups[0].relativeImprovement,null);
});
test("timestamps and split identities prevent future input and repeated subject leakage",()=>{
 const input=dataset();input.origins[0].schedules.capturedAt="2026-10-02T00:00:00Z";assert.throws(()=>runForecastBacktest(input));
 const leak=dataset();leak.origins.push({...structuredClone(leak.origins[0]),id:"other-origin",split:"holdout"});assert.throws(()=>runForecastBacktest(leak));
 const family=dataset();family.origins.push({...structuredClone(family.origins[0]),id:"other-origin",subjectId:"other-subject",split:"holdout"});assert.throws(()=>runForecastBacktest(family));
 const duplicate=dataset();duplicate.origins.push({...structuredClone(duplicate.origins[0]),id:"duplicated-window"});assert.throws(()=>runForecastBacktest(duplicate));
});
test("thirty-day metrics capture missed low-balance days and weekly origins retain ledger continuity",()=>{
 const input=dataset();input.origins=[syntheticBacktestOrigin({days:30}),syntheticBacktestOrigin({id:"week-two",startDay:"2026-10-08",days:30})];
 const result=runForecastBacktest(input);assert.equal(result.origins[0].f0?.mae,15500);assert.equal(result.origins[0].f0?.missedLowBalanceDays,20);assert.equal(result.origins[0].f1?.missedLowBalanceDays,0);assert.equal(result.groups[0].pairedCount,2);
 input.origins[1]=syntheticBacktestOrigin({id:"wrong-cadence",startDay:"2026-10-09",days:30});assert.throws(()=>runForecastBacktest(input));
});
test("zero-error baselines never produce a division-by-zero or an improvement claim",()=>{
 const input=dataset();input.origins=[syntheticBacktestOrigin({dailySpend:0})];const result=runForecastBacktest(input);
 assert.equal(result.groups[0].relativeImprovement,null);assert.equal(result.groups[0].comparisonStatus,"baseline-zero");assert.equal(result.origins[0].f1?.mae,0);
});
test("cohorts, splits, horizons and currencies stay separate and comparisons use only paired origins",()=>{
 const input=dataset();input.origins=[syntheticBacktestOrigin({dailySpend:800}),syntheticBacktestOrigin({id:"no-history",subjectId:"second-subject"})];input.origins[1].input.completeDays=[];
 const paired=runForecastBacktest(input).groups[0];assert.equal(paired.f0.medianMae,3600);assert.equal(paired.pairedF0?.medianMae,3200);assert.equal(paired.pairedCount,1);assert.equal(paired.f1Unavailable,1);
 input.origins.push(syntheticBacktestOrigin({id:"usd",subjectId:"usd-subject",currency:"USD",dailySpend:100}),syntheticBacktestOrigin({id:"holdout",subjectId:"holdout-subject",family:"unseen-family",split:"holdout"}),syntheticBacktestOrigin({id:"thirty",days:30}));
 assert.equal(runForecastBacktest(input).groups.length,4);
});
test("linked payments known at origin are not counted a second time in either engine",()=>{
 const input=dataset(),sample=input.origins[0],asOf=sample.input.snapshot.asOf,wallet=sample.input.accounts[0];
 const paid={id:"paid-rent",accountId:wallet,destinationAccountId:null,kind:"expense",amount:19000,occurredAt:"2026-09-30T12:00:00Z",updatedAt:"2026-09-30T12:00:00Z",deletedAt:null};
 sample.input.snapshot.wallets[0].openingBalance+=19000;sample.input.snapshot.entries.push(paid);sample.input.snapshot.confirmations.push({transactionId:paid.id,source:"cloud-verified",confirmedAt:asOf});sample.input.reviews.push({transactionId:paid.id,kind:"scheduled",reviewedAt:asOf});
 sample.schedules.rows=[{id:"rent",startDay:sample.input.startDay,frequency:"once",amount:-19000,currency:"VND",active:true,walletId:wallet}];
 sample.settlements.links=[{occurrenceId:"rent:2026-10-01",day:sample.input.startDay,amount:-19000,currency:"VND",transactionId:paid.id,transactionUpdatedAt:paid.updatedAt}];
 const result=runForecastBacktest(input);assert.equal(result.origins[0].f0?.mae,4000);assert.equal(result.origins[0].f1?.mae,0);
 sample.settlements.links[0].transactionUpdatedAt="2026-09-29T00:00:00Z";assert.equal(runForecastBacktest(input).origins[0].reason,"unusable-features");
});
test("future labels or reviews and malformed truth fail before reporting quality",()=>{
 for(const change of ["future-review","premature-truth","future-truth","duplicate-truth","wrong-currency","invalid-balance"]){const input=dataset(),sample=input.origins[0];
  if(change==="future-review")sample.input.reviews[0].reviewedAt="2026-10-02T00:00:00Z";
  if(change==="premature-truth")sample.truth[0].observedAt="2026-10-01T12:00:00Z";
  if(change==="future-truth")sample.truth[0].observedAt="2027-01-01T00:00:00Z";
  if(change==="duplicate-truth")sample.truth[1]=sample.truth[0];
  if(change==="wrong-currency")sample.truth[0].currency="USD";
  if(change==="invalid-balance")sample.truth[0].balance=NaN;
  assert.throws(()=>runForecastBacktest(input),change);
 }
 const edited=dataset();edited.origins[0].input.snapshot.entries[0].updatedAt="2026-10-02T00:00:00Z";assert.equal(runForecastBacktest(edited).origins[0].reason,"unusable-features");
 const future=dataset();future.origins[0].input.snapshot.entries[0].occurredAt="2026-10-02T00:00:00Z";future.origins[0].input.snapshot.entries[0].updatedAt="2026-10-02T00:00:00Z";assert.equal(runForecastBacktest(future).origins[0].reason,"unusable-features");
 const pending=dataset();pending.origins[0].input.pendingCount=1;assert.equal(runForecastBacktest(pending).origins[0].f0,null);
});
test("invalid classification disables F1 without hiding the F0 result",()=>{
 const input=dataset();input.origins[0].input.reviews[0].transactionId="unknown";
 const result=runForecastBacktest(input).origins[0];assert.equal(result.status,"evaluated");assert.equal(result.f1,null);assert.equal(result.f1Reason,"invalid-history");assert.ok(result.f0);
});
