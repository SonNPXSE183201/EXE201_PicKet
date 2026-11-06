import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLedgerFacts, type LedgerFactsInput } from "./ledger-facts";
const at="2026-10-24T00:00:00Z";
const earlier="2026-10-23T00:00:00Z";
const wallet=(id:string)=>({id,currencyCode:"VND",openingBalance:1000,archived:false,deletedAt:null,updatedAt:earlier});
const base:LedgerFactsInput={asOf:at,currency:"VND",selectedAccountIds:["cash","bank"],wallets:[wallet("cash"),wallet("bank")],entries:[],confirmations:[],pendingTransactionIds:[]};
const transfer={id:"transfer",accountId:"cash",destinationAccountId:"bank",kind:"transfer",amount:100,occurredAt:earlier,deletedAt:null,updatedAt:earlier};
const confirmed={transactionId:"transfer",confirmedAt:earlier,source:"manual" as const};
test("confirmed transfers are neutral inside scope and count one side outside scope",()=>{
  const input={...base,entries:[transfer],confirmations:[confirmed]};
  assert.equal(buildLedgerFacts(input).balance,2000);
  assert.equal(buildLedgerFacts({...input,selectedAccountIds:["cash"]}).balance,900);
  assert.equal(buildLedgerFacts({...input,selectedAccountIds:["bank"]}).balance,1100);
});
test("pending and unconfirmed entries make facts incomplete instead of claiming a posted balance",()=>{
  const input={...base,entries:[{...transfer,id:"expense",kind:"expense",destinationAccountId:null}]};
  assert.equal(buildLedgerFacts(input).quality,"incomplete");
  assert.deepEqual(buildLedgerFacts(input).excluded,[{id:"expense",reason:"unconfirmed"}]);
  assert.equal(buildLedgerFacts({...base,entries:[transfer],confirmations:[confirmed],pendingTransactionIds:["transfer"]}).quality,"incomplete");
});
test("future edits cannot leak into historical facts and cross currency transfers reject",()=>{
  const input={...base,entries:[{...transfer,updatedAt:"2026-10-25T00:00:00Z"}],confirmations:[confirmed]};
  assert.deepEqual(buildLedgerFacts(input).excluded,[{id:"transfer",reason:"edited-after-origin"}]);
  assert.throws(()=>buildLedgerFacts({...base,entries:[transfer],confirmations:[confirmed],wallets:[wallet("cash"),{...wallet("bank"),currencyCode:"USD"}],selectedAccountIds:["cash"]}));
});
test("refunds remain actual inflows, deleted records are omitted and self transfers reject",()=>{
  const refund={...transfer,id:"refund",kind:"refund",destinationAccountId:null};
  const input={...base,entries:[refund,{...transfer,id:"deleted",deletedAt:earlier}],confirmations:[{...confirmed,transactionId:"refund"}]};
  const before=JSON.stringify(input);
  assert.equal(buildLedgerFacts(input).balance,2100);
  assert.deepEqual(buildLedgerFacts(input).includedTransactionIds,["refund"]);
  assert.equal(JSON.stringify(input),before);
  assert.throws(()=>buildLedgerFacts({...base,entries:[{...transfer,destinationAccountId:"cash"}],confirmations:[confirmed]}));
});
test("unknown confirmation, future confirmation and invalid snapshot scope fail visibly",()=>{
  assert.equal(buildLedgerFacts({...base,entries:[transfer],confirmations:[{...confirmed,confirmedAt:"2026-10-25T00:00:00Z"}]}).quality,"incomplete");
  assert.throws(()=>buildLedgerFacts({...base,asOf:"2026-02-30T00:00:00Z"}));
  assert.throws(()=>buildLedgerFacts({...base,selectedAccountIds:["cash","cash"]}));
  assert.throws(()=>buildLedgerFacts({...base,entries:[transfer,transfer],confirmations:[confirmed]}));
});
