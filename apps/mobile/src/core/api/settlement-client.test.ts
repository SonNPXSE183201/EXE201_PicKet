import assert from "node:assert/strict";
import test from "node:test";
import {PicketApiClient} from "@picket/api-client";
test("settlement client uses caller JWT and stable key without accepting an owner parameter",async()=>{
 const seen:RequestInit[]=[];const api=new PicketApiClient("https://api.example.test",{fetch:async(url,init)=>{
  assert.equal(String(url),"https://api.example.test/v1/cashflow-settlements");assert.equal(new Headers(init?.headers).get("authorization"),"Bearer jwt");seen.push(init??{});return Response.json({schemaVersion:1,revision:0,links:[]});
 }});
 await api.cashflowSettlements("jwt");await api.saveCashflowSettlements("jwt",4,[],"stable-settlement-key");
 assert.equal(seen[1].method,"PUT");assert.equal(new Headers(seen[1].headers).get("idempotency-key"),"stable-settlement-key");assert.deepEqual(JSON.parse(String(seen[1].body)),{expectedRevision:4,links:[]});
});
