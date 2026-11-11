import "server-only";

import { requireApiSession } from "@/core/auth/require-api-session";
import { createClient } from "@/core/supabase/server";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import { loadSpendingSplits } from "@/core/finance/load-spending-splits";
import { categorySpending, vietnamDate } from "@/core/finance/overview";
import { buildReminders, type WebReminder } from "@/core/finance/reminders";
import { safeAnnouncementTarget } from "@picket/domain";

export async function loadNotificationFeed(): Promise<{
  owner: string;
  rows: WebReminder[];
  hasPartialData: boolean;
}> {
  const { api, accessToken, claims } = await requireApiSession();
  const client = await createClient();
  const today = vietnamDate(new Date().toISOString());
  const month = today.slice(0, 7);
  const [
    { bills },
    { subscriptions },
    { keepsakes },
    { budgets },
    transactions,
    planning,
    { accounts },
    settings,
    ads,
    announcements,
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
    api.announcements({ channel: "web", locale: "vi" }, accessToken).catch(() => null),
  ]);

  const splits = await loadSpendingSplits(api, accessToken, transactions, month);
  const warnings = budgets.filter((budget) => {
    if (!budget.active || budget.deletedAt) return false;
    const limit =
      planning.periods.find((period) => period.budgetId === budget.id)?.limit ??
      budget.defaultLimit;
    const wallets = new Set(
      accounts
        .filter((account) => account.currencyCode === (budget.currencyCode ?? "VND"))
        .map((account) => account.id),
    );
    const spent =
      categorySpending(
        transactions.filter((transaction) => wallets.has(transaction.accountId)),
        month,
        splits,
      ).find((category) => category.id === budget.categoryId)?.amount ?? 0;
    return limit > 0 && spent * 100 >= limit * budget.alertPercent;
  });

  const rows = buildReminders({
    today,
    month,
    bills,
    subscriptions,
    keepsakes,
    warnings,
  });

  if (settings.data?.notice) {
    rows.unshift({
      id: "system:" + settings.data.notice,
      title: settings.data.maintenance
        ? "Thông báo bảo trì"
        : "Thông báo từ Picket",
      body: settings.data.notice,
      date: today,
      href: "/help",
      kind: "system",
    });
  }

  if (
    announcements?.maintenance.active &&
    announcements.maintenance.notice !== settings.data?.notice
  ) {
    rows.unshift({
      id: `maintenance:${announcements.maintenance.notice}`,
      title: "Picket đang bảo trì",
      body: announcements.maintenance.notice,
      date: today,
      href: "/notifications",
      kind: "system",
    });
  }

  for (const item of announcements?.items ?? []) {
    const target = safeAnnouncementTarget(item);
    rows.push({
      id: `announcement:${item.id}:${item.revision}`,
      title: item.title,
      body: item.body,
      date: item.starts_at,
      href: target?.kind === "route" ? target.value : target?.kind === "url" ? target.value : "/notifications",
      kind: "system",
      external: target?.kind === "url",
    });
  }

  for (const ad of ads.data ?? []) {
    try {
      const url = new URL(ad.url);
      if (url.protocol !== "https:" || url.username || url.password) continue;
      rows.push({
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

  return {
    owner: String(claims.sub),
    rows,
    hasPartialData: Boolean(settings.error || ads.error || !announcements),
  };
}
