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
    "202610080001_incremental_accounts.sql",
    "202610080002_incremental_transactions.sql",
    "202610080003_transfer_refund_splits.sql",
    "202610080004_budget_versioning.sql",
    "202610080005_ocr_fallback_jobs.sql",
    "202610080006_finance_payload_volatility.sql",
    "202610090001_ocr_worker_leases.sql",
    "202610090002_receipt_records.sql",
    "202610090003_receipt_review.sql",
    "202610090004_current_entitlements.sql",
    "202610090005_idempotent_finance_creates.sql",
    "202610090006_realtime_finance_sync.sql",
    "202610120001_split_authorization_cleanup.sql",
    "202610120002_split_conflict_code.sql",
    "202610120003_user_data_purge.sql",
    "202610120004_finance_trigger_definer.sql",
    "202610120005_finance_revision_tracking.sql",
    "202610120006_receipt_conflict_code.sql",
    "202610120007_receipt_line_positions.sql",
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
assert.deepEqual(
  (
    await db.query(
      "select kind,row_version from public.wallets where id=$1",
      [onboarding.rows[0].wallet_id],
    )
  ).rows[0],
  { kind: "cash", row_version: 1 },
);
await db.query("update public.wallets set name='Ví chính' where id=$1", [
  onboarding.rows[0].wallet_id,
]);
assert.equal(
  (
    await db.query("select row_version from public.wallets where id=$1", [
      onboarding.rows[0].wallet_id,
    ])
  ).rows[0].row_version,
  2,
);
assert.equal(
  (await db.query("select public.current_profile() as profile"))
    .rows[0].profile.currencyCode,
  "VND",
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from public.categories where archived_at is null",
    )
  ).rows[0].count,
  8,
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
const expenseCategory = (
  await db.query(
    "select id from public.categories where name='Ăn uống' and user_id=$1",
    [a],
  )
).rows[0].id;
const idempotentAccount = (
  await db.query(
    "select (public.create_finance_account($1,$2,$3,$4,$5)).id as id",
    ["account-key-0001", "Ví offline", "ewallet", "VND", 250000],
  )
).rows[0].id;
assert.equal(
  (
    await db.query(
      "select (public.create_finance_account($1,$2,$3,$4,$5)).id as id",
      ["account-key-0001", "Ignored retry", "cash", "USD", 1],
    )
  ).rows[0].id,
  idempotentAccount,
);
const idempotentCategory = (
  await db.query(
    "select (public.create_finance_category($1,$2,$3,$4,$5)).id as id",
    ["category-key-0001", "Học tập", "expense", "#aabbcc", "school"],
  )
).rows[0].id;
assert.equal(
  (
    await db.query(
      "select (public.create_finance_category($1,$2,$3,$4,$5)).id as id",
      ["category-key-0001", "Ignored retry", "income", null, null],
    )
  ).rows[0].id,
  idempotentCategory,
);
const idempotentBudget = (
  await db.query(
    "select (public.create_finance_budget($1,$2,$3,$4,$5)).id as id",
    ["budget-key-0001", idempotentCategory, "Học tập", 2000000, 80],
  )
).rows[0].id;
assert.equal(
  (
    await db.query(
      "select (public.create_finance_budget($1,$2,$3,$4,$5)).id as id",
      ["budget-key-0001", expenseCategory, "Ignored retry", 1, 1],
    )
  ).rows[0].id,
  idempotentBudget,
);
await rejects(
  "select public.create_finance_budget($1,$2,'Invalid',1000,80)",
  ["budget-key-0002", onboarding.rows[0].wallet_id],
);
const incrementalTransaction = (
  await db.query(
    "select (public.create_finance_transaction($1,$2,$3,$4,$5,$6,$7,$8)).id as id",
    [
      "test-key-0001",
      onboarding.rows[0].wallet_id,
      expenseCategory,
      "Bữa trưa",
      55000,
      "expense",
      "2026-11-02T05:00:00.000Z",
      "",
    ],
  )
).rows[0].id;
const repeatedTransaction = (
  await db.query(
    "select (public.create_finance_transaction($1,$2,$3,$4,$5,$6,$7,$8)).id as id",
    [
      "test-key-0001",
      onboarding.rows[0].wallet_id,
      expenseCategory,
      "Ignored retry body",
      1,
      "expense",
      "2026-11-03T05:00:00.000Z",
      "",
    ],
  )
).rows[0].id;
assert.equal(repeatedTransaction, incrementalTransaction);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from public.transactions where id=$1",
      [incrementalTransaction],
    )
  ).rows[0].count,
  1,
);
const destinationWallet = (
  await db.query(
    "insert into public.wallets(user_id,name,kind,currency_code) values($1,'Ngân hàng','bank','VND') returning id",
    [a],
  )
).rows[0].id;
const transfer = (
  await db.query(
    "select (public.create_finance_transfer($1,$2,$3,$4,$5,$6,$7)).id as id",
    [
      "transfer-key-0001",
      onboarding.rows[0].wallet_id,
      destinationWallet,
      "Chuyển sang ngân hàng",
      100000,
      "2026-12-01T05:00:00.000Z",
      "",
    ],
  )
).rows[0].id;
assert.equal(
  (
    await db.query(
      "select destination_wallet_id,kind from public.transactions where id=$1",
      [transfer],
    )
  ).rows[0].kind,
  "transfer",
);
assert.equal(
  (
    await db.query(
      "select (public.create_finance_transfer($1,$2,$3,$4,$5,$6,$7)).id as id",
      [
        "transfer-key-0001",
        onboarding.rows[0].wallet_id,
        destinationWallet,
        "Ignored retry",
        1,
        "2026-12-02T05:00:00.000Z",
        "",
      ],
    )
  ).rows[0].id,
  transfer,
);
await rejects(
  "select public.create_finance_transfer($1,$2,$2,'Invalid',100,'2026-12-01','')",
  ["transfer-key-0002", onboarding.rows[0].wallet_id],
);
const usdWallet = (
  await db.query(
    "insert into public.wallets(user_id,name,kind,currency_code) values($1,'USD wallet','cash','USD') returning id",
    [a],
  )
).rows[0].id;
await rejects(
  "select public.create_finance_transfer($1,$2,$3,'Cross currency',100,'2026-12-01','')",
  ["transfer-key-0003", onboarding.rows[0].wallet_id, usdWallet],
);
const secondExpenseCategory = (
  await db.query(
    "select id from public.categories where name='Di chuyển' and user_id=$1",
    [a],
  )
).rows[0].id;
const splitResult = await db.query(
  "select (public.set_transaction_splits($1,1,$2)).row_version as version",
  [
    incrementalTransaction,
    [
      { categoryId: expenseCategory, amount: 30000 },
      { categoryId: secondExpenseCategory, amount: 25000 },
    ],
  ],
);
assert.equal(splitResult.rows[0].version, 2);
assert.equal(
  (
    await db.query(
      "select sum(amount)::bigint as total from public.transaction_splits where transaction_id=$1",
      [incrementalTransaction],
    )
  ).rows[0].total,
  55000,
);
const refund = (
  await db.query(
    "select (public.create_finance_refund($1,$2,$3,$4,$5)).id as id",
    [
      "refund-key-0001",
      incrementalTransaction,
      20000,
      "2026-12-03T05:00:00.000Z",
      "Hoàn một phần",
    ],
  )
).rows[0].id;
assert.equal(
  (
    await db.query(
      "select sum(amount)::bigint as total from public.transaction_splits where transaction_id=$1",
      [refund],
    )
  ).rows[0].total,
  20000,
);
await rejects(
  "select public.create_finance_refund($1,$2,$3,$4,$5)",
  [
    "refund-key-0002",
    incrementalTransaction,
    40000,
    "2026-12-03T05:00:00.000Z",
    "Quá số còn lại",
  ],
);
await rejects(
  "select public.set_transaction_splits($1,2,$2)",
  [incrementalTransaction, [{ categoryId: expenseCategory, amount: 55000 }]],
);
await db.query(
  "insert into public.month_closes(user_id,month_start) values($1,'2026-11-01')",
  [a],
);
await rejects("update public.transactions set note='blocked' where id=$1", [
  incrementalTransaction,
]);
await db.query(
  "delete from public.month_closes where user_id=$1 and month_start='2026-11-01'",
  [a],
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
await db.query(
  "insert into storage.objects(bucket_id,name) values('picket-media',$1)",
  [a + "/ocr/receipt.jpg"],
);
const ocrJob = await db.query(
  "select id,status from public.create_ocr_fallback_job($1,$2,$3)",
  [a + "/ocr/receipt.jpg", 0.35, "33333333-3333-4333-8333-333333333333"],
);
assert.equal(ocrJob.rows[0].status, "queued");
assert.deepEqual(
  (await db.query("select public.current_entitlements() as data")).rows[0].data,
  {
    tier: "free",
    ocr_fallback_daily_limit: 3,
    ocr_fallback_used: 1,
    ocr_fallback_remaining: 2,
  },
);
await rejects("select * from public.claim_ocr_fallback_jobs('client',1)");
await db.exec("reset role");
await db.exec("set role service_role");
const claimed = await db.query(
  "select id,status,attempts from public.claim_ocr_fallback_jobs('worker-test',1)",
);
assert.deepEqual(claimed.rows[0], {
  id: ocrJob.rows[0].id,
  status: "processing",
  attempts: 1,
});
assert.equal(
  (
    await db.query(
      "select public.complete_ocr_fallback_job($1,'worker-test',$2) as completed",
      [ocrJob.rows[0].id, { rawText: "TOTAL 45000", amount: 45000 }],
    )
  ).rows[0].completed,
  true,
);
await asUser(a);
assert.equal(
  (
    await db.query("select status from public.ocr_fallback_jobs where id=$1", [
      ocrJob.rows[0].id,
    ])
  ).rows[0].status,
  "completed",
);
const receipt = await db.query(
  `select id,status from public.create_receipt_record(
    null,$1,'Picket Store',45000,now(),'VND',0.91,'pp-ocr',false,
    'TOTAL 45000',$2,$3
  )`,
  [
    a + "/ocr/receipt.jpg",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    [{ name: "Coffee", quantity: 1, unitPrice: 45000, total: 45000, confidence: 0.9 }],
  ],
);
assert.equal(receipt.rows[0].status, "confirmed");
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from public.receipt_line_items where receipt_id=$1",
      [receipt.rows[0].id],
    )
  ).rows[0].count,
  1,
);
assert.equal(
  (
    await db.query(
      "select match_type from public.find_duplicate_receipts($1,null,null,null)",
      ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    )
  ).rows[0].match_type,
  "exact_hash",
);
const reviewedReceipt = await db.query(
  `select id,row_version,status from public.update_receipt_record(
    $1,1,'Picket Store reviewed',50000,now(),false,$2
  )`,
  [
    receipt.rows[0].id,
    [
      { name: "Coffee", quantity: 2, unitPrice: 20000, total: 40000 },
      { name: "Cake", quantity: 1, unitPrice: 10000, total: 10000 },
    ],
  ],
);
assert.equal(reviewedReceipt.rows[0].row_version, 2);
assert.equal(reviewedReceipt.rows[0].status, "confirmed");
const receiptUpdateDefinition = (
  await db.query(
    "select pg_get_functiondef('public.update_receipt_record(uuid,bigint,text,bigint,timestamptz,boolean,jsonb)'::regprocedure) as definition",
  )
).rows[0].definition;
assert.match(receiptUpdateDefinition, /23514/);
assert.doesNotMatch(receiptUpdateDefinition, /40001/);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from public.receipt_line_items where receipt_id=$1",
      [receipt.rows[0].id],
    )
  ).rows[0].count,
  2,
);
assert.deepEqual(
  (
    await db.query(
      "select name,position from public.receipt_line_items where receipt_id=$1 order by position",
      [receipt.rows[0].id],
    )
  ).rows,
  [
    { name: "Coffee", position: 0 },
    { name: "Cake", position: 1 },
  ],
);
await rejects(
  "select public.update_receipt_record($1,1,'Stale',50000,now(),false,'[]')",
  [receipt.rows[0].id],
);
await rejects(
  "insert into public.receipts(user_id,storage_path) values($1,$2)",
  [a, a + "/ocr/direct.jpg"],
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
  "SQL validation passed: migrations, ownership, media isolation, OCR worker permissions, conflicts, invalid payloads, staff permissions, maintenance, cascade deletion.",
);
