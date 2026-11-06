import assert from "node:assert/strict";
import test from "node:test";
import { selectPartnerAd, visiblePartnerNotice } from "./partner-notice-policy";

const now = Date.parse("2026-10-21T00:00:00Z");
const base = { id: "qa", title: "Partner", body: "Notice", url: "https://example.com", active: true, created_at: "2026-10-01T00:00:00Z" };
type Period = { starts_at?: string | null; ends_at?: string | null };
// Reflect.apply keeps the RED executable against the old two-argument API;
// the assertion fails because it ignores the supplied clock, not compilation.
const select = (ads: (typeof base & Period)[]) => Reflect.apply(selectPartnerAd, undefined, ["free", ads, now]);
const eligible = (period: Period) => select([{ ...base, ...period }]);

test("partner start is inclusive, future starts are not shown", () => {
  assert.equal(eligible({ starts_at: "2026-10-21T00:00:01Z" }), null);
  assert.equal(eligible({ starts_at: "2026-10-21T00:00:00Z" })?.id, "qa");
});
test("partner end is exclusive, not derived from creation time", () => {
  assert.equal(eligible({ ends_at: "2026-10-21T00:00:00Z" }), null);
  assert.equal(eligible({ ends_at: "2026-10-21T00:00:01Z" })?.id, "qa");
  assert.equal(eligible({})?.id, "qa");
});
test("invalid or reversed effective intervals fail closed", () => {
  for (const period of [{ starts_at: "not a date" }, { ends_at: "not a date" },
    { starts_at: "2026-10-22T00:00:00Z", ends_at: "2026-10-20T00:00:00Z" }]) assert.equal(eligible(period), null);
});
test("an expired latest ad cannot hide another eligible ad", () => {
  assert.equal(select([{ ...base, ends_at: "2026-10-20T00:00:00Z" }, { ...base, id: "eligible" }])?.id, "eligible");
});
test("clock revalidation hides expired ad but keeps the general notice", () => {
  const snapshot = { owner: "A", notice: "Service notice", ad: { ...base, ends_at: "2026-10-21T00:00:00Z" } };
  assert.deepEqual(Reflect.apply(visiblePartnerNotice, undefined, ["A", snapshot, now]), { ...snapshot, ad: null });
  assert.equal(Reflect.apply(visiblePartnerNotice, undefined, ["B", snapshot, now]), null);
});
