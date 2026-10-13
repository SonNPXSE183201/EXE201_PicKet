export const PICKET_SUBSCRIPTION_IDS = [
  "picket_plus_monthly",
  "picket_plus_yearly",
  "picket_pro_monthly",
  "picket_pro_yearly",
] as const;

export type PicketSubscriptionId = (typeof PICKET_SUBSCRIPTION_IDS)[number];

export interface VerifyPlayPurchaseRequest {
  productId: PicketSubscriptionId;
  purchaseToken: string;
}

export interface PlayPurchaseVerification {
  verified: true;
  active: boolean;
  tier: "free" | "plus" | "pro";
  expiresAt: string;
}
