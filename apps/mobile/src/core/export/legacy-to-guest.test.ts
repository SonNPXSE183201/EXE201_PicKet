import assert from "node:assert/strict";
import test from "node:test";
import type { FinancePayload } from "@picket/domain";

import { convertLegacyBackupToGuest } from "./legacy-to-guest";

const legacy: FinancePayload = {
  version: 2, name: "Picket", onboarded: true, hideBalance: false,
  wallets: [{ id:"wallet", name:"Tiền mặt", openingBalance:100000 }],
  entries: [{ id:"entry", title:"Ăn", amount:20000, type:"expense", walletId:"wallet", category:"Ăn uống", date:"2026-09-10T00:00:00Z", destinationId:null, note:"", receiptPath:"image:0", refundOf:null, parts:[], reconciled:false, reconciledWalletIds:[] }],
  budgets: [{ id:"budget", category:"Ăn uống", limit:50000, alertPercent:80, monthLimits:{ "2026-9":60000 } }],
  bills: [], keepsakes: [], subscriptions: [], closedMonths: [], customCategories:["Ăn uống"], preferences:{},
};

test("Flutter backup maps wallets, categories, budget periods and receipt into guest Expo", () => {
  const result = convertLegacyBackupToGuest({ data:legacy, media:{ "image:0":"/9j/" } });
  assert.equal(result.finance.accounts[0].openingBalance, 100000);
  assert.equal(result.finance.transactions[0].categoryId, result.finance.categories[0].id);
  assert.equal(result.finance.planningPeriods["2026-09:budget"], 60000);
  assert.equal(result.receipts[0].transactionId, "entry");
});

test("Flutter backup rejects a missing receipt image", () => {
  assert.throws(() => convertLegacyBackupToGuest({ data:legacy, media:{} }));
});
test("backup conversion retains per-wallet currency and account appearance",()=>{
  const data={...legacy,preferences:{currency:"VND",themeMode:"dark",languageMode:"en",colorSchemeId:"ocean"},wallets:[{...legacy.wallets[0],currencyCode:"USD"}]};
  const result=convertLegacyBackupToGuest({data,media:{"image:0":"/9j/"}});
  assert.equal(result.finance.accounts[0].currencyCode,"USD");
  assert.equal(result.finance.profile.themeMode,"dark");
  assert.equal(result.finance.profile.languageMode,"en");
  assert.equal(result.finance.profile.colorSchemeId,"ocean");
});
