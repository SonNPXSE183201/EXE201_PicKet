import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createOwnerCacheDatabaseDriver, ownerCacheRetirementSchema } from "./owner-cache-database";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE cached_resources (user_id TEXT, resource TEXT, ciphertext TEXT)");
  db.exec(ownerCacheRetirementSchema);
  const insert = db.prepare("INSERT INTO cached_resources VALUES (?, ?, ?)");
  for (const owner of ["a", "b", "device-guest"]) {
    for (const resource of ["profile", "transactions", "forecast-observations", "receipt-gallery"]) insert.run(owner, resource, "unreadable ciphertext");
  }
  const tx = { runAsync: async (sql: string, ...params: string[]) => db.prepare(sql).run(...params) };
  const driver = createOwnerCacheDatabaseDriver(async () => ({
    ...tx,
    getFirstAsync: async (sql: string, ...params: string[]) => db.prepare(sql).get(...params) ?? null,
    withExclusiveTransactionAsync: async operation => {
      db.exec("BEGIN EXCLUSIVE");
      try { await operation(tx); db.exec("COMMIT"); }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  }));
  return { db, driver };
}

test("real SQLite retirement atomically removes all owned resources without reading ciphertext", async () => {
  const { db, driver } = fixture();
  try {
    assert.equal(await driver.isRetired("a"), false);
    await driver.retire("a");
    assert.equal(await driver.isRetired("a"), true);
    assert.deepEqual(db.prepare("SELECT user_id, COUNT(*) AS count FROM cached_resources GROUP BY user_id ORDER BY user_id").all().map(row => ({ ...row })), [{ user_id: "b", count: 4 }, { user_id: "device-guest", count: 4 }]);
    await driver.retire("a");
    await driver.resume("a");
    assert.equal(await driver.isRetired("a"), false);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM cached_resources WHERE user_id = 'a'").get()?.count, 0);
  } finally { db.close(); }
});

test("a SQLite deletion failure rolls back the marker and rows together", async () => {
  const { db, driver } = fixture();
  try {
    db.exec("CREATE TRIGGER fail_erasure BEFORE DELETE ON cached_resources BEGIN SELECT RAISE(ABORT, 'test storage failure'); END");
    await assert.rejects(driver.retire("a"), /test storage failure/);
    assert.equal(await driver.isRetired("a"), false);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM cached_resources WHERE user_id = 'a'").get()?.count, 4);
    db.exec("DROP TRIGGER fail_erasure");
    await driver.retire("a");
    assert.equal(await driver.isRetired("a"), true);
  } finally { db.close(); }
});

test("account retirement erases open-answer drafts without affecting another owner or guest", async () => {
  const { db, driver } = fixture();
  try {
    const insert = db.prepare("INSERT INTO cached_resources VALUES (?, ?, ?)");
    for (const owner of ["a", "b", "device-guest"]) insert.run(owner, "learning-assessment", "encrypted draft");
    await driver.retire("a");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM cached_resources WHERE user_id = ? AND resource = ?").get("a", "learning-assessment")?.count, 0);
    for (const owner of ["b", "device-guest"]) assert.equal(db.prepare("SELECT COUNT(*) AS count FROM cached_resources WHERE user_id = ? AND resource = ?").get(owner, "learning-assessment")?.count, 1);
  } finally { db.close(); }
});
