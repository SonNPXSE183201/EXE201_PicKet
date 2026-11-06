import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { receiptCaptureDate, receiptCalendarDate, finishReceiptFlow, receiptHome } from "./receipt-flow-policy";
import {calendarReceiptDay} from "./receipt-calendar";

test("OCR purchase date wins over the previously selected calendar day", () => {
  assert.equal(receiptCalendarDate("2026-02-31"), null);
  assert.equal(receiptCalendarDate(["2026-10-19"]), null);
  assert.equal(receiptCalendarDate("2024-02-29"), "2024-02-29");
  const result = new Date(receiptCaptureDate("2026-10-19", "2026-05-01T00:00:00Z"));
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 4);
  assert.equal(result.getDate(), 1);
  assert.equal(calendarReceiptDay({purchasedAt:result.toISOString()}),"2026-05-01");
});
test("icon scan keeps a valid OCR date; missing/invalid OCR date falls back to today", () => {
  const now = new Date("2026-10-20T04:00:00Z");
  assert.equal(calendarReceiptDay({purchasedAt:receiptCaptureDate(null, "2026-05-01T00:00:00Z", now)}), "2026-05-01");
  assert.equal(receiptCaptureDate(null, "invalid", now), now.toISOString());
  assert.equal(receiptCaptureDate("invalid", null, now), now.toISOString());
});
test("unreadable and impossible OCR dates retain the selected calendar fallback",()=>{
 for(const detected of [null,"invalid","2026-02-31T00:00:00Z"]){
  assert.equal(calendarReceiptDay({purchasedAt:receiptCaptureDate("2026-10-19",detected)}),"2026-10-19");
 }
});
test("completion returns to home before pushing success, so Back cannot revisit the saved form", () => {
  const calls: unknown[] = [];
  finishReceiptFlow({ dismissTo: target => calls.push(["dismissTo", target]), push: target => calls.push(["push", target]) }, { receiptId: "r1", transactionId: "t1", month: "2026-10" });
  assert.deepEqual(calls, [["dismissTo", { pathname: "/", params: { receiptMonth: "2026-10" } }], ["push", { pathname: "/receipt-saved", params: { receiptId: "r1", transactionId: "t1", month: "2026-10" } }]]);
});
test("home month routing accepts a real month and rejects malformed deep-link values", () => {
  assert.deepEqual(receiptHome("2026-13"), { pathname: "/", params: { receiptMonth: "" } });
  assert.deepEqual(receiptHome("2026-05"), { pathname: "/", params: { receiptMonth: "2026-05" } });
});
test("capture/date/attachment and completion are wired into both cloud and guest paths", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(read("./home-receipt-calendar.tsx"), /captureOnDate/);
  assert.match(read("../../app/capture/index.tsx"), /Ngày hóa đơn/);
  assert.match(read("../../app/capture/index.tsx"), /useState\(true\)/);
  const transaction = read("../../app/transactions/new.tsx");
  assert.equal((transaction.match(/finishReceiptFlow\(router/g) ?? []).length, 2);
  assert.match(transaction, /params.receiptDraftId && !receiptDraft/);
});
