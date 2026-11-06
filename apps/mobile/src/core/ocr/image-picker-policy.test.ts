import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { receiptImagePickerOptions } from "./image-picker-policy";

describe("receipt image picker policy", () => {
  it("preserves the full receipt instead of forcing a crop", () => {
    assert.equal(receiptImagePickerOptions.allowsEditing, false);
    assert.equal("aspect" in receiptImagePickerOptions, false);
  });

  it("preserves source quality so small invoice text is not recompressed before OCR", () => {
    assert.deepEqual(receiptImagePickerOptions.mediaTypes, ["images"]);
    assert.equal(receiptImagePickerOptions.quality, 1);
    assert.equal(receiptImagePickerOptions.exif, false);
  });
});
