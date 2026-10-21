import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safePartnerUrl, selectPartnerAd, visiblePartnerNotice } from "./partner-notice-policy";

test("partner notice rendering and link opening are scoped to the current owner", () => {
  const source = readFileSync(new URL("./partner-notice.tsx", import.meta.url), "utf8");
  assert.match(source, /visiblePartnerNotice\(owner, snapshot, now\)/);
  assert.match(source, /isCurrent\(request\)/);
  assert.match(source, /request === revision/);
  assert.match(source, /clearInterval\(timer\)/);
  assert.match(source, /setSnapshot\(null\)/);
  assert.doesNotMatch(source, /useState<PartnerAd \| null>/);
});

const ad = { id: "ad", title: "Partner", body: "Content", url: "https://example.com/info", active: true, created_at: "2026-10-21T00:00:00Z" };
test("only known free entitlement and active safe HTTPS ads are eligible", () => {
  assert.equal(selectPartnerAd("free", [ad]), ad);
  for (const tier of [null, undefined, "premium", "pro", "unknown"]) assert.equal(selectPartnerAd(tier, [ad]), null);
  assert.equal(selectPartnerAd("free", [{ ...ad, active: false }]), null);
  assert.equal(selectPartnerAd("free", [{ ...ad, url: "javascript:alert(1)" }, ad]), ad);
  assert.equal(selectPartnerAd("free", []), null);
});
test("guest and another owner cannot see previous notice or ad", () => {
  const snapshot = { owner: "A", notice: "For A", ad };
  assert.equal(visiblePartnerNotice("A", snapshot), snapshot);
  assert.equal(visiblePartnerNotice("B", snapshot), null);
  assert.equal(visiblePartnerNotice(undefined, snapshot), null);
  assert.equal(visiblePartnerNotice("A", null), null);
});
test("partner links reject credentials, non-HTTPS schemes and malformed input", () => {
  for (const url of ["http://example.com", "https://u:p@example.com", "file:///tmp/a", "javascript:alert(1)", "not a URL", ""]) assert.equal(safePartnerUrl(url), false);
  assert.equal(safePartnerUrl(ad.url), true);
});
