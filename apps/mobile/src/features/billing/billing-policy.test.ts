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
