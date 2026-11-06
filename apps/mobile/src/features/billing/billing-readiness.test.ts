import assert from "node:assert/strict";
import { test } from "node:test";
import { canStartPlayPurchase } from "./billing-policy";
test("new purchases fail closed until Android, Play and server are all ready",()=>{
 assert.equal(canStartPlayPurchase("android",true,{newPurchasesEnabled:true}),true);
 for(const state of [undefined,null,{}, {newPurchasesEnabled:false},{newPurchasesEnabled:"true"}])assert.equal(canStartPlayPurchase("android",true,state),false);
 assert.equal(canStartPlayPurchase("android",false,{newPurchasesEnabled:true}),false);
 assert.equal(canStartPlayPurchase("web",true,{newPurchasesEnabled:true}),false);
});
