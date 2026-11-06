import assert from "node:assert/strict";
import { test } from "node:test";
import { filterTransactions } from "./filter-transactions";
test("explicit profile timezone controls transaction month filtering",()=>{
 const row={title:"Month boundary",note:"",kind:"expense",accountId:"wallet",destinationAccountId:null,categoryId:null,occurredAt:"2026-09-30T18:00:00Z"};
 assert.equal(filterTransactions([row],{month:"2026-10",timeZone:"Asia/Ho_Chi_Minh"}).length,1);
 assert.equal(filterTransactions([row],{month:"2026-09",timeZone:"Asia/Ho_Chi_Minh"}).length,0);
});
