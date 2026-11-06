import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCashflow } from "./forecast";
test("malformed settlement flags cannot quietly include an obligation",()=>{
 const input={startDay:"2026-10-23",days:7,currency:"VND",openingBalance:0,occurrences:[{id:"x",day:"2026-10-24",amount:-10,currency:"VND",settled:"false" as unknown as boolean}]};
 assert.throws(()=>calculateCashflow(input));
});
