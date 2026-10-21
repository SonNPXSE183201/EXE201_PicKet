import { formatVnd } from "@picket/domain";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from '@/core/finance/load-transactions';

import { setTransactionSplits } from "../../../actions";
import { FinancePageHeader, MutationError } from "../../../finance-ui";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function SplitsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { accessToken, api } = await requireApiSession();
  const [transactions, { categories }, { splits }] = await Promise.all([
    loadAllTransactions(api,accessToken),
    api.listCategories(accessToken),
    api.listTransactionSplits(accessToken, id),
  ]);
  const transaction = transactions.find((item) => item.id === id);
  const { error } = await searchParams;

  if (!transaction || (transaction.kind !== "expense" && transaction.kind !== "income")) {
    return <><FinancePageHeader title="Không thể chia giao dịch" description="Không tìm thấy khoản thu chi phù hợp." /><Link className="button secondary" href="/transactions">Về danh sách</Link></>;
  }

  const availableCategories = categories.filter((item) => item.kind === transaction.kind || item.kind === "both");
  const existingAmounts = new Map(splits.map((item) => [item.categoryId, item.amount]));

  return (
    <>
      <FinancePageHeader title="Chia danh mục" description="Tổng các phần phải đúng bằng giá trị giao dịch; để trống toàn bộ để xóa phân bổ." />
      <MutationError visible={Boolean(error)} />
      <article className="operation-card">
        <div className="operation-summary"><strong>{transaction.title}</strong><span>Cần phân bổ: {formatVnd(transaction.amount)} · phiên bản {transaction.version}</span></div>
        <form action={setTransactionSplits} className="finance-form">
          <input name="transactionId" type="hidden" value={transaction.id} />
          <input name="transactionAmount" type="hidden" value={transaction.amount} />
          <input name="version" type="hidden" value={transaction.version} />
          <div className="split-list">
            {availableCategories.map((category) => <label className="split-row" key={category.id}><span>{category.name}</span><input defaultValue={existingAmounts.get(category.id) ?? ""} inputMode="numeric" min="1" name={`split:${category.id}`} placeholder="0" type="number" /></label>)}
          </div>
          {availableCategories.length === 0 ? <p className="mutation-error">Chưa có danh mục phù hợp với loại giao dịch này.</p> : null}
          <button className="button primary" type="submit">Lưu phân bổ</button>
          <Link className="back-link" href="/transactions">Hủy và quay lại</Link>
        </form>
      </article>
    </>
  );
}
