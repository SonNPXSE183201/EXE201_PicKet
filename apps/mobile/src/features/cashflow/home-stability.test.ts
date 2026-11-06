import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
test("balance privacy never removes weekly chart or masks pocket amounts", () => {
  assert.doesNotMatch(read("./home-weekly-rhythm.tsx"), /hideBalance|rhythmPrivacy/);
  assert.doesNotMatch(read("../budgets/home-budget-pockets.tsx"), /hideBalance/);
});
test("background refresh does not replace an already populated weekly chart with loading", () => {
  assert.match(read("./home-weekly-rhythm.tsx"), /const initialLoading = \(loading \|\| accountsLoading\) && accounts.length === 0 && transactions.length === 0/);
  assert.doesNotMatch(read("./home-weekly-rhythm.tsx"), /\{loading \|\| accountsLoading \?/);
});
test("the eye updates local display before saving preferences, including offline failure", () => {
  const home = read("../../app/index.tsx");
  assert.ok(home.indexOf("setBalanceHidden(next)") < home.indexOf("updatePreferences({ hide_balance: next })"));
  assert.match(home, /updatePreferences\(\{ hide_balance: next \}\)\.catch/);
});
