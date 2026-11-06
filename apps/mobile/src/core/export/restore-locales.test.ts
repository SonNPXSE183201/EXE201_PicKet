import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppI18n } from "../i18n/instance";
import { restoreVi, restoreEn } from "../i18n/restore-resources";
import { backupValidationMessage } from "./restore-attempt";

test("backup validation only exposes controlled localizable messages, never raw file or server errors", () => {
  for (const key of ["fileUnreadable", "fileTooLarge", "guestFormatOnly", "passwordRequired"]) assert.equal(backupValidationMessage(Error(key)), key);
  assert.equal(backupValidationMessage(Error("Sai mật khẩu hoặc bản sao đã hỏng.")), "passwordOrCorrupt");
  for (const value of [Error("private filename /token=value"), { message: "private" }, null, "raw error"]) assert.equal(backupValidationMessage(value), "validationFailed");
});

test("restore copy changes language but keeps RESTORE confirmation and filenames unchanged", async () => {
  assert.deepEqual(Object.keys(restoreVi).sort(), Object.keys(restoreEn).sort());
  const i18n = createAppI18n("vi"); const fileName = "Bản sao của mẹ.picket";
  for (const key of Object.keys(restoreVi)) assert.ok(i18n.exists(key, { ns: "restore" }));
  assert.match(i18n.t("confirmation", { ns: "restore" }), /RESTORE/);
  await i18n.changeLanguage("en");
  for (const key of Object.keys(restoreEn)) assert.ok(i18n.exists(key, { ns: "restore" }));
  assert.equal(i18n.t("confirmation", { ns: "restore" }), "Type RESTORE to confirm");
  assert.equal(i18n.t("wallets", { ns: "restore", count: 2 }), "Accounts: 2");
  assert.equal(i18n.t("refreshFailed", { ns: "restore" }), restoreEn.refreshFailed);
  assert.equal(fileName, "Bản sao của mẹ.picket");
});

test("restore screen fences raw import, guards stale preparations and refreshes all restored providers", () => {
  const source = readFileSync("src/app/restore.tsx", "utf8");
  assert.match(source, /useTranslation\("restore"\)/);
  assert.match(source, /withLocalOwnerAccess\(session!\.user\.id/);
  assert.match(source, /refreshRestoredProviders\(\[refreshProfile,refreshAccounts,refreshTransactions,refreshBudgets,refreshBills,refreshSubscriptions\]\)/);
  assert.match(source, /if\(!isCurrent\(\)\)return;\s*setPending\(/);
  assert.equal((source.match(/operationBusy\.current=false;if\(isCurrent\(\)\)setBusy\(false\)/g) ?? []).length, 2);
  assert.match(source, /restoreRunner\.current\(/);
  assert.match(source, /confirmation !== "RESTORE"/);
  assert.match(source, /\{pending\.fileName\}/);
  assert.match(source, /message==="valid" \? styles\.success : styles\.error/);
  assert.doesNotMatch(source, /error\.message|\{message\}|Dữ liệu hiện tại không bị thay đổi|rollback toàn bộ/);
});
