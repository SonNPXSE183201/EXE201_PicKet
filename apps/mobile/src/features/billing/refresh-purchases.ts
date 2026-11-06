import { isPicketSubscriptionId, normalizePurchaseForVerification, type StorePurchaseForVerification } from "./billing-policy";
import type { VerifyPlayPurchaseRequest } from "@picket/domain";

/** A store listing is evidence to reverify, never authority to grant a tier. */
export async function refreshOwnedPurchases(
  purchases: StorePurchaseForVerification[],
  verify: (request: VerifyPlayPurchaseRequest) => Promise<unknown>,
  isCurrent: () => boolean,
) {
  let verified=0, failed=0;
  const seen=new Set<string>();
  for(const purchase of purchases){
    if(!isCurrent())break;
    if(!isPicketSubscriptionId(purchase.productId)||!purchase.purchaseToken||seen.has(purchase.purchaseToken))continue;
    seen.add(purchase.purchaseToken);
    try{
      const result=await verify(normalizePurchaseForVerification(purchase));
      if(!isCurrent())break;
      if(!result||typeof result!=="object"||(result as {verified?:unknown}).verified!==true)throw new Error("Unverified store purchase");
      verified++;
    }catch{if(isCurrent())failed++;}
  }
  return {verified,failed};
}
