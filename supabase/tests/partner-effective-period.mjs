import assert from "node:assert/strict";

export async function validatePartnerEffectivePeriod(db) {
  await db.exec("reset role");
  const columns = await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='partner_ads' and column_name in ('starts_at','ends_at')");
  assert.equal(columns.rows.length, 2, "Partner notices need explicit optional effective-period columns");
  const owner = "abababab-abab-4bab-8bab-abababababab";
  await db.exec("begin");
  try {
    await db.query("insert into auth.users(id,email) values($1,'partner-period@example.test')", [owner]);
    await db.exec(`insert into public.partner_ads(title,url,active,starts_at,ends_at) values
      ('QA PERIOD legacy','https://example.com',true,null,null),
      ('QA PERIOD future','https://example.com',true,now()+interval '1 hour',null),
      ('QA PERIOD expired','https://example.com',true,null,now()),
      ('QA PERIOD current','https://example.com',true,now(),now()+interval '1 hour'),
      ('QA PERIOD inactive','https://example.com',false,null,null)`);
    await assert.rejects(db.exec("insert into public.partner_ads(title,url,active,starts_at,ends_at) values('QA PERIOD invalid','https://example.com',true,now(),now()-interval '1 hour')"));
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
  // A deliberate constraint violation aborts the transaction. Roll it back,
  // then build the valid fixture in a fresh transaction for RLS assertions.
  await db.exec("rollback; begin");
  try {
    await db.query("insert into auth.users(id,email) values($1,'partner-period@example.test')", [owner]);
    await db.exec(`insert into public.partner_ads(title,url,active,starts_at,ends_at) values
      ('QA PERIOD legacy','https://example.com',true,null,null),
      ('QA PERIOD future','https://example.com',true,now()+interval '1 hour',null),
      ('QA PERIOD expired','https://example.com',true,null,now()),
      ('QA PERIOD current','https://example.com',true,now(),now()+interval '1 hour'),
      ('QA PERIOD inactive','https://example.com',false,null,null)`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
    await db.exec("set local role authenticated");
    const visible = (await db.query("select title from public.partner_ads where title like 'QA PERIOD %' order by title")).rows.map(row => row.title);
    assert.deepEqual(visible, ["QA PERIOD current", "QA PERIOD legacy"]);
    await db.exec("reset role");
    await db.query("insert into public.staff_members(user_id) values($1)", [owner]);
    await db.exec("set local role authenticated");
    assert.equal((await db.query("select count(*)::int as n from public.partner_ads where title like 'QA PERIOD %'")).rows[0].n, 5);
    await db.query("select public.admin_save_ad(null,'QA PERIOD legacy RPC','','https://example.com',true)");
    assert.equal((await db.query("select count(*)::int as n from public.partner_ads where title='QA PERIOD legacy RPC' and starts_at is null and ends_at is null")).rows[0].n, 1);
    console.log("Partner effective-period SQL passed: nullable legacy, interval constraint, inclusive start/exclusive end RLS, staff visibility, unchanged legacy admin RPC.");
  } finally { await db.exec("reset role; rollback"); }
}
