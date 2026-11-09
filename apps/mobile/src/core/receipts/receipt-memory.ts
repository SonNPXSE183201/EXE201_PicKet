import type { ReceiptRecord } from "@picket/domain";

/* Receipts already read this session, per owner. Opening the receipt screen
   (Figma D5) from a transaction then shows at once and refreshes quietly. */
const remembered = new Map<string, ReceiptRecord>();

const keyOf = (owner: string, id: string) => `${owner}:${id}`;

const byTransaction = new Map<string, string>();

export function rememberReceipt(owner: string, receipt: ReceiptRecord) {
  // List rows carry no line items: never replace a full receipt with one.
  const current = remembered.get(keyOf(owner, receipt.id));
  if (!(current?.lineItems && !receipt.lineItems && current.version === receipt.version)) remembered.set(keyOf(owner, receipt.id), receipt);
  if (receipt.transactionId) byTransaction.set(keyOf(owner, receipt.transactionId), receipt.id);
  if (remembered.size > 200) remembered.delete(remembered.keys().next().value as string);
}

export function recallReceipt(owner: string, id: string): ReceiptRecord | null {
  return remembered.get(keyOf(owner, id)) ?? null;
}

/** The receipt linked to a transaction, when this session has already read it. */
export function recallTransactionReceipt(owner: string, transactionId: string): ReceiptRecord | null {
  const id = byTransaction.get(keyOf(owner, transactionId));
  return id ? recallReceipt(owner, id) : null;
}

export function forgetReceipts() {
  remembered.clear();
  byTransaction.clear();
}
