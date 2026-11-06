import { json, requireUser } from "../_shared/auth.ts";
import { products, verifyPlayPurchase } from "../_shared/google_play.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const user = await requireUser(request);
    const text = await request.text();
    if (text.length > 12000) return json({ error: "Request too large" }, 413);
    const { purchaseToken, productId } = JSON.parse(text);
    if (
      typeof purchaseToken !== "string" || purchaseToken.length > 10000 ||
      !products[productId]
    ) return json({ error: "Invalid purchase" }, 400);
    return json(await verifyPlayPurchase(user.id, purchaseToken, productId));
  } catch (error) {
    return json(
      { error: "Unable to verify purchase" },
      error instanceof Error && error.message === "Unauthorized" ? 401 : 503,
    );
  }
});
