import assert from "node:assert/strict";
import test from "node:test";
import {receiptDate} from "./receipt-date";

const at=(text:string)=>receiptDate([{text}])?.date.slice(0,10)??null;

test("day/month/year stays the default reading",()=>{
  assert.equal(at("Ngày: 05/06/2026 10:00"),"2026-06-05");
  assert.equal(at("Date: 16/11/2026 20:10"),"2026-11-16");
  assert.equal(at("18-11-26 20:56"),"2026-11-18");
});

test("month/day/year is used only when day/month is impossible (11/18/26)",()=>{
  assert.equal(at("Date: 11/18/26 20:19"),"2026-11-18");
  assert.equal(at("Date: 13/18/26"),null);
});
