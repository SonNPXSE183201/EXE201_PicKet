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
