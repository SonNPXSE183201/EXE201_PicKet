import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("receipt/OCR/restore cloud writes and thumbnail temporary files share the owner retirement fence",()=>{
  const receipt=readFileSync(new URL("../receipts/receipt-upload.ts",import.meta.url),"utf8");
  const ocr=readFileSync(new URL("../ocr/server-fallback.ts",import.meta.url),"utf8");
  const restore=readFileSync(new URL("../export/flutter-compatible-backup.ts",import.meta.url),"utf8");
  const gallery=readFileSync(new URL("../receipts/cloud-receipt-gallery.ts",import.meta.url),"utf8");
  assert.match(receipt,/withLocalOwnerAccess\(input.userId/);
  assert.match(ocr,/withLocalOwnerAccess\(input.userId/);
  assert.match(restore,/withLocalOwnerAccess\(userId/);
  assert.match(gallery,/withLocalOwnerAccess\(owner,.*createReceiptThumbnail/);
});

test("new export artifacts are fenced by owner and use unique names rather than overwriting another export",()=>{
  const json=readFileSync(new URL("../export/export-finance.ts",import.meta.url),"utf8");
  const backup=readFileSync(new URL("../export/flutter-compatible-backup.ts",import.meta.url),"utf8");
  const profile=readFileSync(new URL("../../app/profile.tsx",import.meta.url),"utf8");
  assert.match(json,/withLocalOwnerAccess\(userId/);assert.match(json,/Crypto.randomUUID\(\)/);
  assert.match(backup,/withLocalOwnerAccess\(owner/);assert.match(backup,/Crypto.randomUUID\(\)/);
  assert.match(profile,/exportAndShareFinance\(session.access_token,session.user.id\)/);
  assert.match(profile,/exportFinanceCsv\(session.access_token,session.user.id\)/);
});
