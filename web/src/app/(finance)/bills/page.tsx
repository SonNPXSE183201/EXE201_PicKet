import { SubmitButton } from "@/core/ui/submit-button";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { archiveBill, createBill, updateBill } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}
const dateValue = (value: string) => value.slice(0, 10);

export default async function BillsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const { bills } = await api.listBills(accessToken);
  const { error } = await searchParams;
  return (
    <>
      <FinancePageHeader
        title="Kỳ thanh toán"
        description="Theo dõi hóa đơn cần trả, ngày đến hạn và trạng thái thanh toán."
      />
      <MutationError visible={Boolean(error)} />
      <section className="finance-columns">
        <article className="finance-panel">
          <h2>Thêm kỳ thanh toán</h2>
          <form action={createBill} className="finance-form">
            <label>
              Tên hóa đơn
              <input name="title" required maxLength={160} />
            </label>
            <label>
              Số tiền
              <input
                name="amount"
                required
                inputMode="numeric"
                min="1"
                type="number"
              />
            </label>
            <label>
              Ngày đến hạn
              <input name="dueAt" required type="date" />
            </label>
            <SubmitButton className="button primary">Tạo hóa đơn</SubmitButton>
          </form>
        </article>
        <section className="finance-stack">
          {bills.map((bill) => (
            <article className="resource-card" key={bill.id}>
              <div className="resource-summary">
                <div>
                  <h2>{bill.title}</h2>
                  <p>
                    Hạn {dateValue(bill.dueAt)} · {bill.status} · phiên bản{" "}
                    {bill.version}
                  </p>
                </div>
                <strong>{formatVnd(bill.amount)}</strong>
              </div>
              <details>
                <summary>Chỉnh sửa</summary>
                <form action={updateBill} className="inline-form">
                  <input name="id" type="hidden" value={bill.id} />
                  <input name="version" type="hidden" value={bill.version} />
                  <label>
                    Tên
                    <input
                      defaultValue={bill.title}
                      name="title"
                      required
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Số tiền
                    <input
                      defaultValue={bill.amount}
                      name="amount"
                      required
                      min="1"
                      type="number"
                    />
                  </label>
                  <label>
                    Ngày đến hạn
                    <input
                      defaultValue={dateValue(bill.dueAt)}
                      name="dueAt"
                      required
                      type="date"
                    />
                  </label>
                  <label>
                    Trạng thái
                    <select defaultValue={bill.status} name="status">
                      <option value="pending">Chờ thanh toán</option>
                      <option value="paid">Đã thanh toán</option>
                      <option value="overdue">Quá hạn</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </label>
                  <SubmitButton className="small-button">
                    Lưu thay đổi
                  </SubmitButton>
                </form>
              </details>
              <form action={archiveBill}>
                <input name="id" type="hidden" value={bill.id} />
                <input name="version" type="hidden" value={bill.version} />
                <SubmitButton className="danger-link">
                  Lưu trữ hóa đơn
                </SubmitButton>
              </form>
            </article>
          ))}
          {bills.length === 0 && (
            <p className="empty-state">Chưa có kỳ thanh toán.</p>
          )}
        </section>
      </section>
    </>
  );
}
