import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "@picket/domain";
import { applyGuestMutation, emptyGuestFinance, type GuestFinance, type GuestMutation } from "./guest-finance";

const row: Transaction = { id:"capture-stable",title:"Original",amount:34567,kind:"income",accountId:"cash",destinationAccountId:null,categoryId:null,occurredAt:"2026-10-21T00:00:00Z",note:"Pinned note",refundOfTransactionId:null,version:1,createdAt:"first",updatedAt:"first",deletedAt:null };
function initial() {
  return { ...emptyGuestFinance(), accounts:[{id:"cash",name:"Cash",kind:"cash" as const,currencyCode:"VND",openingBalance:0,archived:false,version:1,createdAt:"",updatedAt:"",deletedAt:null}] };
}
// Exercise the reducer protocol before implementation, without mocking the
// existing serialized/persist-before-publish guest commit path.
function createOnce(state: GuestFinance, value = row) {
  return applyGuestMutation(state,{type:"transaction.createOnce",value} as unknown as GuestMutation);
}
test("guest receipt replay after lost progress keeps one unchanged transaction", () => {
  const saved=createOnce(initial());
  const restarted=JSON.parse(JSON.stringify(saved)) as GuestFinance;
  const retried=createOnce(restarted,{...row,createdAt:"retry",updatedAt:"retry"});
  assert.equal(retried,restarted);
  assert.equal(retried.transactions.length,1);
  assert.equal(retried.transactions[0].createdAt,"first");
});
test("guest receipt exact replay remains a no-op after month closes or wallet is removed", () => {
  const saved=createOnce(initial());
  saved.accounts=[];
  saved.planningCloses["2026-10"]={month:"2026-10",closedAt:"2026-11-01",income:34567,expense:0,note:"",rollover:false};
  assert.equal(createOnce(saved),saved);
  assert.throws(()=>createOnce(saved,{...row,id:"another"}));
});
test("guest receipt identity collision cannot overwrite any canonical field", () => {
  const saved=createOnce(initial());
  for (const change of [{title:"Edited"},{amount:1},{kind:"expense" as const},{accountId:"other"},{categoryId:"other"},{note:"Changed"},{occurredAt:"2026-10-20"},{destinationAccountId:"other"},{refundOfTransactionId:"other"},{deletedAt:"deleted"}]) {
    assert.throws(()=>createOnce(saved,{...row,...change}));
    assert.deepEqual(saved.transactions,[row]);
  }
});
test("new guest receipt still validates wallet, amount and closed month", () => {
  assert.throws(()=>createOnce(emptyGuestFinance()));
  assert.throws(()=>createOnce(initial(),{...row,amount:0}));
  const closed=initial();
  closed.planningCloses["2026-10"]={month:"2026-10",closedAt:"2026-11-01",income:0,expense:0,note:"",rollover:false};
  assert.throws(()=>createOnce(closed));
});
