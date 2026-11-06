import Link from "next/link";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { adjustRevenue } from "../payment-actions";

type Query = Record<string, string | undefined>;
type Summary = {
  confirmedVnd: number;
  estimatedVnd: number;
  reviewVnd: number;
  unconverted: { currency: string; amount: number }[];
  bySource: {
    source: string;
    name: string;
    enabled: boolean;
    confirmed: number;
    estimated: number;
    charges: number;
    refunded: number;
  }[];
  series: { period: string; source: string; amount: number; entries: number }[];
};
type Entry = {
  id: number;
  source: string;
  kind: string;
  status: string;
  external_ref: string;
  order_code: number | null;
  payment_order_id: string | null;
  user_id: string | null;
  sku: string | null;
  currency: string;
  amount_original: number;
  amount_vnd: number | null;
  is_test: boolean;
  occurred_at: string;
  revisions: number;
  note: string | null;
  evidence: Record<string, unknown>;
};

export const REVENUE_SOURCE_LABELS: Record<string, string> = {
  payos: "PayOS",
  google_play: "Google Play",
};
export const REVENUE_STATUS_LABELS: Record<string, string> = {
  confirmed: "Đã xác nhận",
  estimated: "Tạm tính",
  review: "Cần đối soát",
  reversed: "Đã đảo",
};
export const REVENUE_KIND_LABELS: Record<string, string> = {
  charge: "Thu",
  refund: "Hoàn tiền",
  chargeback: "Bồi hoàn",
  adjustment: "Điều chỉnh",
};
const FILTER_KEYS = ["source", "status", "kind", "ref", "from", "to"] as const;
const time = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
/** `datetime-local` (giờ Việt Nam) → ISO; giữ nguyên nếu đã có múi giờ. */
const toIso = (value: string) =>
  /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}:00+07:00`;

export async function RevenueAdmin({ query }: { query: Query }) {
  const { api, accessToken } = await requireApiSession("admin");
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = query[key];
    if (value) filters[key] = key === "from" || key === "to" ? toIso(value) : value;
  }
  const [summary, list] = await Promise.all([
    api.adminRevenue<Summary>(accessToken, {
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      bucket: query.bucket ?? "day",
    }),
    api.adminRevenue<{ entries: Entry[]; history: { id: number; changed_at: string; previous: Entry }[] }>(
      accessToken,
      { view: "entries", ...filters, ...(query.id ? { id: query.id } : {}) },
    ),
  ]);
  const exportQuery = new URLSearchParams(filters).toString();
  const selected = query.id ? list.entries.find((e) => String(e.id) === query.id) : undefined;
  return (
    <main className="admin-platform payment-admin">
      <h1>Doanh thu</h1>
      <p>
        Tổng hợp mọi khoản thu từ Google Play và PayOS, theo VND. Chỉ cộng các
        khoản <strong>đã xác nhận</strong>, đã trừ hoàn tiền. Google Play được
        tạm tính theo giá gói cho tới khi báo cáo bán hàng của Google xác nhận.
        Giao dịch thử nghiệm được loại khỏi tổng.
      </p>
      <form className="admin-filter">
        <label>
          Từ{" "}
          <input type="datetime-local" name="from" defaultValue={query.from} />
        </label>{" "}
        <label>
          Đến <input type="datetime-local" name="to" defaultValue={query.to} />
        </label>{" "}
        <label>
          Nguồn{" "}
          <select name="source" defaultValue={query.source ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(REVENUE_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Trạng thái{" "}
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(REVENUE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Loại{" "}
          <select name="kind" defaultValue={query.kind ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(REVENUE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Mã tham chiếu / mã đơn{" "}
          <input name="ref" defaultValue={query.ref} placeholder="GPA… hoặc mã PayOS" />
        </label>{" "}
        <button className="button primary">Lọc</button>{" "}
        <a className="button secondary" href={`/api/admin/revenue/export?${exportQuery}`}>
          Tải CSV
        </a>
      </form>

      <section className="admin-kpis" aria-label="Tổng doanh thu">
        <article>
          <h2>{formatVnd(summary.confirmedVnd)}</h2>
          <p>Đã xác nhận (doanh thu)</p>
        </article>
        <article>
          <h2>{formatVnd(summary.estimatedVnd)}</h2>
          <p>Tạm tính, chờ báo cáo Google</p>
        </article>
        <article>
          <h2>{formatVnd(summary.reviewVnd)}</h2>
          <p>Cần đối soát (trả thừa/trả hai lần — không tính doanh thu)</p>
        </article>
      </section>
      {!!summary.unconverted.length && (
        <p role="status">
          Chưa quy đổi VND:{" "}
          {summary.unconverted.map((u) => `${u.amount} ${u.currency}`).join(", ")}
        </p>
      )}

      <h2>Theo nguồn</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Nguồn</th>
            <th>Đã xác nhận</th>
            <th>Tạm tính</th>
            <th>Đã hoàn</th>
            <th>Số khoản thu</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {summary.bySource.map((s) => (
            <tr key={s.source}>
              <td>{REVENUE_SOURCE_LABELS[s.source] ?? s.name}</td>
              <td>{formatVnd(s.confirmed)}</td>
              <td>{formatVnd(s.estimated)}</td>
              <td>{formatVnd(s.refunded)}</td>
              <td>{s.charges}</td>
              <td>{s.enabled ? "Đang nhận" : "Đã ngừng"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Sổ doanh thu</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Thời điểm</th>
            <th>Nguồn</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Số tiền</th>
            <th>Tham chiếu</th>
          </tr>
        </thead>
        <tbody>
          {list.entries.map((e) => (
            <tr key={e.id}>
              <td>
                <Link href={`/admin/revenue?id=${e.id}`}>{e.id}</Link>
              </td>
              <td>{time(e.occurred_at)}</td>
              <td>{REVENUE_SOURCE_LABELS[e.source] ?? e.source}</td>
              <td>{REVENUE_KIND_LABELS[e.kind] ?? e.kind}</td>
              <td>
                {REVENUE_STATUS_LABELS[e.status] ?? e.status}
                {e.is_test ? " · thử nghiệm" : ""}
              </td>
              <td>
                {e.amount_vnd === null
                  ? `${e.amount_original} ${e.currency}`
                  : formatVnd(e.amount_vnd)}
              </td>
              <td>
                {e.order_code && e.payment_order_id ? (
                  <Link href={`/admin/payments?id=${e.payment_order_id}`}>
                    #{e.order_code}
                  </Link>
                ) : null}{" "}
                <code>{e.external_ref}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.entries.length && <p>Chưa có khoản nào trong bộ lọc.</p>}
      {list.entries.length === 50 && (
        <Link
          href={`/admin/revenue?${new URLSearchParams({ ...filters, beforeId: String(list.entries.at(-1)!.id) })}`}
        >
          Trang tiếp
        </Link>
      )}

      {selected && (
        <section aria-labelledby="revenue-detail">
          <h2 id="revenue-detail">Truy vết khoản #{selected.id}</h2>
          <dl>
            <dt>Người dùng</dt>
            <dd>{selected.user_id ?? "Chưa gắn (đơn chỉ có trong báo cáo Google)"}</dd>
            <dt>Gói</dt>
            <dd>{selected.sku ?? "—"}</dd>
            <dt>Bằng chứng</dt>
            <dd>
              <pre>{JSON.stringify(selected.evidence, null, 2)}</pre>
            </dd>
            {selected.note && (
              <>
                <dt>Lý do</dt>
                <dd>{selected.note}</dd>
              </>
            )}
          </dl>
          {!!list.history.length && (
            <>
              <h3>Lịch sử thay đổi</h3>
              <ol>
                {list.history.map((h) => (
                  <li key={h.id}>
                    {time(h.changed_at)} · trước đó{" "}
                    {REVENUE_STATUS_LABELS[h.previous.status] ?? h.previous.status} ·{" "}
                    {h.previous.amount_vnd === null
                      ? `${h.previous.amount_original} ${h.previous.currency}`
                      : formatVnd(h.previous.amount_vnd)}
                  </li>
                ))}
              </ol>
            </>
          )}
          {selected.kind === "charge" &&
            selected.status === "confirmed" &&
            selected.amount_vnd !== null && (
              <form action={adjustRevenue} className="admin-filter">
                <h3>Hoàn tiền / điều chỉnh</h3>
                <p>
                  Ghi một dòng âm mới; dòng gốc giữ nguyên. Cần quyền điều chỉnh
                  doanh thu và xác thực MFA.
                </p>
                <input type="hidden" name="ledgerId" value={selected.id} />
                <label>
                  Loại{" "}
                  <select name="kind" defaultValue="refund">
                    <option value="refund">Hoàn tiền</option>
                    <option value="adjustment">Điều chỉnh</option>
                  </select>
                </label>{" "}
                <label>
                  Số tiền (VND){" "}
                  <input
                    name="amountVnd"
                    type="number"
                    min={1}
                    max={selected.amount_vnd}
                    required
                  />
                </label>{" "}
                <label>
                  Mã giao dịch hoàn (nếu có) <input name="externalRef" />
                </label>{" "}
                <label>
                  Lý do <input name="reason" minLength={5} maxLength={500} required />
                </label>{" "}
                <button className="button primary">Ghi nhận</button>
              </form>
            )}
          {query.error === "adjust" && (
            <p role="alert">Không ghi nhận được. Kiểm tra quyền, MFA và số tiền.</p>
          )}
          {query.saved && <p role="status">Đã ghi nhận điều chỉnh.</p>}
        </section>
      )}
    </main>
  );
}
