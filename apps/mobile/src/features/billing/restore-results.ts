/** A failed verification must never become a successful restore message. */
export async function verifyRestoredPurchases<T>(purchases: readonly T[], verify: (purchase: T) => Promise<boolean>) {
  let verified = 0;
  let failed = 0;
  for (const purchase of purchases) {
    try {
      if (await verify(purchase)) verified++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { verified, failed };
}
