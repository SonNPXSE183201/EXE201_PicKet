import type { UpdateTransactionRequest } from "@picket/domain";

export function buildTransactionEditRequest(input: {
  title: string;
  amount: string;
  note: string;
  categoryId: string | null;
  expectedVersion: number;
}): UpdateTransactionRequest {
  const amount = Number(input.amount);
  if (!/^\d+$/.test(input.amount) || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
  return {
    amount,
    categoryId: input.categoryId,
    expectedVersion: input.expectedVersion,
    note: input.note.trim(),
    title: input.title.trim(),
  };
}
