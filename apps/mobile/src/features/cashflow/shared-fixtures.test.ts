import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { calculateCashflow } from "./forecast";
const fixtures=JSON.parse(readFileSync(new URL("../../../../../packages/finance-fixtures/cashflow-v1.json",import.meta.url),"utf8").replace(/^\uFEFF/,""));
for(const fixture of fixtures) test(`shared arithmetic: ${fixture.name}`,()=>{
 const result=calculateCashflow(fixture.input,fixture.purchase);
 assert.equal(result.baseline.at(-1)?.balance,fixture.expected.lastBalance);
 assert.equal(result.scenario?.at(-1)?.balance??null,fixture.expected.scenarioLastBalance);
 assert.equal(result.minimum,fixture.expected.minimum);
});

