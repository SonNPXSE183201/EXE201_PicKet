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
});
