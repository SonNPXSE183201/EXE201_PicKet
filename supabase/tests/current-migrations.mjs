import { readFileSync, readdirSync } from "node:fs";

const migrationDirectory = new URL("../migrations/", import.meta.url);
const testDirectory = new URL("./", import.meta.url);
const legacyCheckpoint = "202610210004";
const cronMigration = "20261024013825_learning_ai_scheduled_cleanup.sql";
const suites = [
  "admin-revision-conflicts",
  "payos-auth-permissions",
  "payos-expiry-hardening",
  "revenue-ledger",
  "billing-promotions",
  "app-announcements",
  "app-releases",
  "contact-methods-otp",
  "admin-platform",
  "appearance-preferences",
  "appearance-backup",
  "wallet-currency-backup",
  "learning-attempts",
  "learning-ai-consent",
  "learning-ai-jobs",
  "learning-ai-history",
  "learning-activity",
  "cashflow-ledger-snapshot",
  "cashflow-schedules",
  "cashflow-settlements",
  "cashflow-schedule-wallet-scope",
  "internal-trigger-execution",
];

// Keep the legacy contract checks on their original schema, then validate every
// subsequent migration against the same database before running newer suites.
export async function validateCurrentMigrations(db) {
  const migrations = readdirSync(migrationDirectory)
    .filter((file) => /^\d+_.+\.sql$/.test(file) && file.split("_")[0] > legacyCheckpoint)
    .sort();
  for (const file of migrations) {
    if (file === cronMigration) {
      console.log(`SKIP ${file}: PGlite does not support pg_cron; verify scheduling on PostgreSQL.`);
      continue;
    }
    await db.exec(readFileSync(new URL(file, migrationDirectory), "utf8").replace(/^\uFEFF/, ""));
  }
  for (const suite of suites) {
    await db.exec(readFileSync(new URL(`${suite}.sql`, testDirectory), "utf8"));
    console.log(`SQL suite passed: ${suite}`);
  }
  console.log(`Current migration SQL suites passed: ${suites.length}; pg_cron requires separate acceptance.`);
}
