import { SubmitButton } from "@/core/ui/submit-button";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";

import { createTransfer } from "../../actions";
import { FinancePageHeader, MutationError } from "../../finance-ui";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function TransferPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const { accounts } = await api.listAccounts(accessToken);
  const activeAccounts = accounts.filter((item) => !item.archived);
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <FinancePageHeader
        title="Chuyển tiền"
        description="Chuyển tiền nguyên tử giữa hai tài khoản cùng loại tiền tệ."
      />
      <MutationError visible={Boolean(error)} />
      <article className="operation-card">
        {activeAccounts.length < 2 ? (
          <p className="mutation-error">
            Cần ít nhất hai tài khoản đang hoạt động để chuyển tiền.
          </p>
        ) : null}
        <form action={createTransfer} className="finance-form">
          <label>
            Từ tài khoản
            <select name="sourceAccountId" required>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currencyCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Đến tài khoản
            <select name="destinationAccountId" required>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currencyCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nội dung
            <input maxLength={160} name="title" required />
          </label>
          <label>
            Số tiền
            <input
              inputMode="numeric"
              min="1"
              name="amount"
              required
              type="number"
            />
          </label>
          <label>
            Ngày
            <input
              defaultValue={today}
              name="occurredAt"
              required
              type="date"
            />
          </label>
          <label>
            Ghi chú
            <textarea maxLength={1000} name="note" rows={3} />
          </label>
          <SubmitButton
            className="button primary"
            disabled={activeAccounts.length < 2}
          >
            Xác nhận chuyển tiền
          </SubmitButton>
          <Link className="back-link" href="/transactions">
            Hủy và quay lại
          </Link>
        </form>
      </article>
    </>
  );
}
