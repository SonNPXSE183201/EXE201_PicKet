import { formatVnd } from "@picket/domain";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import {
  monthSummary,
  walletBalances,
  vietnamDate,
} from "@/core/finance/overview";
import { Icon } from "@/core/ui/workspace-shell";
import { ReceiptCalendar } from "@/core/ui/receipt-calendar";
import {
  BalanceAmount,
  BalancePrivacyProvider,
  BalanceVisibilityToggle,
} from "../balance-privacy";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { api, accessToken } = await requireApiSession();
  const [{ profile }, { accounts }, transactions, query, { receipts }] =
    await Promise.all([
      api.currentProfile(accessToken),
      api.listAccounts(accessToken),
      loadAllTransactions(api, accessToken),
      searchParams,
      api.listReceipts(accessToken),
    ]);
  if (!profile?.onboardingCompleted) redirect("/onboarding");
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? "")
    ? query.month!
    : vietnamDate(new Date().toISOString()).slice(0, 7);
  const currencyAccounts = accounts.filter(
    (a) => a.currencyCode === profile.currencyCode,
  );
  const currencyTransactions = transactions.filter((t) =>
    currencyAccounts.some((a) => a.id === t.accountId),
  );
  const balances = walletBalances(accounts, transactions),
    summary = monthSummary(currencyTransactions, month);
  const monthTransactionCount = currencyTransactions.filter(
    (transaction) =>
      !transaction.deletedAt &&
      vietnamDate(transaction.occurredAt).slice(0, 7) === month,
  ).length;
  const monthlyNet = summary.income - summary.expense;
  const money = (amount: number) =>
    profile.currencyCode === "VND"
      ? formatVnd(amount)
      : new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: profile.currencyCode,
        }).format(amount);
  const totalBalance = currencyAccounts
    .filter((account) => !account.archived && !account.deletedAt)
    .reduce((sum, account) => sum + (balances[account.id] ?? 0), 0);
  const shift = (delta: number) => {
    const d = new Date(month + "-15T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + delta);
    return d.toISOString().slice(0, 7);
  };
  const recent = transactions.filter((t) => !t.deletedAt).slice(0, 6);
  return (
      <BalancePrivacyProvider initialHidden={profile.hideBalance}>
        <div>
        <header className="overview-intro">
          <p>Chào {profile.displayName}</p>
          <h1>Tài chính của bạn</h1>
        </header>
        <section className="overview-balance" aria-label="Tổng số dư">
          <div className="overview-balance-content">
            <div className="overview-balance-heading">
              <p className="overview-balance-label">Tổng số dư · {profile.currencyCode}</p>
              <BalanceVisibilityToggle />
            </div>
            <strong id="overview-balance-value">
              <BalanceAmount value={money(totalBalance)} />
            </strong>
            <Link href="/accounts" className="overview-balance-wallets">
              <Icon name="wallet" />
              <span>{accounts.filter((a) => !a.archived && !a.deletedAt).length} ví của bạn</span>
            </Link>
            {accounts.some((a) => a.currencyCode !== profile.currencyCode) && (
              <p className="overview-balance-note">
                Các ví khác tiền tệ được hiển thị riêng tại mục Ví, không cộng
                chung hoặc tự quy đổi.
              </p>
            )}
          </div>
          <Image
            src="/paper/picket-money-bloom-v2.png"
            alt=""
            width={120}
            height={120}
            priority
            className="overview-balance-art"
          />
        </section>
        <nav className="overview-period" aria-label="Chọn tháng">
          <Link href={"/dashboard?month=" + shift(-1)} aria-label="Tháng trước">
            <Icon name="arrowLeft" />
          </Link>
          <span>
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </span>
          <Link href={"/dashboard?month=" + shift(1)} aria-label="Tháng sau">
            <Icon name="arrowRight" />
          </Link>
        </nav>
        <section className="overview-summary" aria-label="Thu chi tháng">
          <article className="metric-income">
            <Icon name="transfer" />
            <p>Thu nhập</p>
            <strong className="income"><BalanceAmount value={money(summary.income)} /></strong>
          </article>
          <article className="metric-expense">
            <Icon name="chart" />
            <p>Chi tiêu</p>
            <strong className="expense"><BalanceAmount value={money(summary.expense)} /></strong>
          </article>
          <article className="metric-transactions">
            <Icon name="receipt" />
            <p>Giao dịch</p>
            <strong>{new Intl.NumberFormat("vi-VN").format(monthTransactionCount)}</strong>
            <span>Khoản trong tháng</span>
          </article>
          <article className="metric-net">
            <Icon name="wallet" />
            <p>Chênh lệch</p>
            <strong className={monthlyNet >= 0 ? "income" : "expense"}>
              {monthlyNet > 0 ? "+" : monthlyNet < 0 ? "−" : ""}
              <BalanceAmount value={money(Math.abs(monthlyNet))} />
            </strong>
            <span>Thu nhập trừ chi tiêu</span>
          </article>
        </section>
        <nav className="overview-actions" aria-label="Thao tác nhanh">
          <Link
            className="icon-action"
            aria-label="Thêm giao dịch"
            href="/transactions#new"
          >
            ＋
          </Link>
          <Link className="button secondary" href="/transactions/transfer">
            Chuyển tiền
          </Link>
          <Link className="button secondary" href="/receipts">
            Hóa đơn
          </Link>
        </nav>
        <section className="data-panel">
          <div className="panel-heading">
            <h2>Giao dịch gần đây</h2>
            <Link href="/transactions">Xem tất cả</Link>
          </div>
          {!recent.length ? (
            <div className="empty-state">
              <Image
                src="/paper/state-empty-wallet-v1.png"
                alt=""
                width={84}
                height={84}
                className="empty-state-art"
              />
              <h3>Chưa có giao dịch phù hợp</h3>
              <p>Thử thay đổi bộ lọc hoặc ghi một khoản thu, chi mới.</p>
              <Link className="button primary" href="/transactions#new">
                Thêm giao dịch
              </Link>
            </div>
          ) : (
            recent.map((row) => (
              <div className="data-row" key={row.id}>
                <div>
                  <strong>{row.title}</strong>
                  <span>
                    {new Date(row.occurredAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </span>
                </div>
                <strong
                  className={
                    row.kind === "income" || row.kind === "refund"
                      ? "income"
                      : row.kind === "expense"
                        ? "expense"
                        : undefined
                  }
                >
                  {row.kind === "income" || row.kind === "refund"
                    ? "+"
                    : row.kind === "expense"
                      ? "−"
                      : "↔ "}
                  <BalanceAmount
                    value={new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency:
                          accounts.find((a) => a.id === row.accountId)
                            ?.currencyCode ?? profile.currencyCode,
                      }).format(row.amount)}
                  />
                </strong>
              </div>
            ))
          )}
        </section>
        <ReceiptCalendar
          dates={receipts.flatMap((r) =>
            r.purchasedAt ? [r.purchasedAt] : [],
          )}
          initialMonth={month}
        />
        </div>
      </BalancePrivacyProvider>
  );
}
