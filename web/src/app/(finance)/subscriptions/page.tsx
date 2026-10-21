import { SubmitButton } from "@/core/ui/submit-button";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import {
  archiveSubscription,
  createSubscription,
  updateSubscription,
} from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}
const dateValue = (value: string) => value.slice(0, 10);

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const [{ subscriptions }, { accounts }, { categories }] = await Promise.all([
    api.listSubscriptions(accessToken),
    api.listAccounts(accessToken),
    api.listCategories(accessToken),
  ]);
  const { error } = await searchParams;
  const fields = (defaults?: (typeof subscriptions)[number]) => (
    <>
      <label>
        Tên khoản định kỳ
        <input
          defaultValue={defaults?.title}
          name="title"
          required
          maxLength={160}
        />
      </label>
      <label>
        Số tiền
        <input
          defaultValue={defaults?.amount}
          name="amount"
          required
          min="1"
          type="number"
        />
      </label>
      <label>
        Chu kỳ
        <select defaultValue={defaults?.cadence ?? "monthly"} name="cadence">
          <option value="weekly">Hàng tuần</option>
          <option value="monthly">Hàng tháng</option>
          <option value="quarterly">Hàng quý</option>
          <option value="yearly">Hàng năm</option>
          <option value="custom">Tùy chỉnh</option>
        </select>
      </label>
      <label>
        Số tháng/chu kỳ
        <input
          defaultValue={defaults?.cycleMonths ?? 1}
          name="cycleMonths"
          required
          min="1"
          max="120"
          type="number"
        />
      </label>
      <label>
        Kỳ tiếp theo
        <input
          defaultValue={defaults ? dateValue(defaults.nextDueAt) : undefined}
          name="nextDueAt"
          required
          type="date"
        />
      </label>
      <label>
        Nhắc trước (ngày)
        <input
          defaultValue={defaults?.alertDays ?? 3}
          name="alertDays"
          required
          min="0"
          max="365"
          type="number"
        />
      </label>
      <label>
        Tài khoản
        <select defaultValue={defaults?.walletId ?? ""} name="walletId">
          <option value="">Không chọn</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Danh mục
        <select defaultValue={defaults?.categoryId ?? ""} name="categoryId">
          <option value="">Không chọn</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ghi chú
        <textarea defaultValue={defaults?.note} name="note" maxLength={2000} />
      </label>
    </>
  );
  return (
    <>
      <FinancePageHeader
        title="Chi phí định kỳ"
        description="Quản lý các khoản thuê bao và lịch thanh toán lặp lại trên web và mobile."
      />
      <MutationError visible={Boolean(error)} />
      <section className="finance-columns">
        <article className="finance-panel">
          <h2>Thêm khoản định kỳ</h2>
          <form action={createSubscription} className="finance-form">
            {fields()}
            <SubmitButton className="button primary">Tạo lịch</SubmitButton>
          </form>
        </article>
        <section className="finance-stack">
          {subscriptions.map((item) => (
            <article className="resource-card" key={item.id}>
              <div className="resource-summary">
                <div>
                  <h2>{item.title}</h2>
                  <p>
                    {item.cadence} · kỳ tới {dateValue(item.nextDueAt)} ·{" "}
                    {item.active ? "Đang hoạt động" : "Tạm dừng"}
                  </p>
                </div>
                <strong>{formatVnd(item.amount)}</strong>
              </div>
              <details>
                <summary>Chỉnh sửa</summary>
                <form action={updateSubscription} className="inline-form">
                  <input name="id" type="hidden" value={item.id} />
                  <input name="version" type="hidden" value={item.version} />
                  {fields(item)}
                  <label>
                    <input
                      defaultChecked={item.active}
                      name="active"
                      type="checkbox"
                    />{" "}
                    Đang hoạt động
                  </label>
                  <SubmitButton className="small-button">
                    Lưu thay đổi
                  </SubmitButton>
                </form>
              </details>
              <form action={archiveSubscription}>
                <input name="id" type="hidden" value={item.id} />
                <input name="version" type="hidden" value={item.version} />
                <SubmitButton className="danger-link">
                  Lưu trữ lịch
                </SubmitButton>
              </form>
            </article>
          ))}
          {subscriptions.length === 0 && (
            <p className="empty-state">Chưa có khoản định kỳ.</p>
          )}
        </section>
      </section>
    </>
  );
}
