import assert from "node:assert/strict";
import test from "node:test";
import { PicketApiClient } from "@picket/api-client";

test("transaction attempt resolution sends an authenticated non-GET fencing request", async () => {
  let calls=0;
  const api=new PicketApiClient("https://api.example.test",{fetch:async(input,init)=>{
    calls++;
    assert.equal(String(input),"https://api.example.test/v1/transaction-attempts/resolve");
    assert.equal(init?.method,"POST");
    assert.equal(new Headers(init?.headers).get("authorization"),"Bearer jwt");
    assert.deepEqual(JSON.parse(String(init?.body)),{idempotencyKey:"receipt-attempt-0001"});
    return Response.json({status:"abandoned"});
  }});
  const resolve=Reflect.get(api,"resolveTransactionAttempt");
  assert.equal(typeof resolve,"function","Missing transaction attempt resolution client");
  assert.deepEqual(await resolve.call(api,"jwt","receipt-attempt-0001"),{status:"abandoned"});
  assert.equal(calls,1);
});
