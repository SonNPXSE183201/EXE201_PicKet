import type { Keepsake } from "@picket/domain";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { vietnamDate } from "@/core/finance/overview";
import { FinancePageHeader, MutationError } from "../finance-ui";
import { archiveKeepsake, saveKeepsake } from "./actions";
import { KeepsakePhotoFields } from './photo-fields';

function Fields({ item,owner }: { item?: Keepsake;owner:string }) {
  return (
    <>
      <input name="id" type="hidden" value={item?.id ?? ""} />
      <input name="version" type="hidden" value={item?.version ?? ""} />
      <label>
        Tên đồ dùng
        <input
          name="title"
          defaultValue={item?.title}
          maxLength={160}
          required
        />
      </label>
      <label>
        Giá mua
        <input
          name="amount"
          defaultValue={item?.amount ?? 0}
          type="number"
          min="0"
          max="9000000000000"
          step="1"
          required
        />
      </label>
      <label>
        Ngày mua
        <input
          name="purchasedAt"
          type="date"
          defaultValue={
            item?.purchasedAt.slice(0, 10) ??
            vietnamDate(new Date().toISOString())
          }
          required
        />
      </label>
      <label>
        Nhóm đồ dùng
        <input name="category" defaultValue={item?.category} maxLength={80} />
      </label>
      <label>
        Bảo hành đến
        <input
          name="warrantyUntil"
          type="date"
          defaultValue={item?.warrantyUntil?.slice(0, 10)}
        />
      </label>
      <label>
        Đổi trả đến
        <input
          name="returnUntil"
          type="date"
          defaultValue={item?.returnUntil?.slice(0, 10)}
        />
      </label>
      <label>
        Ghi chú
        <textarea
          name="note"
          defaultValue={item?.note}
          maxLength={1000}
          rows={3}
        />
      </label>
      <KeepsakePhotoFields owner={owner} path={item?.mediaPath} isEdit={!!item}/>
    </>
  );
}
export default async function KeepsakesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { api, accessToken,claims } = await requireApiSession();
  const [{ keepsakes }, query] = await Promise.all([
    api.listKeepsakes(accessToken),
    searchParams,
  ]);
  const items = keepsakes.filter((i) => !i.deletedAt);
  return (
    <>
      <FinancePageHeader
        title="Đồ dùng & bảo hành"
        description="Giữ thông tin mua sắm và những mốc bảo hành, đổi trả cần nhớ."
      />
      <MutationError visible={!!query.error} />
      {query.saved && (
        <p className="admin-success" role="status">
          Đã lưu thay đổi.
        </p>
      )}
      <section className="finance-columns">
        <article className="finance-panel">
          <h2>Thêm đồ dùng</h2>
          <form action={saveKeepsake} className="finance-form">
            <Fields owner={String(claims.sub)}/>
          </form>
        </article>
        <section className="finance-stack">
          {items.map((item) => (
            <article className="resource-card" key={item.id}>
              <div className="resource-summary">
                <div>
                  <h2>{item.title}</h2>
                  <p>
                    {item.category || "Chưa phân nhóm"} ·{" "}
                    {new Date(item.purchasedAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <strong>{formatVnd(item.amount)}</strong>
              </div>
              <p>{item.note}</p>
              <dl className="keepsake-dates">
                <div>
                  <dt>Bảo hành</dt>
                  <dd>
                    {item.warrantyUntil
                      ? new Date(item.warrantyUntil).toLocaleDateString("vi-VN")
                      : "Chưa đặt"}
                  </dd>
                </div>
                <div>
                  <dt>Đổi trả</dt>
                  <dd>
                    {item.returnUntil
                      ? new Date(item.returnUntil).toLocaleDateString("vi-VN")
                      : "Chưa đặt"}
                  </dd>
                </div>
              </dl>
              <details>
                <summary>Chỉnh sửa đồ dùng</summary>
                <form action={saveKeepsake} className="finance-form">
                  <Fields item={item} owner={String(claims.sub)}/>
                </form>
              </details>
              <details>
                <summary>Lưu trữ đồ dùng</summary>
                <form action={archiveKeepsake} className="finance-form">
                  <input name="id" type="hidden" value={item.id} />
                  <input name="version" type="hidden" value={item.version} />
                  <label>
                    Nhập ARCHIVE để xác nhận
                    <input
                      name="confirmation"
                      required
                      pattern="ARCHIVE"
                      autoComplete="off"
                    />
                  </label>
                  <button className="danger-link" type="submit">
                    Xác nhận lưu trữ
                  </button>
                </form>
              </details>
            </article>
          ))}
          {!items.length && (
            <article className="resource-card">
              <h2>Giữ lại những món quan trọng</h2>
              <p>
                Thêm món đồ đầu tiên để dễ tìm lại ngày mua và hạn bảo hành.
              </p>
            </article>
          )}
        </section>
      </section>
    </>
  );
}
