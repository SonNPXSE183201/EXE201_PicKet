import assert from "node:assert/strict";

export async function validateTransactionAttemptRecovery(db) {
  const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await db.exec("reset role");
  await db.query("insert into auth.users(id,email) values($1,'attempt-a@example.test'),($2,'attempt-b@example.test')", [owner,other]);
  async function asUser(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
    await db.exec("set role authenticated");
  }
  const key="receipt-attempt-old-0001";
  await asUser(owner);
  const resolve=async value=>(await db.query("select public.resolve_finance_transaction_attempt($1) as result",[value])).rows[0].result;
  assert.deepEqual(await resolve(key),{status:"abandoned"});
  assert.deepEqual(await resolve(key),{status:"abandoned"},"Lost resolution response must be repeatable");
  const wallet=(await db.query("select id from public.wallets where user_id=$1 limit 1",[owner])).rows[0].id;
  const create=async (value)=>db.query("select (public.create_finance_transaction($1,$2,null,'Recovered receipt',12000,'expense','2026-10-21','')).id as id",[value,wallet]);
  await assert.rejects(create(key),/TRANSACTION_ATTEMPT_ABANDONED/);
  const fresh="receipt-attempt-new-0002";
  const id=(await create(fresh)).rows[0].id;
  const committed=await resolve(fresh);
  assert.equal(committed.status,"committed");assert.equal(committed.transaction.id,id);
  assert.equal((await create(fresh)).rows[0].id,id);
  await asUser(other);
  assert.deepEqual(await resolve(fresh),{status:"abandoned"},"Other owner cannot discover the committed resource");
  assert.equal((await db.query("select count(*)::int as n from public.transaction_attempt_tombstones where user_id=$1",[owner])).rows[0].n,0);
  await assert.rejects(db.query("delete from public.transaction_attempt_tombstones"),/permission denied/);
  await assert.rejects(db.query("insert into public.transaction_attempt_tombstones(user_id,key) values($1,'manual-write-test')",[other]),/permission denied/);
  await assert.rejects(resolve("short"),/Invalid idempotency key/);
  await db.exec("reset role; set role anon");
  await assert.rejects(resolve(key),/permission denied/);
  await db.exec("reset role");
  await db.query("delete from auth.users where id in ($1,$2)",[owner,other]);
  assert.equal((await db.query("select count(*)::int as n from public.transaction_attempt_tombstones where user_id in ($1,$2)",[owner,other])).rows[0].n,0);
  console.log("Transaction attempt recovery functional cases PASS: abandon/retry/fence/committed/owner/privilege/cascade");
}
