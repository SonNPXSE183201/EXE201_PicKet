export function calendarReceiptDay(receipt: { purchasedAt: string | null; createdAt?: string }, transactionDate?: string): string | null {
  for (const value of [receipt.purchasedAt, transactionDate, receipt.createdAt]) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return null;
}
