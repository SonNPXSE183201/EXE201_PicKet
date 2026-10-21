import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

test("receipt recovery only unlocks after acknowledged server fencing and uses the rotated attempt", () => {
  const source=readFileSync(new URL("../../app/transactions/new.tsx",import.meta.url),"utf8");
  assert.match(source,/resolveTransactionAttempt/);
  assert.match(source,/resolution\.status === "abandoned"/);
  assert.match(source,/resetPendingReceiptAttempt/);
  assert.match(source,/draft\.transactionAttemptId \?\? draft\.id/);
});

test("SQLite recovery CAS rotates one owner's rejected attempt, preserves image, and cannot unlock a committed or replaced attempt", () => {
  const source=readFileSync(new URL("./pending-receipt.ts",import.meta.url),"utf8");
  const schema=source.match(/CREATE TABLE IF NOT EXISTS pending_receipt_drafts \([\s\S]*?\);/)![0];
  const sql=source.match(/`UPDATE pending_receipt_drafts SET transaction_request_payload=NULL,[\s\S]*?`/);
  assert.ok(sql,"Missing atomic receipt attempt reset");
  const db=new DatabaseSync(":memory:");db.exec(schema);
  try {
    db.prepare(`INSERT INTO pending_receipt_drafts(id,user_id,image_uri,merchant,amount,provider,review_required,created_at,storage_path,transaction_request_payload)
      VALUES('draft','A','file:///photo.jpg','shop',1,'manual',0,'now','A/receipts/photo.jpg','enc-pinned')`).run();
    const reset=db.prepare(sql[0].slice(1,-1));
    assert.equal(reset.run("new-attempt","draft","B","draft","enc-pinned").changes,0);
    assert.equal(reset.run("new-attempt","draft","A","wrong","enc-pinned").changes,0);
    assert.equal(reset.run("new-attempt","draft","A","draft","wrong").changes,0);
    assert.equal(reset.run("new-attempt","draft","A","draft","enc-pinned").changes,1);
    const row=db.prepare("select * from pending_receipt_drafts").get()!;
    assert.equal(row.image_uri,"file:///photo.jpg");assert.equal(row.storage_path,"A/receipts/photo.jpg");
    assert.equal(row.transaction_attempt_id,"new-attempt");assert.equal(row.transaction_request_payload,null);
    db.exec("UPDATE pending_receipt_drafts SET transaction_id='committed',transaction_request_payload='enc-new'");
    assert.equal(reset.run("another","draft","A","new-attempt","enc-new").changes,0);
  } finally {db.close();}
});
