import assert from "node:assert/strict";
import { test } from "node:test";
import { refreshOwnedPurchases } from "./refresh-purchases";

test("resume refresh deduplicates Play tokens and requires server verification",async()=>{
  let calls=0;
  const row={productId:"picket_plus_monthly",purchaseToken:"test-only-token"};
  const result=await refreshOwnedPurchases([row,row,{...row,productId:"unknown"}],async()=>{calls++;return{verified:false};},()=>true);
  assert.equal(calls,1);
  assert.deepEqual(result,{verified:0,failed:1});
});
test("owner switch stops refresh and prevents counting a previous owner response",async()=>{
  let active=true,calls=0;
  const row={productId:"picket_plus_monthly",purchaseToken:"test-only-token"};
  const result=await refreshOwnedPurchases([row,{...row,purchaseToken:"second-test-token"}],async()=>{calls++;active=false;return{verified:true};},()=>active);
  assert.equal(calls,1);
  assert.deepEqual(result,{verified:0,failed:0});
});
