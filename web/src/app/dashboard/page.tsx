import { PicketApiClient } from "@picket/api-client";
import { formatVnd } from "@picket/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { requireApiSession } from '@/core/auth/require-api-session';

import { FinanceRealtime } from "../(finance)/finance-realtime";
import { signOut } from "./actions";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default async function DashboardPage() {
  await requireApiSession();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) redirect("/login");
  const userId = typeof claimsData.claims.sub === "string" ? claimsData.claims.sub : null;

  const api = new PicketApiClient(apiBaseUrl);
  const [profileResult, accountsResult, transactionsResult] = await Promise.allSettled([
    api.currentProfile(token),
    api.listAccounts(token),
    api.listTransactions(token),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value.profile : null;
  if (profileResult.status === "fulfilled" && !profile?.onboardingCompleted) {
    redirect("/onboarding");
  }
  const accounts = accountsResult.status === "fulfilled" ? accountsResult.value.accounts : [];
  const transactions = transactionsResult.status === "fulfilled"
    ? transactionsResult.value.transactions.slice(0, 6)
    : [];
  const apiAvailable = [profileResult, accountsResult, transactionsResult].every(
    (result) => result.status === "fulfilled",
  );
  const money = (value: number) => profile?.hideBalance ? "••••••" : formatVnd(value);

  return (
    <main className="dashboard shell">
      <header className="dashboard-header">
        <Link className="brand" href="/">
          <span className="brand-mark">P</span>
          <span>Picket</span>
        </Link>
        <div className="dashboard-user">
          {userId ? <FinanceRealtime userId={userId} /> : null}
          <span>{profile?.displayName || String(claimsData.claims.email ?? "Tài khoản Picket")}</span>
          <Link className="text-button" href="/profile">Hồ sơ</Link>
          <form action={signOut}><button className="text-button" type="submit">Đăng xuất</button></form>
        </div>
      </header>

      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Tổng quan tài chính</p>
          <h1 className="dashboard-title">Dữ liệu của bạn, trên mọi thiết bị.</h1>
          <p className="dashboard-copy">
            Web đang đọc cùng hồ sơ, tài khoản và giao dịch với ứng dụng Expo thông qua Dart API.
          </p>
        </div>
        <div className={`api-status ${apiAvailable ? "online" : "offline"}`}>
          <span className="status-dot" aria-hidden="true" />
          {apiAvailable ? "Đã đồng bộ Dart API" : "Không tải đủ dữ liệu API"}
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Tổng quan tài khoản">
        <article className="metric-card">
          <span>Tài khoản đang hoạt động</span>
          <strong>{accounts.filter((account) => !account.archived).length}</strong>
        </article>
        <article className="metric-card">
          <span>Giao dịch đã đồng bộ</span>
          <strong>{transactionsResult.status === "fulfilled" ? transactionsResult.value.transactions.length : "—"}</strong>
        </article>
        <article className="metric-card">
          <span>Tiền tệ chính</span>
          <strong>{profile?.currencyCode ?? "—"}</strong>
        </article>
      </section>

      <nav className="dashboard-shortcuts" aria-label="Tác vụ tài chính">
        <Link href="/accounts">Quản lý tài khoản</Link>
        <Link href="/transactions">Quản lý giao dịch</Link>
        <Link href="/categories">Quản lý danh mục</Link>
        <Link href="/budgets">Quản lý ngân sách</Link>
      </nav>

      <section className="dashboard-panels">
        <article className="data-panel">
          <div className="panel-heading"><h2>Tài khoản</h2><span>{accounts.length} mục</span></div>
          {accounts.length === 0 ? <p className="empty-state">Chưa có tài khoản.</p> : (
            <div className="data-list">
              {accounts.map((account) => (
                <div className="data-row" key={account.id}>
                  <div><strong>{account.name}</strong><span>{account.kind} · {account.currencyCode}</span></div>
                  <strong>{money(account.openingBalance)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="data-panel">
          <div className="panel-heading"><h2>Giao dịch gần đây</h2><span>{transactions.length} mục</span></div>
          {transactions.length === 0 ? <p className="empty-state">Chưa có giao dịch.</p> : (
            <div className="data-list">
              {transactions.map((transaction) => (
                <div className="data-row" key={transaction.id}>
                  <div><strong>{transaction.title}</strong><span>{new Date(transaction.occurredAt).toLocaleDateString("vi-VN")}</span></div>
                  <strong className={transaction.kind === "income" ? "income" : "expense"}>
                    {profile?.hideBalance ? "••••••" : `${transaction.kind === "income" ? "+" : "−"}${formatVnd(transaction.amount)}`}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
