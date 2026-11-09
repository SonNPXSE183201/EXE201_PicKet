import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { duplicateChoices } from "./duplicate-receipt-sheet-choices";

test("an exact photo match never offers saving a second copy", () => {
  assert.deepEqual(duplicateChoices(true), ["view", "cancel"]);
});
test("a same shop, day and total match lets the user compare and still save", () => {
  assert.deepEqual(duplicateChoices(false), ["view", "save", "cancel"]);
});
test("the new transaction screen uses the designed sheet, not a system alert", () => {
  const source = readFileSync("src/app/transactions/new.tsx", "utf8");
  assert.doesNotMatch(source, /Alert\.alert/);
  assert.match(source, /<DuplicateReceiptSheet/);
});
