import {
  PICKET_SUBSCRIPTION_IDS,
  type PicketSubscriptionId,
  type PlayPurchaseVerification,
  type VerifyPlayPurchaseRequest,
} from "@picket/domain";

export interface StorePurchaseForVerification {
  productId: string;
  purchaseToken?: string | null;
}

const subscriptionIds = new Set<string>(PICKET_SUBSCRIPTION_IDS);
export function canStartPlayPurchase(platform:string,connected:boolean,status:unknown):boolean {
  return platform==="android" && connected && !!status && typeof status==="object" &&
    (status as {newPurchasesEnabled?:unknown}).newPurchasesEnabled===true;
}

export function isPicketSubscriptionId(
  value: string,
): value is PicketSubscriptionId {
  return subscriptionIds.has(value);
}

export function normalizePurchaseForVerification(
  purchase: StorePurchaseForVerification,
): VerifyPlayPurchaseRequest {
  if (!isPicketSubscriptionId(purchase.productId)) {
    throw new Error("Gói đăng ký không hợp lệ.");
  }
  const purchaseToken = purchase.purchaseToken;
  if (
    typeof purchaseToken !== "string" ||
    purchaseToken.length === 0 ||
    purchaseToken.length > 10_000 ||
    purchaseToken.trim() !== purchaseToken
  ) {
    throw new Error("Google Play chưa cung cấp mã giao dịch hợp lệ.");
  }
  return { productId: purchase.productId, purchaseToken };
}

export async function verifyAndFinishPurchase(
  purchase: StorePurchaseForVerification,
  verify: (
    request: VerifyPlayPurchaseRequest,
  ) => Promise<PlayPurchaseVerification>,
  finish: () => Promise<void>,
): Promise<PlayPurchaseVerification> {
  const result = await verify(normalizePurchaseForVerification(purchase));
  if (result.verified !== true) {
    throw new Error("Server chưa xác minh được giao dịch.");
  }
  await finish();
  return result;
}

export type PlanTier = "plus" | "pro";
const TIER_RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 };

/** Tier sold by a PicKet product id (picket_pro_* is Pro, every other PicKet plan is Plus). */
export function productTier(productId: string): PlanTier {
  return productId.startsWith("picket_pro_") ? "pro" : "plus";
}

/** Plan pre-selected on the plans screen: the user's choice, otherwise the first plan that is
    not the one they already have (so the call to action is never "upgrade" to the current plan). */
export function defaultPlanId(productIds: readonly string[], currentTier: string, chosenId: string | null): string | null {
  if (chosenId && productIds.includes(chosenId)) return chosenId;
  return productIds.find((id) => productTier(id) !== currentTier) ?? productIds[0] ?? null;
}

/** A PicKet subscription this Google Play account already owns. */
export interface OwnedPlaySubscription { productId: string; purchaseToken: string }

const planRank = (productId: string) => TIER_RANK[productTier(productId)] * 2 + (productId.endsWith("_yearly") ? 1 : 0);

/** Active PicKet subscription to replace on a plan change: the highest-ranked one this account owns. */
export function ownedPlaySubscription(purchases: readonly StorePurchaseForVerification[]): OwnedPlaySubscription | null {
  let best: OwnedPlaySubscription | null = null;
  for (const item of purchases) {
    if (!isPicketSubscriptionId(item.productId) || typeof item.purchaseToken !== "string" || !item.purchaseToken) continue;
    if (!best || planRank(item.productId) > planRank(best.productId)) best = { productId: item.productId, purchaseToken: item.purchaseToken };
  }
  return best;
}

export type PlayPlanChange =
  | { action: "current" | "otherChannel" }
  | { action: "upgrade" | "switch"; replace: { purchaseToken: string; oldProductId: string; replacementMode: "with-time-proration" | "deferred" } | null };

/**
 * What buying `targetId` means for this account. Without linking the old purchase, Google Play
 * starts a second subscription and bills both, so every change from a Play plan replaces it:
 * a higher tier or monthly→yearly starts now with the unused time credited (WITH_TIME_PRORATION);
 * a lower tier or yearly→monthly starts when the current period ends (DEFERRED).
 * A paid plan that did not come from this Play account (PayOS, a grant, another Google account)
 * cannot be replaced from here, so purchases are blocked to avoid paying twice.
 */
export function playPlanChange(targetId: string, currentTier: string, owned: OwnedPlaySubscription | null): PlayPlanChange {
  if ((TIER_RANK[currentTier] ?? 0) === 0) return { action: "upgrade", replace: null };
  if (!owned || productTier(owned.productId) !== currentTier) return { action: "otherChannel" };
  if (owned.productId === targetId) return { action: "current" };
  const up = planRank(targetId) > planRank(owned.productId);
  return {
    action: up ? "upgrade" : "switch",
    replace: { purchaseToken: owned.purchaseToken, oldProductId: owned.productId, replacementMode: up ? "with-time-proration" : "deferred" },
  };
}

/** Call to action for the selected plan relative to the current tier. */
export function planAction(productId: string, currentTier: string): "current" | "upgrade" | "switch" {
  const target = TIER_RANK[productTier(productId)];
  const current = TIER_RANK[currentTier] ?? 0;
  return target === current ? "current" : target > current ? "upgrade" : "switch";
}
