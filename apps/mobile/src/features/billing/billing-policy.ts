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

/** Tier sold by a Picket product id (picket_pro_* is Pro, every other Picket plan is Plus). */
export function productTier(productId: string): PlanTier {
  return productId.startsWith("picket_pro_") ? "pro" : "plus";
}

/** Plan pre-selected on the plans screen: the user's choice, otherwise the first plan that is
    not the one they already have (so the call to action is never "upgrade" to the current plan). */
export function defaultPlanId(productIds: readonly string[], currentTier: string, chosenId: string | null): string | null {
  if (chosenId && productIds.includes(chosenId)) return chosenId;
  return productIds.find((id) => productTier(id) !== currentTier) ?? productIds[0] ?? null;
}

/** Call to action for the selected plan relative to the current tier. */
export function planAction(productId: string, currentTier: string): "current" | "upgrade" | "switch" {
  const target = TIER_RANK[productTier(productId)];
  const current = TIER_RANK[currentTier] ?? 0;
  return target === current ? "current" : target > current ? "upgrade" : "switch";
}
