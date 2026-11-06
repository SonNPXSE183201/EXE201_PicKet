import assert from "node:assert/strict";
import test from "node:test";
import {applyGuestMutation,emptyGuestFinance,type GuestFinance,type GuestMutation} from "./guest-finance";
import {validateGuestBackupPayload} from "../export/guest-backup-model";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const timestamp="2026-10-01T12:00:00Z";
const request:Extract<GuestMutation,{type:"reconcile.apply"}>={type:"reconcile.apply",id:"r1",accountId:"cash",statementDate:"2026-10-01",statementBalance:80,selectedTransactionIds:["spent"],reason:"Reviewed",occurredAt:timestamp};
function initial():GuestFinance{return {...emptyGuestFinance(),accounts:[{id:"cash",name:"Cash",kind:"cash" as const,currencyCode:"VND",openingBalance:100,archived:false,version:1,createdAt:timestamp,updatedAt:timestamp,deletedAt:null}],transactions:[{id:"spent",title:"Meal",amount:20,kind:"expense" as const,accountId:"cash",destinationAccountId:null,categoryId:null,occurredAt:timestamp,note:"",refundOfTransactionId:null,version:1,createdAt:timestamp,updatedAt:timestamp,deletedAt:null}]};}

test("zero-adjustment reconciliation replay after restart does not touch transaction versions",()=>{
 const saved=applyGuestMutation(initial(),request),restarted=JSON.parse(JSON.stringify(saved));
 assert.equal(applyGuestMutation(restarted,{...request,occurredAt:"2026-10-02T00:00:00Z"}),restarted);
 assert.equal(restarted.transactions[0].version,2);
});
test("completed reconciliation replay cannot undo a later reconciliation",()=>{
 const first=applyGuestMutation(initial(),request);
 const second=applyGuestMutation(first,{...request,id:"r2",selectedTransactionIds:[],statementBalance:100});
 assert.deepEqual(second.transactions[0].reconciledAccountIds,[]);
 assert.equal(applyGuestMutation(second,request),second);
});
test("reconciliation request identity rejects changed canonical details",()=>{
 const saved=applyGuestMutation(initial(),{...request,statementBalance:90});
 for(const change of [{statementBalance:91},{accountId:"other"},{statementDate:"2026-10-02"},{reason:"Changed"},{selectedTransactionIds:[]}])assert.throws(()=>applyGuestMutation(saved,{...request,statementBalance:90,...change}));
});
test("deleted adjustment cannot be recreated by retrying its completed request",()=>{
 const saved=applyGuestMutation(initial(),{...request,statementBalance:90});
 const removed=applyGuestMutation(saved,{type:"transaction.archive",id:request.id});
 assert.equal(applyGuestMutation(JSON.parse(JSON.stringify(removed)),{...request,statementBalance:90}).transactions.length,1);
});
test("invalid calendar dates, deleted rows and oversized adjustments reject before mutation",()=>{
 assert.throws(()=>applyGuestMutation(initial(),{...request,statementDate:"2026-02-31"}));
 assert.throws(()=>applyGuestMutation(initial(),{...request,statementBalance:-9_000_000_000_000}));
 const deleted=initial();deleted.transactions[0]={...deleted.transactions[0],deletedAt:timestamp};
 assert.throws(()=>applyGuestMutation(deleted,request));
});

test("backup roundtrip preserves reconciliation receipts and old backups remain compatible",()=>{
 const saved=applyGuestMutation(initial(),{...request,statementBalance:90});
 const restored=validateGuestBackupPayload(JSON.parse(JSON.stringify({finance:saved,keepsakes:[],receipts:[],media:{}}))).finance;
 assert.equal(applyGuestMutation(restored,{...request,statementBalance:90}),restored);
 assert.equal(restored.reconciliationReceipts?.[0].difference,10);
 const old=initial();delete old.reconciliationReceipts;
 assert.ok(validateGuestBackupPayload({finance:old,keepsakes:[],receipts:[],media:{}}));
});

test("invalid reconciliation histories fail closed on restore and before any new write",()=>{
 const valid={id:"x",payload:JSON.stringify({accountId:"cash",statementDate:"2026-10-01",statementBalance:80,selectedTransactionIds:["spent"],reason:""}),difference:0};
 for(const reconciliationReceipts of [null,"bad",[{}],[{...valid,id:""}],[{...valid,id:"x".repeat(201)}],[valid,valid],[{...valid,payload:"{}"}],[{...valid,difference:1.5}],[{...valid,difference:9e12+1}],Array(50001).fill(valid)]){
  const finance={...initial(),reconciliationReceipts};
  assert.throws(()=>validateGuestBackupPayload({finance,keepsakes:[],receipts:[],media:{}}));
  assert.throws(()=>applyGuestMutation(finance as GuestFinance,request));
 }
});

test("legacy adjustment identity fails closed and archived wallet replay keeps its saved result",()=>{
 const saved=applyGuestMutation(initial(),{...request,statementBalance:90});
 const legacy={...saved};delete legacy.reconciliationReceipts;
 assert.throws(()=>applyGuestMutation(legacy,{...request,statementBalance:90}));
 const archived={...saved,accounts:[],planningCloses:{"2026-10":{month:"2026-10",closedAt:timestamp,income:0,expense:0,note:"",rollover:false}}};
 assert.equal(applyGuestMutation(archived,{...request,statementBalance:90}),archived);
 assert.throws(()=>applyGuestMutation(archived,{...request,id:"new"}));
});

test("reconciliation UI displays the result returned after serialized persistence",()=>{
 const screen=readFileSync(resolve(process.cwd(),"src/app/reconcile.tsx"),"utf8");
 assert.doesNotMatch(screen,/savedCleared|request.statementBalance -/);
 assert.match(screen,/state.reconciliationReceipts\?\.find/);
 const context=readFileSync(resolve(process.cwd(),"src/core/local/guest-finance-context.tsx"),"utf8");
 assert.ok(context.indexOf("await writeOfflineCache")<context.indexOf("return next;"));
});
