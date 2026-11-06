import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

test("an unsubmitted draft with a missing copied image can be repaired from its intact capture", () => {
  const source = readFileSync(new URL("./pending-receipt.ts", import.meta.url), "utf8");
  assert.match(source, /const createdImage = !existing \|\| !destination.exists/);
  assert.ok(source.indexOf("existing?.transactionRequest") < source.indexOf("const createdImage"));
});

test("reopening one capture uses the same pending receipt and transaction idempotency identity", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  assert.match(source, /savePendingReceiptDraft\(\{\s*id: captureRef\.current\?\.id/);
  const pending = readFileSync(new URL("./pending-receipt.ts", import.meta.url), "utf8");
  assert.match(pending, /ON CONFLICT\(id\)/);
  assert.match(pending, /transaction_id IS NULL/);
});

function fixture() {
  const source = readFileSync(new URL("./pending-receipt.ts", import.meta.url), "utf8");
  const schema = source.match(/CREATE TABLE IF NOT EXISTS pending_receipt_drafts \([\s\S]*?\);/)![0];
  const sql = source.match(/`INSERT INTO pending_receipt_drafts[\s\S]*?`/)![0].slice(1,-1);
  const db = new DatabaseSync(":memory:"); db.exec(schema);
  const save = (owner: string, title: string, day = "2026-10-21") => db.prepare(sql).run("capture-one",owner,"file:///managed.jpg",title,45000,day,null,"manual",0,null,"[]",null,null,"2026-10-21T00:00:00Z");
  return { db, save };
}
test("real SQLite handoff upsert keeps one identity and accepts edits before any server progress", () => {
  const {db,save}=fixture();
  try {
    save("A","first");save("A","edited","2026-10-20");
    const row=db.prepare("SELECT count(*) AS count,merchant,purchased_at FROM pending_receipt_drafts").get()!;
    assert.equal(row.count,1);assert.equal(row.merchant,"edited");assert.equal(row.purchased_at,"2026-10-20");
  } finally { db.close(); }
});
test("handoff retries never overwrite uploaded or already committed payloads", () => {
  for (const column of ["storage_path","transaction_id"]) {
    const {db,save}=fixture();
    try {
      save("A","original");db.exec(`UPDATE pending_receipt_drafts SET ${column}='accepted'`);
      save("A","changed");assert.equal(db.prepare("SELECT merchant FROM pending_receipt_drafts").get()!.merchant,"original");
    } finally { db.close(); }
  }
});
test("a colliding foreign owner cannot overwrite a pending receipt", () => {
  const {db,save}=fixture();
  try {
    save("A","A-private");save("B","B-replacement");
    const row=db.prepare("SELECT user_id,merchant FROM pending_receipt_drafts").get()!;
    assert.equal(row.user_id,"A");assert.equal(row.merchant,"A-private");
  } finally { db.close(); }
});

test("canonical request SQL pins the first encrypted value only for its owner", () => {
  const {db,save}=fixture();
  try {
    save("A","original");
    const source=readFileSync(new URL("./pending-receipt.ts",import.meta.url),"utf8");
    const sql=source.match(/"UPDATE pending_receipt_drafts SET transaction_request_payload=COALESCE[^"\n]+"/)![0].slice(1,-1);
    db.prepare(sql).run("enc-v1:first","capture-one","A");
    db.prepare(sql).run("enc-v1:changed","capture-one","A");
    db.prepare(sql).run("enc-v1:foreign","capture-one","B");
    assert.equal(db.prepare("SELECT transaction_request_payload FROM pending_receipt_drafts").get()!.transaction_request_payload,"enc-v1:first");
    save("A","edited after pin");
    assert.equal(db.prepare("SELECT merchant FROM pending_receipt_drafts").get()!.merchant,"original");
  } finally {db.close();}
});

test("moving an Expo File must not let temp cleanup delete the destination", () => {
  const source=readFileSync(new URL("./pending-receipt.ts",import.meta.url),"utf8");
  assert.match(source,/temp\.uri === tempUri && temp\.exists/);
});

test("durable media writers await Expo asynchronous moves before publishing references", () => {
  for (const path of ["./pending-receipt.ts", "../ocr/capture-storage.ts", "../../features/keepsakes/keepsake-photo-storage.ts"]) {
    const source=readFileSync(new URL(path,import.meta.url),"utf8");
    assert.match(source,/await temp\.move\(destination\)/,path);
  }
});
