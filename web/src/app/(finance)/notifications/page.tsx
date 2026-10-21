import { requireApiSession } from "@/core/auth/require-api-session";
import { createClient } from "@/core/supabase/server";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import { loadSpendingSplits } from "@/core/finance/load-spending-splits";
import { categorySpending, vietnamDate } from "@/core/finance/overview";
import { buildReminders, type WebReminder } from "@/core/finance/reminders";
import { FinancePageHeader } from "../finance-ui";
import { NotificationFeed } from "./notification-feed";

export default async function NotificationsPage() {
  const { api, accessToken, claims } = await requireApiSession();
  const client = await createClient(),
    today = vietnamDate(new Date().toISOString()),
    month = today.slice(0, 7);
  const [
    { bills },
    { subscriptions },
    { keepsakes },
    { budgets },
    rows,
    planning,
    { accounts },
    settings,
    ads,
  ] = await Promise.all([
    api.listBills(accessToken),
    api.listSubscriptions(accessToken),
    api.listKeepsakes(accessToken),
    api.listBudgets(accessToken),
    loadAllTransactions(api, accessToken),
    api.getPlanning(accessToken, month),
    api.listAccounts(accessToken),
    client
      .from("app_settings")
      .select("maintenance,notice")
      .eq("id", true)
      .maybeSingle(),
    client
      .from("partner_ads")
      .select("id,title,body,url,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const splits = await loadSpendingSplits(api, accessToken, rows, month);
  const warnings = budgets.filter((b) => {
    if (!b.active || b.deletedAt) return false;
    const limit =
      planning.periods.find((p) => p.budgetId === b.id)?.limit ??
      b.defaultLimit;
    const wallets = new Set(
      accounts
        .filter((a) => a.currencyCode === (b.currencyCode ?? "VND"))
        .map((a) => a.id),
    );
    const spent =
      categorySpending(
        rows.filter((r) => wallets.has(r.accountId)),
        month,
        splits,
      ).find((s) => s.id === b.categoryId)?.amount ?? 0;
    return limit > 0 && spent * 100 >= limit * b.alertPercent;
  });
  const reminders: WebReminder[] = buildReminders({
    today,
    month,
    bills,
    subscriptions,
    keepsakes,
    warnings,
  });
  if (settings.data?.notice)
    reminders.unshift({
      id: "system:" + settings.data.notice,
      title: settings.data.maintenance
        ? "Thông báo bảo trì"
        : "Thông báo từ Picket",
      body: settings.data.notice,
      date: today,
      href: "/help",
      kind: "system",
    });
  for (const ad of ads.data ?? []) {
    try {
      const url = new URL(ad.url);
      if (url.protocol !== "https:" || url.username || url.password) continue;
      reminders.push({
        id: "partner:" + ad.id,
        title: ad.title,
        body: ad.body,
        date: ad.created_at,
        href: url.href,
        kind: "partner",
        external: true,
      });
    } catch {
      /* Invalid stored links are never rendered as actions. */
    }
  }
  return (
    <>
      <FinancePageHeader
        title="Thông báo"
        description="Các kỳ thanh toán, hạn bảo hành và ngân sách cần chú ý."
      />
      {(settings.error || ads.error) && (
        <p role="status" className="capture-status">
          Chưa tải được một phần thông tin hệ thống hoặc đối tác. Các nhắc việc
          cá nhân vẫn hiển thị bên dưới.
        </p>
      )}
      <NotificationFeed rows={reminders} owner={String(claims.sub)} />
    </>
  );
}
