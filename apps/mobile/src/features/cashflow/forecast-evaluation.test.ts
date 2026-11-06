import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateForecast } from "./forecast-evaluation";
const path=(values:number[])=>values.map((balance,index)=>({day:`2026-10-${String(index+1).padStart(2,"0")}`,balance,currency:"VND"}));
test("evaluation reports balance MAE and missed/false negative days separately",()=>{
  const result=evaluateForecast(path([100,100,-100,100,100,100,100]),path([100,-100,100,100,100,100,100]));
  assert.equal(result.mae,400/7);
  assert.equal(result.missedLowBalanceDays,1);
  assert.equal(result.falseLowBalanceDays,1);
  assert.equal(result.minimumDayError,1);
});
test("flat complete paths have zero error, while currencies must never mix",()=>{
  const rows=path(Array(30).fill(0));
  assert.deepEqual(evaluateForecast(rows,rows),{currency:"VND",evaluatedDays:30,mae:0,missedLowBalanceDays:0,falseLowBalanceDays:0,minimumDayError:0});
  assert.throws(()=>evaluateForecast(rows,rows.map(row=>({...row,currency:"USD"}))));
});
test("unknown or misaligned ground truth cannot silently improve evaluation metrics",()=>{
  assert.throws(()=>evaluateForecast(path([1,2]),path([1,2])));
  assert.throws(()=>evaluateForecast(path(Array(7).fill(1)),path(Array(6).fill(1))));
  const wrong=path(Array(7).fill(1));wrong[1].day=wrong[0].day;
  assert.throws(()=>evaluateForecast(path(Array(7).fill(1)),wrong));
  assert.throws(()=>evaluateForecast(path(Array(7).fill(1)),path([NaN,1,1,1,1,1,1])));
});
