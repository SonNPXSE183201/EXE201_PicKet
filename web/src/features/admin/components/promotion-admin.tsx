import Link from "next/link";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { savePromotionAction } from "../payment-actions";

type Query = Record<string, string | undefined>;
type Plan = { sku: string; tier: string; months: number; amount: number };
type Promotion = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  discount_percent: number;
  skus: string[];
  channels: string[];
  starts_at: string;
  ends_at: string | null;
  max_redemptions: number | null;
  per_user_limit: number;
  enabled: boolean;
  priority: number;
  play_offer_id: string | null;
  revision: number;
  used: number;
  consumed: number;
  audit: { id: number; reason: string; created_at: string }[];
};

const vnLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16)
    : "";
const time = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const planName = (p: Plan) =>
  `${p.tier.toUpperCase()} ${p.months === 12 ? "1 năm" : "1 tháng"}`;

export function promotionState(p: Promotion, now: number) {
  if (!p.enabled) return "Tạm dừng";
  if (Date.parse(p.starts_at) > now) return "Chưa bắt đầu";
  if (p.ends_at && Date.parse(p.ends_at) <= now) return "Đã kết thúc";
  if (p.max_redemptions !== null && p.used >= p.max_redemptions) return "Hết suất";
  return "Đang chạy";
}
const requestTime = () => Date.now();

export async function PromotionAdmin({ query }: { query: Query }) {
  const { api, accessToken } = await requireApiSession("admin");
  const data = await api.adminPromotions<{ catalog: Plan[]; promotions: Promotion[] }>(
    accessToken,
  );
  const now = requestTime();
  const editing = query.edit
    ? data.promotions.find((p) => p.id === query.edit)
    : undefined;
  const form = editing;
  return (
    <main className="admin-platform payment-admin">
      <h1>Ưu đãi</h1>
      <p>
        Giữ nguyên 4 gói; ưu đãi giảm % theo chiến dịch (ví dụ gói sáng lập cho
        100 người đầu). Giá được khóa vào đơn lúc khách bấm mua, đơn chờ giữ suất
        15 phút. Ưu đãi áp cho thanh toán PayOS; trên Google Play cần tạo offer
        tương ứng trong Play Console rồi ghi mã offer để đối chiếu.
      </p>
      {query.saved && <p role="status">Đã lưu ưu đãi.</p>}
      {query.error && (
        <p role="alert">
          Không lưu được. Kiểm tra MFA, lý do, số suất (không thấp hơn số đã dùng)
          hoặc có người vừa sửa.
        </p>
      )}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Giảm</th>
            <th>Gói</th>
            <th>Suất</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.promotions.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name}
                {p.code ? (
                  <>
                    {" "}
                    · mã <code>{p.code}</code>
                  </>
                ) : null}
              </td>
              <td>{p.discount_percent}%</td>
              <td>{p.skus.join(", ")}</td>
              <td>
                {p.max_redemptions === null
                  ? `${p.consumed} đã dùng`
                  : `${p.used}/${p.max_redemptions} (đã trả ${p.consumed})`}
              </td>
              <td>
                {time(p.starts_at)} → {p.ends_at ? time(p.ends_at) : "không hạn"}
              </td>
              <td>{promotionState(p, now)}</td>
              <td>
                <Link href={`/admin/promotions?edit=${p.id}`}>Sửa</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.promotions.length && <p>Chưa có ưu đãi nào.</p>}

      <h2>{form ? `Sửa: ${form.name}` : "Tạo ưu đãi mới"}</h2>
      <form action={savePromotionAction} className="admin-filter promotion-form">
        {form && (
          <>
            <input type="hidden" name="id" value={form.id} />
            <input type="hidden" name="revision" value={form.revision} />
          </>
        )}
        <label>
          Tên <input name="name" required minLength={3} maxLength={80} defaultValue={form?.name} />
        </label>
        <label>
          Mô tả hiển thị{" "}
          <input name="description" maxLength={300} defaultValue={form?.description ?? ""} />
        </label>
        <label>
          % giảm{" "}
          <input
            name="discountPercent"
            type="number"
            min={1}
            max={90}
            required
            defaultValue={form?.discount_percent ?? 10}
          />
        </label>
        <fieldset>
          <legend>Áp cho gói</legend>
          {data.catalog.map((plan) => (
            <label key={plan.sku}>
              <input
                type="checkbox"
                name="skus"
                value={plan.sku}
                defaultChecked={form ? form.skus.includes(plan.sku) : true}
              />{" "}
              {planName(plan)} ({formatVnd(plan.amount)})
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Kênh</legend>
          <label>
            <input type="checkbox" name="channels" value="payos" defaultChecked={form ? form.channels.includes("payos") : true} /> PayOS (APK)
          </label>
          <label>
            <input type="checkbox" name="channels" value="google_play" defaultChecked={form?.channels.includes("google_play")} /> Google Play (chỉ ánh xạ offer)
          </label>
        </fieldset>
        <label>
          Mã offer Google Play{" "}
          <input name="playOfferId" pattern="[a-z0-9-]{1,63}" defaultValue={form?.play_offer_id ?? ""} />
        </label>
        <label>
          Mã khuyến mãi (để trống = tự áp){" "}
          <input name="code" pattern="[A-Za-z0-9_-]{3,32}" defaultValue={form?.code ?? ""} />
        </label>
        <label>
          Bắt đầu (giờ VN){" "}
          <input type="datetime-local" name="startsAt" defaultValue={vnLocal(form?.starts_at ?? null)} />
        </label>
        <label>
          Kết thúc (giờ VN){" "}
          <input type="datetime-local" name="endsAt" defaultValue={vnLocal(form?.ends_at ?? null)} />
        </label>
        <label>
          Tổng số suất (để trống = không giới hạn){" "}
          <input name="maxRedemptions" type="number" min={1} defaultValue={form?.max_redemptions ?? ""} />
        </label>
        <label>
          Mỗi người tối đa{" "}
          <input name="perUserLimit" type="number" min={1} max={100} defaultValue={form?.per_user_limit ?? 1} />
        </label>
        <label>
          Độ ưu tiên <input name="priority" type="number" defaultValue={form?.priority ?? 0} />
        </label>
        <label>
          Trạng thái{" "}
          <select name="enabled" defaultValue={String(form?.enabled ?? false)}>
            <option value="false">Tạm dừng</option>
            <option value="true">Bật</option>
          </select>
        </label>
        <label>
          Lý do thay đổi (lưu vào nhật ký){" "}
          <input name="reason" required minLength={5} maxLength={500} />
        </label>
        <button className="button primary">Lưu (cần MFA)</button>
        {form && <Link href="/admin/promotions">Hủy sửa</Link>}
      </form>
      {form && !!form.audit.length && (
        <>
          <h3>Nhật ký thay đổi</h3>
          <ol>
            {form.audit.map((a) => (
              <li key={a.id}>
                {time(a.created_at)} · {a.reason}
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
