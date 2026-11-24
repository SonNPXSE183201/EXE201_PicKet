import assert from "node:assert/strict";
import test from "node:test";

import { ownedPlaySubscription, playPlanChange } from "./billing-policy";

const plusMonthly = { productId: "picket_plus_monthly", purchaseToken: "tok-plus-m" };
const proYearly = { productId: "picket_pro_yearly", purchaseToken: "tok-pro-y" };

test("picks the highest PicKet subscription the Play account owns", () => {
  assert.deepEqual(ownedPlaySubscription([plusMonthly, proYearly, { productId: "other", purchaseToken: "x" }]), proYearly);
  assert.equal(ownedPlaySubscription([{ productId: "picket_plus_yearly", purchaseToken: null }]), null);
  assert.equal(ownedPlaySubscription([]), null);
});

test("free users buy a new subscription without replacement", () => {
  assert.deepEqual(playPlanChange("picket_pro_monthly", "free", null), { action: "upgrade", replace: null });
});

test("upgrades replace the old Play subscription with time proration so it is not billed twice", () => {
  assert.deepEqual(playPlanChange("picket_pro_monthly", "plus", plusMonthly), {
    action: "upgrade",
    replace: { purchaseToken: "tok-plus-m", oldProductId: "picket_plus_monthly", replacementMode: "with-time-proration" },
  });
  assert.deepEqual(playPlanChange("picket_plus_yearly", "plus", plusMonthly), {
    action: "upgrade",
    replace: { purchaseToken: "tok-plus-m", oldProductId: "picket_plus_monthly", replacementMode: "with-time-proration" },
  });
});

test("downgrades are deferred to the end of the paid period", () => {
  assert.deepEqual(playPlanChange("picket_plus_yearly", "pro", proYearly), {
    action: "switch",
    replace: { purchaseToken: "tok-pro-y", oldProductId: "picket_pro_yearly", replacementMode: "deferred" },
  });
  assert.equal(playPlanChange("picket_pro_monthly", "pro", proYearly).action, "switch");
});

test("the owned plan is current and plans paid outside this Play account cannot be bought over", () => {
  assert.deepEqual(playPlanChange("picket_pro_yearly", "pro", proYearly), { action: "current" });
  assert.deepEqual(playPlanChange("picket_pro_monthly", "plus", null), { action: "otherChannel" });
  assert.deepEqual(playPlanChange("picket_pro_monthly", "pro", plusMonthly), { action: "otherChannel" });
});
