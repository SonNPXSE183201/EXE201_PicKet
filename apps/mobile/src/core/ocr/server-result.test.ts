import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseServerOcrResult } from "./server-result";

describe("server OCR result", () => {
  it("derives receipt fields from provider raw text when structured fields are null", () => {
    const result = parseServerOcrResult({
      rawText: [
        "Nasi Campur Bali 75,000",
        "Sub-Total 1,346,000",
        "Service 100,950",
        "PB1 144,695",
        "Grand Total 1,591,600",
      ].join("\n"),
      merchant: null,
      amount: null,
      date: null,
    });

    assert.equal(result.merchant, "Nasi Campur Bali");
    assert.equal(result.amount, 1_591_600);
    assert.equal(result.rawText.includes("Grand Total"), true);
  });

  it("prefers validated structured provider fields over parsed guesses", () => {
    const result = parseServerOcrResult({
      rawText: "OTHER STORE\nTOTAL 45000\n01/10/2026",
      merchant: "Provider Store",
      amount: 50_000,
      date: "2026-10-02",
    });

    assert.equal(result.merchant, "Provider Store");
    assert.equal(result.amount, 50_000);
    assert.equal(result.date, "2026-10-02");
  });

  it("keeps provider confidence and flags an incomplete receipt for review", () => {
    const result = parseServerOcrResult({
      rawText: "SHOP\nTOTAL 45000",
      confidence: 0.62,
      merchant: "SHOP",
      amount: 45_000,
    });

    assert.equal(result.confidence, 0.62);
    assert.equal(result.needsReview, true);
  });

  it("requires review when provider confidence is missing or invalid", () => {
    const rawText = "SHOP\nITEM 10000\nTOTAL 10000";
    for (const confidence of [undefined, -0.1, 1.1, Number.NaN]) {
      const result = parseServerOcrResult({ rawText, confidence });
      assert.equal(result.confidence, null);
      assert.equal(result.needsReview, true);
    }
  });

  it("falls back to receipt text when provider date is malformed", () => {
    for (const date of ["not-a-date", "2026-02-31", "2026-13-01"]) {
      const result = parseServerOcrResult({
        rawText: "SHOP\nTOTAL 45000\n02/10/2026",
        date,
        confidence: 0.92,
      });
      assert.equal(result.date?.startsWith("2026-10-02"), true, date);
    }
  });

  it("ignores provider values that would be rejected by the receipt API", () => {
    const result = parseServerOcrResult({
      rawText: "SHOP\nTOTAL 45000\n02/10/2026",
      merchant: "M".repeat(161),
      amount: 9_000_000_000_001,
      confidence: 0.9,
    });
    assert.equal(result.merchant, "SHOP");
    assert.equal(result.amount, 45_000);
  });
});
