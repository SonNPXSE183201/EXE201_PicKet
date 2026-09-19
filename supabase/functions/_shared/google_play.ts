import { importPKCS8, SignJWT } from "npm:jose@6.1.0";
import { admin, sha256 } from "./auth.ts";
export const packageName = "com.picket.mobile";
export const products: Record<string, string> = {
  picket_plus_monthly: "plus",
  picket_plus_yearly: "plus",
  picket_pro_monthly: "pro",
  picket_pro_yearly: "pro",
};
export async function googleToken() {
  const config = JSON.parse(
    Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ?? "{}",
  );
  if (!config.client_email || !config.private_key) {
    throw new Error("Billing not configured");
  }
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/androidpublisher",
  }).setProtectedHeader({ alg: "RS256" }).setIssuer(config.client_email)
    .setAudience("https://oauth2.googleapis.com/token").setIssuedAt()
    .setExpirationTime("5m").sign(
      await importPKCS8(config.private_key, "RS256"),
    );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Google authorization failed");
  return (await response.json()).access_token as string;
}
export async function verifyPlayPurchase(
  userId: string,
  purchaseToken: string,
  productId?: string,
) {
  const accessToken = await googleToken();
  const base =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases`;
  const response = await fetch(
    `${base}/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("Purchase verification failed");
  const purchase = await response.json();
  if (
    purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !==
      await sha256(userId)
  ) throw new Error("Account mismatch");
  const lines = (purchase.lineItems ?? []).filter((
    item: { productId: string },
  ) =>
    products[item.productId] && (!productId || item.productId === productId)
  );
  lines.sort((a: { expiryTime: string }, b: { expiryTime: string }) =>
    Date.parse(b.expiryTime) - Date.parse(a.expiryTime)
  );
  const line = lines[0];
  if (!line?.expiryTime || !Number.isFinite(Date.parse(line.expiryTime))) {
    throw new Error("Product mismatch");
  }
  const active = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ].includes(purchase.subscriptionState) &&
    Date.parse(line.expiryTime) > Date.now();
  const { error } = await admin().rpc("record_play_purchase", {
    p_hash: await sha256(purchaseToken),
    p_user: userId,
    p_product: line.productId,
    p_tier: products[line.productId],
    p_expires: line.expiryTime,
    p_active: active,
    p_previous_hash: typeof purchase.linkedPurchaseToken === "string"
      ? await sha256(purchase.linkedPurchaseToken)
      : null,
  });
  if (error) throw new Error("Purchase record failed");
  if (
    active && purchase.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING"
  ) {
    const ack = await fetch(
      `${base}/subscriptions/${encodeURIComponent(line.productId)}/tokens/${
        encodeURIComponent(purchaseToken)
      }:acknowledge`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: "{}",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!ack.ok) throw new Error("Acknowledgement failed");
  }
  return {
    verified: true,
    active,
    tier: active ? products[line.productId] : "free",
    expiresAt: line.expiryTime,
  };
}
