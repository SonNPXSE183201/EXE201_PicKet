import assert from "node:assert/strict";
import test from "node:test";
import { blankReceiptLine, editableReceiptLines, parseReceiptLines, receiptLinesChanged, receiptLinesTotal, updateReceiptLine } from "./receipt-line-edit";

const ocr = editableReceiptLines([{ id: "a", name: "Chuột không dây", quantity: 1, unitPrice: 2_370_000, total: 2_370_000 }]);

test("OCR lines become editable text and keep their identity", () => {
  assert.deepEqual(ocr, [{ key: "a", name: "Chuột không dây", quantity: "1", unitPrice: "2370000", total: "2370000" }]);
});

test("changing quantity recomputes the line total from the unit price", () => {
  const next = updateReceiptLine(ocr, "a", "quantity", "2");
  assert.equal(next[0].total, "4740000");
});

test("a receipt with no recognised items can get items added by hand", () => {
  const added = updateReceiptLine(updateReceiptLine([blankReceiptLine("n1")], "n1", "name", "Bàn phím"), "n1", "total", "500000");
  const parsed = parseReceiptLines(added);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.lines, [{ name: "Bàn phím", quantity: 1, unitPrice: null, total: 500000, confidence: null }]);
});

test("formatted money input (dots) is accepted", () => {
  const parsed = parseReceiptLines([{ key: "x", name: "Nước", quantity: "2", unitPrice: "15.000", total: "30.000" }]);
  assert.equal(parsed.ok, true);
});

test("inconsistent quantity x unit price is rejected instead of silently fixed", () => {
  const parsed = parseReceiptLines([{ key: "x", name: "Nước", quantity: "2", unitPrice: "15000", total: "40000" }]);
  assert.equal(parsed.ok, false);
});

test("empty names or zero totals are rejected", () => {
  assert.equal(parseReceiptLines([blankReceiptLine("b")]).ok, false);
});

test("only real edits are sent to the server", () => {
  assert.equal(receiptLinesChanged(ocr, ocr.map((line) => ({ ...line }))), false);
  assert.equal(receiptLinesChanged(ocr, updateReceiptLine(ocr, "a", "name", "Chuột")), true);
});

test("line totals add up for the receipt/total comparison", () => {
  assert.equal(receiptLinesTotal([...ocr, { key: "b", name: "x", quantity: "1", unitPrice: "", total: "1.000" }]), 2_371_000);
});
