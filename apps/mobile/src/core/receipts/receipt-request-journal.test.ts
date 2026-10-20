import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createReceiptRequestJournal, parseReceiptRequest } from "./receipt-request-journal";

const request = { accountId: "wallet-A", categoryId: "food", title: "Receipt", amount: 45000, kind: "expense" as const, occurredAt: "2026-10-21T00:00:00Z", note: "original note" };

test("receipt submission pins the full encrypted request before the first cloud mutation", () => {
  const source = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(source, /pinPendingReceiptRequest\(receiptDraft, request\)/);
  assert.ok(source.indexOf("pinPendingReceiptRequest(receiptDraft, request)") < source.indexOf("await uploadReceiptImage("));
  const storage = readFileSync(new URL("./pending-receipt.ts", import.meta.url), "utf8");
  assert.match(storage, /pending-receipt-request:/);
  assert.match(storage, /COALESCE\(transaction_request_payload/);
});

test("concurrent/restarted retries retain the complete first request, isolated by owner", async () => {
  const rows = new Map<string, unknown>(); let writes=0;
  const io = { read: async (owner: string,id: string) => rows.get(owner+":"+id) ?? null,
    saveFirst: async (owner: string,id: string,value: unknown) => { writes++;if (!rows.has(owner+":"+id)) rows.set(owner+":"+id,value); } };
  const journal=createReceiptRequestJournal(io);
  const results=await Promise.all([journal.pin("A","capture",request),journal.pin("A","capture",{...request,accountId:"other",amount:9,note:"changed"})]);
  assert.deepEqual(results,[request,request]);assert.equal(writes,1);
  assert.deepEqual(await createReceiptRequestJournal(io).pin("A","capture",{...request,title:"new"}),request);
  assert.deepEqual(await journal.pin("B","capture",{...request,accountId:"wallet-B"}),{...request,accountId:"wallet-B"});
});
test("read failure prevents mutation; a committed-but-unacknowledged write is recovered rather than replaced", async () => {
  const journal=createReceiptRequestJournal({ read: async () => {throw Error("cannot read");}, saveFirst: async () => assert.fail("No write") });
  await assert.rejects(journal.pin("A","id",request),/cannot read/);
  let saved: unknown=null;
  const restarted=createReceiptRequestJournal({read:async()=>saved,saveFirst:async(_owner,_id,value)=>{saved=value;throw Error("write acknowledgement lost");}});
  await assert.rejects(restarted.pin("A","id",request),/acknowledgement/);
  assert.deepEqual(await restarted.pin("A","id",{...request,amount:1}),request);
});
test("invalid encrypted payload shape cannot silently become a fresh request", async () => {
  const journal=createReceiptRequestJournal({read:async()=>({amount:"broken"}),saveFirst:async()=>assert.fail("No replacement")});
  await assert.rejects(journal.pin("A","id",request),/Invalid receipt request/);
  for (const value of [null, [], {...request,amount:0}, {...request,amount:NaN}, {...request,amount:1.5}, {...request,kind:"transfer"}, {...request,occurredAt:"broken"}, {...request,accountId:""}, {...request,title:" "}, {...request,note:5}]) {
    assert.throws(()=>parseReceiptRequest(value),/Invalid receipt request/);
  }
});

test("missing row acknowledgement and empty identities fail before any network side effects", async () => {
  const journal=createReceiptRequestJournal({read:async()=>null,saveFirst:async()=>undefined});
  await assert.rejects(journal.pin("A","id",request),/not persisted/);
  await assert.rejects(journal.pin("","id",request),/identity/);
  await assert.rejects(journal.pin("A","",request),/identity/);
});
test("normalization retains all canonical fields and does not persist unknown properties", () => {
  assert.deepEqual(parseReceiptRequest({...request,categoryId:undefined,note:undefined,irrelevant:"drop"}),{
    ...request,categoryId:null,note:"",
  });
});

test("known server text limits reject invalid requests before they become immutable", () => {
  assert.throws(()=>parseReceiptRequest({...request,title:"a".repeat(161)}),/Invalid receipt request/);
  assert.throws(()=>parseReceiptRequest({...request,note:"a".repeat(2001)}),/Invalid receipt request/);
  assert.equal(parseReceiptRequest({...request,title:"🧾".repeat(160),note:"a".repeat(2000)}).amount,request.amount);
});
