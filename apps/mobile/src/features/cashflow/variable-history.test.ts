import assert from "node:assert/strict";
import {test} from "node:test";
import {buildVariableHistory,type VariableHistoryInput} from "./variable-history";
const asOf="2026-10-01T00:00:00Z",at="2026-09-30T12:00:00Z";
const wallet={id:"cash",name:"Cash",currencyCode:"VND",openingBalance:10000,archived:false,deletedAt:null,updatedAt:at};
const entry=(id:string,kind="expense",amount=100)=>({id,accountId:"cash",destinationAccountId:null,kind,amount,occurredAt:at,updatedAt:at,deletedAt:null});
const input=():VariableHistoryInput=>({snapshot:{asOf,wallets:[wallet],entries:[],confirmations:[]},accounts:["cash"],currency:"VND",startDay:"2026-10-01",pendingCount:0,completeScope:{accounts:["cash"],currency:"VND"},completeDays:[],reviews:[]});
test("absence of transactions never invents complete zero-spend days",()=>{
 const result=buildVariableHistory(input());assert.equal(result.history.length,28);assert.equal(result.completeDays,0);
 assert.ok(result.history.every(row=>!row.complete&&row.amount===0));
 const confirmed=buildVariableHistory({...input(),completeDays:[{day:"2026-09-30",confirmedAt:asOf}]});
 assert.deepEqual(confirmed.history.at(-1),{day:"2026-09-30",currency:"VND",complete:true,amount:0});
});
test("reviewed variable expenses exclude scheduled costs one-offs income refunds and transfers",()=>{
 const value=input();value.snapshot.entries=[entry("meal"),entry("rent","expense",500),entry("oneoff","expense",900),entry("refund","refund"),entry("income","income")];
 value.snapshot.confirmations=value.snapshot.entries.map(row=>({transactionId:row.id,source:"cloud-verified",confirmedAt:asOf}));
 value.reviews=[{transactionId:"meal",kind:"variable",reviewedAt:asOf},{transactionId:"rent",kind:"scheduled",reviewedAt:asOf},{transactionId:"oneoff",kind:"one-off",reviewedAt:asOf}];
 value.completeDays=[{day:"2026-09-30",confirmedAt:asOf}];
 const before=structuredClone(value);const result=buildVariableHistory(value);
 assert.equal(result.history.at(-1)?.amount,100);assert.equal(result.completeDays,1);assert.deepEqual(result.includedVariableTransactionIds,["meal"]);assert.deepEqual(value,before);
});
test("unclassified expense prevents completeness even when a day was confirmed",()=>{
 const value=input();value.snapshot.entries=[entry("unknown")];value.snapshot.confirmations=[{transactionId:"unknown",source:"cloud-verified",confirmedAt:asOf}];value.completeDays=[{day:"2026-09-30",confirmedAt:asOf}];
 const result=buildVariableHistory(value);assert.deepEqual(result.unclassified,["unknown"]);assert.equal(result.history.at(-1)?.complete,false);
});
test("future attestations, open days, duplicate reviews and unavailable evidence cannot leak into history",()=>{
 const value=input();
 for(const day of [{day:"2026-09-30",confirmedAt:"2026-10-02T00:00:00Z"},{day:"2026-09-30",confirmedAt:"2026-09-30T12:00:00Z"},{day:"2026-10-01",confirmedAt:asOf},{day:"2026-02-30",confirmedAt:asOf}])assert.throws(()=>buildVariableHistory({...value,completeDays:[day]}));
 assert.throws(()=>buildVariableHistory({...value,completeDays:[{day:"2026-09-30",confirmedAt:asOf},{day:"2026-09-30",confirmedAt:asOf}]}));
 assert.throws(()=>buildVariableHistory({...value,reviews:[{transactionId:"foreign",kind:"variable",reviewedAt:asOf}]}));
 assert.throws(()=>buildVariableHistory({...value,startDay:"2026-10-02"}));
});
test("wallet completeness cannot be reused after scope changes or with pending mutations",()=>{
 const value=input();
 assert.throws(()=>buildVariableHistory({...value,pendingCount:1}));
 assert.throws(()=>buildVariableHistory({...value,completeScope:{accounts:["other"],currency:"VND"}}));
 assert.throws(()=>buildVariableHistory({...value,completeScope:{accounts:["cash"],currency:"USD"}}));
});
test("expense reviews must follow the latest known version and cannot classify other movements",()=>{
 const value=input();value.snapshot.entries=[entry("meal"),entry("income","income")];value.snapshot.confirmations=value.snapshot.entries.map(row=>({transactionId:row.id,source:"cloud-verified",confirmedAt:asOf}));
 for(const review of [{transactionId:"meal",kind:"variable" as const,reviewedAt:"2026-09-29T00:00:00Z"},{transactionId:"meal",kind:"variable" as const,reviewedAt:"2026-10-02T00:00:00Z"},{transactionId:"income",kind:"variable" as const,reviewedAt:asOf}])assert.throws(()=>buildVariableHistory({...value,reviews:[review]}));
 const review={transactionId:"meal",kind:"variable" as const,reviewedAt:asOf};
 assert.throws(()=>buildVariableHistory({...value,reviews:[review,review]}));
 const edited=structuredClone(value);edited.snapshot.entries[0].updatedAt="2026-10-02T00:00:00Z";
 assert.throws(()=>buildVariableHistory(edited));
});

test("expenses are bucketed by the owner's local day, not UTC", async () => {
 const { localDayOf } = await import("./variable-history");
 // 00:30 on 1 Oct in Vietnam is still 30 Sep in UTC.
 assert.equal(localDayOf("2026-09-30T17:30:00Z", "Asia/Ho_Chi_Minh"), "2026-10-01");
 assert.equal(localDayOf("2026-09-30T17:30:00Z"), "2026-09-30");
 // Month boundary.
 assert.equal(localDayOf("2026-10-31T16:59:59Z", "Asia/Ho_Chi_Minh"), "2026-10-31");
 assert.equal(localDayOf("2026-10-31T17:00:00Z", "Asia/Ho_Chi_Minh"), "2026-11-01");
});
