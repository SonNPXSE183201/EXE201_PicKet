/** Opening a probable match must not discard a user's still-uncommitted draft. */
export async function completeDuplicateCapture(input: {
  exact: boolean; owner: string; receiptOwner: string; captureId?: string;
}, io: { complete(owner: string, id: string): Promise<unknown>; remove(): Promise<void> }) {
  if (!input.exact) return;
  if (input.owner !== input.receiptOwner) throw new Error("Receipt owner changed");
  // If completing the journal fails, leave the receipt draft retryable. The
  // journal itself protects a newer capture from this older completion ID.
  if (input.captureId) await io.complete(input.owner, input.captureId);
  await io.remove();
}
