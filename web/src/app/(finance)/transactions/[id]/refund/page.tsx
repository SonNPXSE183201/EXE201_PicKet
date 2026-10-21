import { formatVnd } from "@picket/domain";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from '@/core/finance/load-transactions';

import { createRefund } from "../../../actions";
import { FinancePageHeader, MutationError } from "../../../finance-ui";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function RefundPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { accessToken, api } = await requireApiSession();
  const transactions = await loadAllTransactions(api,accessToken);
  const original = transactions.find((item) => item.id === id);
  const refunded = transactions.filter((item) => item.kind === "refund" && item.refundOfTransactionId === id).reduce((sum, item) => sum + item.amount, 0);
  const remaining = Math.max(0, (original?.amount ?? 0) - refunded);
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  if (!original || original.kind !== "expense") {
    return <><FinancePageHeader title="Không thể hoàn tiền" description="Không tìm thấy khoản chi phù hợp hoặc giao dịch không còn hoạt động." /><Link className="button secondary" href="/transactions">Về danh sách</Link></>;
  }

  return (
    <>
      <FinancePageHeader title="Hoàn tiền" description="Tạo một khoản hoàn toàn phần hoặc một phần, không vượt quá giao dịch gốc." />
      <MutationError visible={Boolean(error)} />
      <article className="operation-card">
        <div className="operation-summary"><strong>{original.title}</strong><span>Còn có thể hoàn: {formatVnd(remaining)}</span></div>
        <form action={createRefund} className="finance-form">
          <input name="transactionId" type="hidden" value={original.id} />
          <label>Số tiền hoàn<input inputMode="numeric" max={remaining} min="1" name="amount" required type="number" /></label>
          <label>Ngày<input defaultValue={today} name="occurredAt" required type="date" /></label>
          <label>Lý do hoặc ghi chú<textarea maxLength={1000} name="note" rows={3} /></label>
          <button className="button primary" disabled={remaining === 0} type="submit">Tạo khoản hoàn</button>
          <Link className="back-link" href="/transactions">Hủy và quay lại</Link>
        </form>
      </article>
    </>
  );
}
