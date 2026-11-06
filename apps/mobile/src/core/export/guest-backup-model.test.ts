import assert from "node:assert/strict";
import test from "node:test";

import { emptyGuestFinance } from "../local/guest-finance";
import { validateGuestBackupPayload } from "./guest-backup-model";

test("guest backup accepts an isolated finance snapshot and keepsake list", () => {
  const payload = { finance: emptyGuestFinance(), keepsakes: [], receipts: [], media: {} };
  assert.deepEqual(validateGuestBackupPayload(payload), payload);
});

test("guest backup rejects malformed finance and missing media", () => {
  assert.throws(() => validateGuestBackupPayload({ finance: emptyGuestFinance(), keepsakes: [], media: {} }));
  assert.throws(() => validateGuestBackupPayload({ finance: { ...emptyGuestFinance(), transactions: null }, keepsakes: [], receipts: [], media: {} }));
  assert.throws(() => validateGuestBackupPayload({ finance: emptyGuestFinance(), keepsakes: [{ id: "item", userId: "device-guest", title: "A", amount: 1, date: "2026-10-17", note: "", photoUri: "image:0", category: "A", warrantyUntil: null, returnUntil: null }], receipts: [], media: {} }));
});

test("guest backup rejects a transaction with invalid amount before replacing local data", () => {
  const broken = { ...emptyGuestFinance(), transactions: [{ id:"entry", title:"Bad", amount:-4, kind:"expense", accountId:"cash", occurredAt:"invalid" }] };
  assert.throws(() => validateGuestBackupPayload({ finance:broken, keepsakes:[], receipts:[], media:{} }));
});
test("guest backups reject invalid appearance defaults before replacing data",()=>{
  const finance={...emptyGuestFinance(),profile:{...emptyGuestFinance().profile,colorSchemeId:"../invalid"}};
  assert.throws(()=>validateGuestBackupPayload({finance,keepsakes:[],receipts:[],media:{}}));
});
test("guest backups preserve legitimate negative opening balances",()=>{
  const finance={...emptyGuestFinance(),accounts:[{id:"cash",name:"Cash",currencyCode:"VND",openingBalance:-100,archived:false,kind:"cash",version:1,createdAt:"2026-10-24T00:00:00Z",updatedAt:"2026-10-24T00:00:00Z",deletedAt:null}]};
  assert.equal(validateGuestBackupPayload({finance,keepsakes:[],receipts:[],media:{}}).finance.accounts[0].openingBalance,-100);
});
