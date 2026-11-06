import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSettlements,type SettlementLink } from "./settlements";
import { parseLedgerSnapshot } from "./ledger-snapshot";
import { calculateCashflow } from "./forecast";
const time="2026-10-24T12:00:00Z";
const snapshot=parseLedgerSnapshot({asOf:time,wallets:[{id:"cash",name:"Cash",currencyCode:"VND",openingBalance:100000,archived:false,deletedAt:null,updatedAt:time}],entries:[{id:"paid",accountId:"cash",destinationAccountId:null,kind:"expense",amount:19000,occurredAt:time,deletedAt:null,updatedAt:time}],confirmations:[{transactionId:"paid",source:"cloud-verified",confirmedAt:time}]});
const occurrence={id:"rent:2026-10-24",day:"2026-10-24",amount:-19000,currency:"VND",settled:false};
const link:SettlementLink={occurrenceId:occurrence.id,day:occurrence.day,amount:occurrence.amount,currency:"VND",transactionId:"paid",transactionUpdatedAt:time};
test("only explicitly linked confirmed movements settle an occurrence without mutating facts",()=>{
 const before=JSON.stringify(snapshot);
 assert.deepEqual(resolveSettlements(snapshot,["cash"],"VND",[occurrence],[]),[]);
 assert.deepEqual(resolveSettlements(snapshot,["cash"],"VND",[occurrence],[link]),[occurrence.id]);
 assert.equal(JSON.stringify(snapshot),before);
 const ids=resolveSettlements(snapshot,["cash"],"VND",[occurrence],[link]);
 const path=calculateCashflow({startDay:occurrence.day,days:7,currency:"VND",openingBalance:81000,occurrences:[{...occurrence,settled:ids.includes(occurrence.id)}]});
 assert.equal(path.baseline[0].balance,81000,"paid expense already reduced opening balance");
 assert.equal(calculateCashflow({startDay:occurrence.day,days:7,currency:"VND",openingBalance:81000,occurrences:[occurrence]}).baseline[0].balance,62000,"unlinked schedule remains explicit");
});
test("changed schedules or transactions, duplicates, wrong directions and transfers reject",()=>{
 for(const change of [{amount:-18000},{day:"2026-10-25"},{currency:"USD"},{transactionId:"missing"},{transactionUpdatedAt:"2026-10-23T12:00:00Z"}])assert.throws(()=>resolveSettlements(snapshot,["cash"],"VND",[occurrence],[{...link,...change}]));
 assert.throws(()=>resolveSettlements(snapshot,["cash"],"VND",[occurrence],[link,link]));
 assert.throws(()=>resolveSettlements(snapshot,["cash"],"VND",[{...occurrence,walletId:"another-wallet"}],[link]));
 const second={...occurrence,id:"second:2026-10-24"};
 assert.throws(()=>resolveSettlements(snapshot,["cash"],"VND",[occurrence,second],[link,{...link,occurrenceId:second.id}]));
 for(const kind of ["income","refund","transfer"]){
  assert.throws(()=>resolveSettlements({...snapshot,entries:[{...snapshot.entries[0],kind}]},["cash"],"VND",[occurrence],[link]));
 }
 assert.throws(()=>resolveSettlements({...snapshot,confirmations:[]},["cash"],"VND",[occurrence],[link]));
 assert.throws(()=>resolveSettlements({...snapshot,entries:[{...snapshot.entries[0],deletedAt:time}]},["cash"],"VND",[occurrence],[link]));
});
test("income links require an included inflow and do not infer future payments",()=>{
 const income={...snapshot,entries:[{...snapshot.entries[0],kind:"income"}]};
 const expected={...occurrence,amount:19000};
 assert.deepEqual(resolveSettlements(income,["cash"],"VND",[expected],[{...link,amount:19000}]),[expected.id]);
 assert.throws(()=>resolveSettlements({...income,entries:[{...income.entries[0],occurredAt:"2026-10-25T00:00:00Z"}]},["cash"],"VND",[expected],[{...link,amount:19000}]));
 assert.throws(()=>resolveSettlements(snapshot,["cash"],"VND",[occurrence,occurrence],[]));
 assert.throws(()=>resolveSettlements(snapshot,["cash"],"VND",[occurrence],Array(1001).fill(link)));
});
