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

export interface PaymentPromotion {
  id:string; name:string; description:string|null; percent:number;
  endsAt:string|null; slotsLeft:number|null;
}
export interface PaymentOrder {
  id:string; order_code:number; sku:string; tier:'plus'|'pro'; amount:number; currency:'VND';
  list_amount?:number|null; discount_amount?:number;
  status:'pending'|'paid'|'cancelled'|'expired'|'review'; payment_link_id:string|null;
  checkout_url:string|null; qr_code:string|null; created_at:string; expires_at:string;
}
export interface PaymentCustomer {
  catalog:{sku:string;tier:'plus'|'pro';months:1|12;amount:number;list_amount?:number;promotion?:PaymentPromotion|null}[];
  orders:PaymentOrder[];
}
