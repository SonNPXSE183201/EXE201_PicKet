import type { ReceiptLineItemInput } from "@picket/domain";

export interface GuestReceipt {
  transactionId: string;
  imageBase64: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  merchant: string;
  amount: number;
  purchasedAt: string | null;
  rawText: string | null;
  lineItems: ReceiptLineItemInput[];
}

export function makeGuestReceipt(value: Omit<GuestReceipt, "contentType"> & { contentType: string }): GuestReceipt {
  if (!value.transactionId || !Number.isSafeInteger(value.amount) || value.amount <= 0 ||
      !["image/jpeg", "image/png", "image/webp"].includes(value.contentType) ||
      !value.imageBase64 || value.imageBase64.length > 14_000_000 || !Array.isArray(value.lineItems)) throw new Error("Ảnh hoặc dữ liệu hóa đơn không hợp lệ.");
  return value as GuestReceipt;
}
