import type { Bill, FinanceSubscription, Keepsake } from "@picket/domain";
export type WebReminder = {
  id: string;
  title: string;
  date: string;
  href: string;
  kind: string;
  body?: string;
  external?: boolean;
};
export function buildReminders(input: {
  today: string;
  month: string;
  bills: Bill[];
  subscriptions: FinanceSubscription[];
  keepsakes: Keepsake[];
  warnings: Array<{ id: string; name: string }>;
}): WebReminder[] {
  const rows: WebReminder[] = [];
  const yesterday = new Date(input.today + "T12:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const earliest = yesterday.toISOString().slice(0, 10);
  for (const b of input.bills)
    if (
      !b.deletedAt &&
      !b.paidTransactionId &&
      !["paid", "cancelled"].includes(b.status) &&
      b.dueAt.slice(0, 10) >= earliest
    )
      rows.push({
        id: "bill:" + b.id + ":" + b.dueAt,
        title: b.title,
        date: b.dueAt,
        href: "/bills",
        kind: "bill",
      });
  for (const s of input.subscriptions)
    if (!s.deletedAt && s.active && s.nextDueAt.slice(0, 10) >= earliest)
      rows.push({
        id: "subscription:" + s.id + ":" + s.nextDueAt,
        title: s.title,
        date: s.nextDueAt,
        href: "/subscriptions",
        kind: "subscription",
      });
  for (const k of input.keepsakes.filter((k) => !k.deletedAt))
    for (const [kind, date] of [
      ["return", k.returnUntil],
      ["warranty", k.warrantyUntil],
    ] as const)
      if (date && date >= input.today)
        rows.push({
          id: kind + ":" + k.id + ":" + date,
          title:
            k.title +
            " · " +
            (kind === "return" ? "hạn đổi trả" : "hạn bảo hành"),
          date,
          href: "/keepsakes",
          kind,
        });
  for (const b of input.warnings)
    rows.push({
      id: "budget:" + b.id + ":" + input.month,
      title: b.name + " đã chạm ngưỡng cảnh báo",
      date: input.today,
      href: "/budgets",
      kind: "budget",
    });
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
