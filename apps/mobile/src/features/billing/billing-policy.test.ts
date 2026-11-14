import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePurchaseForVerification,
  verifyAndFinishPurchase,
} from "./billing-policy";

test("accepts only known Picket subscriptions with a Google purchase token", () => {
  assert.deepEqual(
    normalizePurchaseForVerification({
      productId: "picket_plus_monthly",
      purchaseToken: "play-token",
    }),
    { productId: "picket_plus_monthly", purchaseToken: "play-token" },
  );

  assert.throws(() =>
    normalizePurchaseForVerification({
      productId: "attacker_product",
      purchaseToken: "play-token",
    }),
  );
  assert.throws(() =>
    normalizePurchaseForVerification({
      productId: "picket_pro_yearly",
      purchaseToken: null,
    }),
  );
});

test("finishes a transaction only after authoritative server verification", async () => {
  const calls: string[] = [];
  const result = await verifyAndFinishPurchase(
    { productId: "picket_pro_yearly", purchaseToken: "play-token" },
    async (purchase) => {
      calls.push(`verify:${purchase.productId}`);
      return {
        verified: true,
        active: true,
        tier: "pro",
        expiresAt: "2026-11-13T00:00:00.000Z",
      };
    },
    async () => {
      calls.push("finish");
    },
  );

  assert.equal(result.tier, "pro");
  assert.deepEqual(calls, ["verify:picket_pro_yearly", "finish"]);
});

test("does not finish a transaction when verification fails", async () => {
  let finished = false;
  await assert.rejects(() =>
    verifyAndFinishPurchase(
      { productId: "picket_plus_yearly", purchaseToken: "play-token" },
      async () => {
        throw new Error("verification unavailable");
      },
      async () => {
        finished = true;
      },
    ),
  );

  assert.equal(finished, false);
});

import { defaultPlanId, planAction, productTier } from "./billing-policy";

test("plans screen never preselects the plan the user already has", () => {
  const ids = ["picket_plus_monthly", "picket_pro_monthly"];
  assert.equal(defaultPlanId(ids, "plus", null), "picket_pro_monthly");
  assert.equal(defaultPlanId(ids, "free", null), "picket_plus_monthly");
  assert.equal(defaultPlanId(ids, "plus", "picket_plus_monthly"), "picket_plus_monthly");
  assert.equal(defaultPlanId([], "free", null), null);
  assert.equal(productTier("picket_pro_yearly"), "pro");
});

test("call to action follows the tier change", () => {
  assert.equal(planAction("picket_plus_monthly", "plus"), "current");
  assert.equal(planAction("picket_pro_monthly", "plus"), "upgrade");
  assert.equal(planAction("picket_plus_yearly", "pro"), "switch");
  assert.equal(planAction("picket_plus_monthly", "free"), "upgrade");
});
