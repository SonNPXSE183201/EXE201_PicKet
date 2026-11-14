import assert from "node:assert/strict";
import test from "node:test";
import { consentNeedsPrompt, parseConsent } from "./analytics-consent-policy";

test("only an explicit answer counts as a decision", () => {
  assert.equal(parseConsent("yes"), "yes");
  assert.equal(parseConsent("no"), "no");
  assert.equal(parseConsent(null), null);
  assert.equal(parseConsent("maybe"), null);
});

test("the first-run choice is required once per signed-in account and never for guests", () => {
  assert.equal(consentNeedsPrompt(true, false, null), true);
  assert.equal(consentNeedsPrompt(true, true, null), false);
  assert.equal(consentNeedsPrompt(true, false, "no"), false);
  assert.equal(consentNeedsPrompt(true, false, "yes"), false);
  assert.equal(consentNeedsPrompt(false, false, null), false);
});
