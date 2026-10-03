import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon,service_role;
grant execute on function auth.uid() to authenticated,anon,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
`,
);
const base = new URL("../migrations/", import.meta.url);
for (
  const file of [
    "202609140001_finance_storage.sql",
    "202609150002_billing.sql",
    "202609150003_administration.sql",
    "202609150004_account_controls.sql",
    "202610010001_normalized_finance.sql",
  ]
) {
  await db.exec(
    readFileSync(new URL(file, base), "utf8").replace(/^\uFEFF/, ""),
  );
}
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [
  a,
  "a@example.test",
  b,
  "b@example.test",
]);
async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function rejects(sql, params = []) {
  await assert.rejects(db.query(sql, params));
}
const payload = {
  version: 2,
  name: "Test",
  onboarded: false,
  hideBalance: false,
  wallets: [],
  entries: [],
  budgets: [],
  bills: [],
  keepsakes: [],
  subscriptions: [],
  closedMonths: [],
};
await asUser(a);
const onboarding = await db.query(
  "select public.complete_onboarding($1,$2,$3,$4,$5,$6) as wallet_id",
  ["An", "Đi làm", "Hiểu chi tiêu", "VND", "Tiền mặt", 1000000],
);
assert.ok(onboarding.rows[0].wallet_id);
assert.equal(
  (await db.query("select onboarding_completed from public.profiles"))
    .rows[0].onboarding_completed,
  true,
);
assert.equal(
  (await db.query("select opening_balance from public.wallets"))
    .rows[0].opening_balance,
  1000000,
);
assert.equal(
  (await db.query("select public.current_profile() as profile"))
    .rows[0].profile.currencyCode,
  "VND",
);
const normalizedBefore = (
  await db.query("select public.load_normalized_finance() as data")
).rows[0].data;
const normalizedPayload = {
  ...payload,
  name: "An",
  onboarded: true,
  wallets: [
    {
      id: onboarding.rows[0].wallet_id,
      name: "Tiền mặt",
      openingBalance: 1000000,
    },
  ],
  entries: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Cà phê",
      amount: 45000,
      type: "expense",
      walletId: onboarding.rows[0].wallet_id,
      category: "Ăn uống",
      date: "2026-10-01T08:00:00.000Z",
      destinationId: null,
      note: "",
      receiptPath: null,
      refundOf: null,
      parts: [],
      reconciled: false,
      reconciledWalletIds: [],
    },
  ],
  customCategories: ["Ăn uống"],
  preferences: {
    persona: "Đi làm",
    goal: "Hiểu chi tiêu",
    currency: "VND",
    notifications: true,
  },
};
const normalizedSave = await db.query(
  "select public.save_normalized_finance($1,$2) as revision",
  [normalizedBefore.revision, normalizedPayload],
);
assert.ok(normalizedSave.rows[0].revision);
const normalizedAfter = (
  await db.query("select public.load_normalized_finance() as data")
).rows[0].data;
assert.equal(normalizedAfter.payload.entries[0].title, "Cà phê");
assert.equal(normalizedAfter.payload.preferences.notifications, true);
assert.equal(
  (await db.query("select count(*)::int as count from public.transactions"))
    .rows[0].count,
  1,
);
assert.equal(
  (await db.query("select public.save_finance_snapshot(0,$1)", [payload]))
    .rows[0].save_finance_snapshot,
  1,
);
await rejects("select public.save_finance_snapshot(0,$1)", [payload]);
assert.equal(
  (await db.query("select public.save_finance_snapshot(1,$1)", [payload]))
    .rows[0].save_finance_snapshot,
  2,
);
await rejects("select public.save_finance_snapshot(2,'{\"version\":2}')");
await rejects("select public.save_finance_snapshot(null,$1)", [payload]);
await rejects("update public.finance_snapshots set revision=999");
await rejects("select public.admin_overview(0)");
await rejects(
  "select public.record_play_purchase('x',$1,'p','pro',now(),true)",
  [a],
);
await db.query(
  "insert into storage.objects(bucket_id,name) values('picket-media',$1)",
  [a + "/photo.jpg"],
);
await rejects(
  "insert into storage.objects(bucket_id,name) values('picket-media',$1)",
  [b + "/photo.jpg"],
);
await asUser(b);
assert.equal((await db.query("select * from public.profiles")).rows.length, 0);
assert.equal((await db.query("select * from public.wallets")).rows.length, 0);
await rejects(
  "insert into public.wallets(user_id,name,opening_balance) values($1,'Ví giả',0)",
  [a],
);
assert.equal(
  (await db.query("select * from public.finance_snapshots")).rows.length,
  0,
);
assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
await db.exec("reset role");
await db.query("insert into public.staff_members values($1)", [a]);
await asUser(a);
assert.equal(
  (await db.query("select public.is_staff()")).rows[0].is_staff,
  true,
);
assert.equal(
  (await db.query("select public.admin_overview(0) as data")).rows[0].data
    .total_users,
  2,
);
await db.query("select public.admin_save_settings(true,'Maintenance')");
await asUser(b);
await rejects("select public.save_finance_snapshot(0,$1)", [payload]);
await db.exec("reset role");
await db.query(
  "update auth.users set banned_until=now()+interval '1 day' where id=$1",
  [b],
);
await asUser(b);
assert.equal(
  (await db.query("select public.is_account_active()")).rows[0]
    .is_account_active,
  false,
);
await rejects("select public.save_finance_snapshot(0,$1)", [payload]);
await db.exec("reset role");
await db.exec("set role service_role");
await db.query(
  "select public.record_play_purchase('old',$1,'picket_pro_monthly','pro',now()+interval '30 days',true)",
  [a],
);
await db.query(
  "select public.record_play_purchase('new',$1,'picket_plus_yearly','plus',now()+interval '365 days',true,'old')",
  [a],
);
await db.query(
  "select public.record_play_purchase('old',$1,'picket_pro_monthly','pro',now()+interval '30 days',true)",
  [a],
);
assert.equal(
  (await db.query(
    "select active from public.play_purchases where token_hash='old'",
  )).rows[0].active,
  false,
);
await rejects(
  "select public.record_play_purchase('new',$1,'picket_plus_yearly','plus',now()+interval '365 days',true)",
  [b],
);
await asUser(a);
assert.equal(
  (await db.query("select public.current_plan()")).rows[0].current_plan,
  "plus",
);
await rejects("select public.save_finance_snapshot(2,$1)", [{
  ...payload,
  entries: [null],
}]);
await db.exec("reset role");
await db.query("delete from auth.users where id=$1", [a]);
assert.equal(
  (await db.query("select * from public.finance_snapshots")).rows.length,
  0,
);
assert.equal((await db.query("select * from public.profiles")).rows.length, 0);
assert.equal((await db.query("select * from public.wallets")).rows.length, 0);
await db.close();
console.log(
  "SQL validation passed: migrations, ownership, media isolation, conflicts, invalid payloads, staff permissions, maintenance, cascade deletion.",
);
