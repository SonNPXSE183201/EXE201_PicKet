import assert from "node:assert/strict";

export async function validateOcrRetention(db) {
  await db.exec("reset role");
  const owner = "99999999-9999-4999-8999-999999999999";
  await db.query("insert into auth.users(id,email) values($1,'ocr-retention@example.test')", [owner]);
  async function image(name, { referenced = false, archived = false, live = false } = {}) {
    const path = `${owner}/ocr/${name}.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('picket-media',$1)", [path]);
    await db.query(`insert into public.ocr_fallback_jobs(user_id,storage_path,local_confidence,idempotency_key,expires_at)
      values($1,$2,0.4,gen_random_uuid(),now()+$3::interval)`, [owner, path, live ? "1 hour" : "-1 hour"]);
    if (referenced) await db.query(`insert into public.receipts(user_id,storage_path,archived_at)
      values($1,$2,${archived ? "now()" : "null"})`, [owner, path]);
    return path;
  }
  // Attach before expiring; the trigger must protect existing legacy references.
  const active = await image("active", { referenced: true });
  const archived = await image("archived", { referenced: true, archived: true });
  const unused = await image("unused");
  const live = await image("live", { live: true });
  const paths = (await db.query("select * from public.expire_ocr_fallback_jobs()")).rows.map(row => row.storage_path);
  assert.ok(!paths.includes(active), "Active receipt image must not be selected for deletion");
  assert.ok(!paths.includes(archived), "Archived receipt image must remain restorable");
  assert.ok(!paths.includes(live), "Live job image must not expire");
  assert.ok(paths.includes(unused), "Unreferenced expired image should be claimed");
  const claimed = (await db.query("select storage_deletion_claimed_at from public.ocr_fallback_jobs where storage_path=$1", [unused])).rows[0];
  assert.ok(claimed.storage_deletion_claimed_at);
  await assert.rejects(db.query("insert into public.receipts(user_id,storage_path) values($1,$2)", [owner, unused]), /OCR_IMAGE_DELETION_CLAIMED/);
  // A delayed/failed Storage DELETE must not make the claim disappear.
  assert.ok((await db.query("select * from public.expire_ocr_fallback_jobs()")).rows.some(row => row.storage_path === unused));
  await db.query("select public.acknowledge_ocr_storage_deletion($1)", [[unused]]);
  assert.ok(!(await db.query("select * from public.expire_ocr_fallback_jobs()")).rows.some(row => row.storage_path === unused));
  await assert.rejects(db.query("insert into public.receipts(user_id,storage_path) values($1,$2)", [owner, unused]), /OCR_IMAGE_DELETION_CLAIMED/);
  // Table trigger, not just the create RPC: import/restore cannot bypass it.
  await assert.rejects(db.query("update public.receipts set storage_path=$1 where user_id=$2 and storage_path=$3", [unused, owner, active]), /OCR_IMAGE_DELETION_CLAIMED/);
  // A second still-live job sharing a path prevents cleanup of that path.
  const shared = await image("shared");
  await db.query(`insert into public.ocr_fallback_jobs(user_id,storage_path,local_confidence,idempotency_key,expires_at)
    values($1,$2,0.4,gen_random_uuid(),now()+interval '1 hour')`, [owner, shared]);
  assert.ok(!(await db.query("select * from public.expire_ocr_fallback_jobs()")).rows.some(row => row.storage_path === shared));
  await db.query("delete from auth.users where id=$1", [owner]);
  console.log("OCR retention functional cases PASS: active/archived references, expiry claims, delayed DELETE, ACK, table-write protection, shared live job.");
}
