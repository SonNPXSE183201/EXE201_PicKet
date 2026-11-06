import assert from "node:assert/strict";
import test from "node:test";
import {emptyGuestFinance} from "../local/guest-finance";
import {validateGuestBackupPayload} from "./guest-backup-model";
const part={id:"part",transactionId:"entry",categoryId:"food",amount:100,deletedAt:null};
function payload(splits:unknown){return {finance:{...emptyGuestFinance(),accounts:[{id:"cash",name:"Cash",currencyCode:"VND",openingBalance:0}],categories:[{id:"food"}],transactions:[{id:"entry",title:"Lunch",amount:100,kind:"expense",accountId:"cash",destinationAccountId:null,occurredAt:"2026-10-01"}],splits},keepsakes:[],receipts:[],media:{}};}
test("backup rejects malformed or foreign split allocations",()=>{
 for(const splits of [{entry:null},{entry:[null]},{missing:[part]},{entry:[{...part,transactionId:"other"}]},{entry:[{...part,categoryId:"missing"}]},{entry:[{...part,amount:-1}]},{entry:[{...part,amount:0.5}]},{entry:[part,part]},{entry:[{...part,amount:101}]}]) assert.throws(()=>validateGuestBackupPayload(payload(splits)));
});
test("backup preserves valid splits and excludes deleted allocations from the amount cap",()=>{
 const p=payload({entry:[part,{...part,id:"deleted",amount:100,deletedAt:"2026-10-02"}]});
 assert.equal(validateGuestBackupPayload(p),p);
 assert.equal(validateGuestBackupPayload(payload({entry:[]})).finance.splits.entry.length,0);
});
