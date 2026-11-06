import test from "node:test";
import assert from "node:assert/strict";
import { ocrSuggestion } from "../src/core/finance/ocr-suggestion.ts";
import { parseServerOcrResult } from "../src/core/finance/receipt-parser.ts";
test("worker amount/date/merchant fields populate web review without losing native contract", () =>
  assert.deepEqual(
    ocrSuggestion({
      merchant: "Cửa hàng",
      amount: 123000,
      date: "2026-10-21",
      confidence: 0.9,
      rawText: "private",
    }),
    { merchant: "Cửa hàng", amount: "123000", date: "2026-10-21" },
  ));
test("invalid provider suggestions never populate money or dates", () =>
  assert.deepEqual(
    ocrSuggestion({
      merchant: { bad: 1 },
      amount: Infinity,
      date: "not-a-date",
    }),
    {},
  ));
test("raw OCR fallback reuses the mobile receipt parser and extracts line items", () => {
  const result = parseServerOcrResult({
    rawText:
      "CA PHE PICKET\nNgay: 08/10/2026\nCa phe sua 1 45.000 45.000\nTONG CONG 45.000 VND",
    confidence: 0.9,
  });
  assert.equal(result.amount, 45000);
  assert.equal(result.date, "2026-10-08T00:00:00.000Z");
  assert.equal(result.merchant, "CA PHE PICKET");
});
