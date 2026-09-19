import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { admin, json, sha256 } from "../_shared/auth.ts";
import { packageName, verifyPlayPurchase } from "../_shared/google_play.ts";
const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const audience = Deno.env.get("GOOGLE_PLAY_RTDN_AUDIENCE");
    const email = Deno.env.get("GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL");
    if (!audience || !email) return json({ error: "RTDN not configured" }, 503);
    const token = request.headers.get("authorization")?.replace(
      /^Bearer\s+/i,
      "",
    );
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { payload } = await jwtVerify(token, keys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });
    if (payload.email !== email || payload.email_verified !== true) {
      return json({ error: "Unauthorized" }, 401);
    }
    const text = await request.text();
    if (text.length > 40000) return json({ error: "Request too large" }, 413);
    const message = JSON.parse(text).message;
    const notification = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0)),
      ),
    );
    if (notification.packageName !== packageName) {
      return json({ error: "Package mismatch" }, 400);
    }
    const purchaseToken =
      notification.subscriptionNotification?.purchaseToken ??
        notification.voidedPurchaseNotification?.purchaseToken;
    if (typeof purchaseToken !== "string") return json({ received: true });
    const client = admin();
    const { data, error } = await client.from("play_purchases").select(
      "user_id",
    ).eq("token_hash", await sha256(purchaseToken)).maybeSingle();
    if (error) throw error;
    if (data) await verifyPlayPurchase(data.user_id, purchaseToken);
    return json({ received: true });
  } catch (_) {
    return json({ error: "Unable to process notification" }, 503);
  }
});
