import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateVariableSpending } from "./variable-spending";
import fixtures from "../../../../../packages/finance-fixtures/variable-spending-v1.json";

for(const fixture of fixtures)test(`shared variable estimate: ${fixture.name}`,()=>{
  const result=estimateVariableSpending(fixture.input);
  assert.equal(result.kind,fixture.expected.kind);
  assert.equal(result.dailyAmount,fixture.expected.dailyAmount);
  assert.equal(result.observedDays,fixture.expected.observedDays);
  assert.equal(result.occurrences.length,fixture.expected.occurrences);
});

const history=Array.from({length:28},(_,index)=>({day:new Date(Date.UTC(2026,8,index+1)).toISOString().slice(0,10),currency:"VND",complete:true,amount:10000}));
test("F1 uses only confirmed complete history before origin and produces explicit daily estimates",()=>{
  const result=estimateVariableSpending({startDay:"2026-09-29",days:7,currency:"VND",history});
  assert.equal(result.kind,"trailing-median-scenario");
  assert.equal(result.dailyAmount,10000);
  assert.equal(result.occurrences.length,7);
  assert.equal(result.occurrences[0].amount,-10000);
  assert.deepEqual(history[0],{day:"2026-09-01",currency:"VND",complete:true,amount:10000});
});
test("missing days cause abstention; observed zero and incomplete days remain distinct",()=>{
  assert.equal(estimateVariableSpending({startDay:"2026-09-29",days:7,currency:"VND",history:history.slice(1)}).kind,"insufficient-history");
  assert.equal(estimateVariableSpending({startDay:"2026-09-29",days:7,currency:"VND",history:history.map(row=>({...row,amount:0}))}).dailyAmount,0);
  assert.equal(estimateVariableSpending({startDay:"2026-09-29",days:7,currency:"VND",history:history.map((row,index)=>({...row,complete:index!==0}))}).kind,"insufficient-history");
});
test("future records cannot leak into estimates and mixed currencies or duplicate dates reject",()=>{
  const base={startDay:"2026-09-29",days:7,currency:"VND",history};
  assert.equal(estimateVariableSpending({...base,history:[...history,{...history[0],day:"2026-09-29",amount:9000000}]}).dailyAmount,10000);
  assert.throws(()=>estimateVariableSpending({...base,history:[...history,history[0]]}));
  assert.throws(()=>estimateVariableSpending({...base,history:history.map(row=>({...row,currency:"USD"}))}));
  assert.throws(()=>estimateVariableSpending({...base,history:[{...history[0],day:"2026-02-30"}]}));
});
