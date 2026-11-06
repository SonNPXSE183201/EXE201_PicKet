import assert from "node:assert/strict";
import test from "node:test";
import {emptyGuestFinance} from "../local/guest-finance";
import {validateGuestBackupPayload} from "./guest-backup-model";
const payload=()=>({finance:emptyGuestFinance(),keepsakes:[],receipts:[],media:{}});
test("backup rejects unsupported planning methods and invalid period limits",()=>{
 for(const patch of [{planningMethod:"unknown"},{planningPeriods:{"2026-13:food":100}},{planningPeriods:{"2026-09:food":-1}},{planningPeriods:{"2026-09:food":9_000_000_000_001}},{planningPeriods:{"2026-09:food":0.5}}]){
  const p=payload();Object.assign(p.finance,patch);assert.throws(()=>validateGuestBackupPayload(p));
 }
});
test("backup validates closed month identity, totals and review metadata",()=>{
 const close={month:"2026-09",income:100,expense:-20,note:"",closedAt:"2026-10-01T00:00:00Z",rollover:false};
 const p=payload();p.finance.planningCloses[close.month]=close;
 assert.equal(validateGuestBackupPayload(p),p);
 for(const patch of [{month:"2026-08"},{income:-1},{income:Number.MAX_SAFE_INTEGER+1},{expense:0.5},{note:"x".repeat(1001)},{closedAt:"invalid"},{rollover:"yes"}]){
  const invalid=payload();invalid.finance.planningCloses[close.month]={...close,...patch} as typeof close;
  assert.throws(()=>validateGuestBackupPayload(invalid));
 }
});
