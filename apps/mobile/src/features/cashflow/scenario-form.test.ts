import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScenarioMoney } from "./scenario-form";
test("scenario amounts reject empty, fractions, ambiguous separators and overflow",()=>{
  for(const value of [""," ","1e6","1.5","1,000","9000000000001","Infinity"])assert.throws(()=>parseScenarioMoney(value));
  assert.equal(parseScenarioMoney("-1000"),-1000);
  assert.equal(parseScenarioMoney("0"),0);
});
