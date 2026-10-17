import type { ReceiptRecord, Transaction } from "@picket/domain";

export function selectReceiptReviews(receipts: ReceiptRecord[]): ReceiptRecord[] {
  return receipts.filter(receipt => receipt.status !== "processing" &&
    (receipt.reviewRequired || receipt.status === "review_required"));
}

export function selectReviewInbox(all: Transaction[], otherCategoryIds: Set<string>): { item: Transaction; reason: string }[] {
  const groups = new Map<string, { index: number; timestamp: number }[]>();
  const reasons = new Map<number, string>();
  all.forEach((item, index) => {
    if (item.kind !== "income" && item.kind !== "expense") return;
    if (!item.categoryId || otherCategoryIds.has(item.categoryId)) reasons.set(index, "Cần phân loại");
    const timestamp = new Date(item.occurredAt).getTime();
    if (!Number.isFinite(timestamp)) return;
    const key = JSON.stringify([item.accountId, item.kind, item.amount, item.title.trim().toLocaleLowerCase("vi-VN")]);
    const group = groups.get(key) ?? [];
    group.push({ index, timestamp });
    groups.set(key, group);
  });
  for (const group of groups.values()) {
    group.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < group.length; i++) {
      if (group[i].timestamp - group[i - 1].timestamp >= 86_400_000) continue;
      for (const candidate of [group[i - 1], group[i]]) {
        if (!reasons.has(candidate.index)) reasons.set(candidate.index, "Nghi trùng · kiểm tra trước khi lưu trữ");
      }
    }
  }
  return all.flatMap((item, index) => {
    const reason = reasons.get(index);
    return reason ? [{ item, reason }] : [];
  });
}
