import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLedgerSnapshot,ledgerOpening } from "./ledger-snapshot";
const now="2026-10-24T12:00:00Z",past="2026-10-23T12:00:00Z";
const wallet=(id:string,currencyCode="VND")=>({id,name:id,currencyCode,openingBalance:100000,archived:false,deletedAt:null,updatedAt:past});
const entry={id:"expense",accountId:"cash",destinationAccountId:null,kind:"expense",amount:19000,occurredAt:past,updatedAt:past,deletedAt:null};
const base={asOf:now,wallets:[wallet("cash"),wallet("bank"),wallet("usd","USD")],entries:[entry],confirmations:[{transactionId:"expense",confirmedAt:now,source:"cloud-verified"}]};
test("server snapshot supplies selected-wallet opening without touching ledger",()=>{
 const before=JSON.stringify(base);const snapshot=parseLedgerSnapshot(base);
 assert.equal(ledgerOpening(snapshot,["cash"],"VND",0).balance,81000);
 assert.equal(ledgerOpening(snapshot,["cash","bank"],"VND",0).balance,181000);
 assert.equal(JSON.stringify(base),before);
 assert.throws(()=>ledgerOpening(snapshot,["cash","usd"],"VND",0));
 assert.throws(()=>ledgerOpening(snapshot,["cash"],"VND",1));
});
test("unconfirmed changed or malformed facts cannot become trusted opening",()=>{
 const snapshot=parseLedgerSnapshot({...base,confirmations:[]});
 assert.throws(()=>ledgerOpening(snapshot,["cash"],"VND",0));
 for(const change of [{asOf:"yesterday"},{wallets:[{...wallet("cash"),openingBalance:NaN}]},{entries:[{...entry,amount:"19000"}]},{confirmations:[{transactionId:"expense",confirmedAt:now,source:"untrusted"}]}]){
  assert.throws(()=>parseLedgerSnapshot({...base,...change}));
 }
});
