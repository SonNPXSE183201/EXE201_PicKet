import Link from "next/link";
import {
  formatVnd,
  PAYMENT_ORDER_PHASE_LABELS,
  paymentOrderPhase,
  type PaymentOrder,
  type PaymentOrderPhase,
} from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import { saveUserPermission, savePermissionGroup } from "../payment-actions";
import { AdminIcon } from "../ui/admin-icon";
import { Banner, Card, Chip, Field, Kpi, Table, Timeline, formatDateTime, type ChipTone, type Column } from "../ui/paper";
import "./modules.css";

type Query = Record<string, string | undefined>;
type Order = {
  id: string;
  user_id: string | null;
  order_code: number;
  amount: number;
  status: PaymentOrder["status"];
  created_at: string;
  expires_at: string;
};
type OrderEvent = { id: number; event_type: string; created_at: string; details: Record<string, unknown> };
type Group = { id: string; name: string; revision: number; permissions: string[]; member: boolean };
/** Server component: rendered once per request, so one clock read is stable. */
const requestTime = () => Date.now();
const STATUS_FILTERS = ["paid", "expired", "cancelled", "pending", "review"] as const;
const PHASE_TONES: Record<PaymentOrderPhase, ChipTone> = {
  paid: "success", pending: "warning", verifying: "warning", expired: "outline", cancelled: "outline", review: "danger",
};

export async function PaymentAdmin({
  section,
  query,
}: {
  section: "revenue" | "payments" | "permissions";
  query: Query;
}) {
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  if (section === "revenue") {
    const filters: Record<string, string> = { view: "revenue" };
    for (const k of ["from", "to", "bucket", "period"])
      if (query[k]) filters[k] = query[k]!;
    const data = await api.adminPayments<{
      total: number;
      reviewTotal?: number;
      series: { period: string; amount: number; transactions: number }[];
      coverage: string;
    }>(accessToken, filters);
    const rows = data.series.map((r) => ({ ...r, id: r.period }));
    const columns: Column<(typeof rows)[number]>[] = [
      { key: "period", label: "Kỳ (giờ Việt Nam)", render: (r) => r.period.replace("T", " ") },
      { key: "amount", label: "Tiền nhận", align: "right", render: (r) => formatVnd(r.amount) },
      { key: "transactions", label: "Giao dịch", align: "right" },
    ];
    return (
      <>
        <p className="ap-card-note am-lead">
          Chỉ cộng đơn PayOS Đã thanh toán, VND. Đơn hết hạn/đã hủy không có tiền; khoản hoàn và Google Play chưa được nhập vào tổng này.
        </p>
        <form className="ap-filter" method="get" aria-label="Lọc doanh thu PayOS">
          <Field label="Kỳ" width={150}>
            <select name="period" defaultValue={query.period ?? "month"}>
              <option value="day">Hôm nay</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
              <option value="custom">Tùy chọn</option>
            </select>
          </Field>
          <Field label="Từ ngày giờ" width={190}><input type="datetime-local" name="from" defaultValue={query.from} /></Field>
          <Field label="Đến ngày giờ" width={190}><input type="datetime-local" name="to" defaultValue={query.to} /></Field>
          <Field label="Nhóm theo" width={130}>
            <select name="bucket" defaultValue={query.bucket ?? "day"}>
              <option value="day">Ngày</option>
              <option value="month">Tháng</option>
              <option value="year">Năm</option>
            </select>
          </Field>
          <button className="ap-btn" type="submit">Lọc</button>
        </form>
        <section className="am-kpis" aria-label="Tổng doanh thu PayOS">
          <Kpi icon="cash" tone="mint" label="Doanh thu PayOS" value={formatVnd(data.total)} hero />
          {!!data.reviewTotal && <Kpi icon="alert" tone="coral" label="Cần đối soát" value={formatVnd(data.reviewTotal)} note="Trả thiếu, thừa hoặc trả hai lần — xử lý hoàn tiền thủ công" />}
        </section>
        <Card receipt eyebrow="Theo kỳ" title="Doanh thu theo kỳ">
          <Table columns={columns} rows={rows} caption="Doanh thu PayOS theo kỳ" empty="Chưa có khoản nhận trong kỳ." />
        </Card>
      </>
    );
  }
  if (section === "payments") {
    const filters: Record<string, string> = {};
    for (const k of ["id", "status", "before", "beforeId"])
      if (query[k]) filters[k] = query[k]!;
    const data = await api.adminPayments<{
      orders: Order[];
      events: OrderEvent[];
    }>(accessToken, filters);
    // Pending only lasts 15 minutes; past that it shows as "Đang xác minh"
    // until the worker re-reads PayOS and records the final state.
    const now = requestTime();
    const phase = (o: Order) => paymentOrderPhase(o, now);
    const count = (...p: PaymentOrderPhase[]) => data.orders.filter((o) => p.includes(phase(o))).length;
    const columns: Column<Order>[] = [
      { key: "order_code", label: "Mã đơn", render: (o) => <Link className="am-link" href={`/admin/payments?id=${o.id}`}>#{o.order_code}</Link> },
      { key: "amount", label: "Số tiền", align: "right", render: (o) => <b>{formatVnd(o.amount)}</b> },
      { key: "status", label: "Trạng thái", render: (o) => <Chip tone={PHASE_TONES[phase(o)]}>{PAYMENT_ORDER_PHASE_LABELS[phase(o)]}</Chip> },
      { key: "expires_at", label: "Hết hạn link", muted: true, render: (o) => formatDateTime(o.expires_at) },
      { key: "created_at", label: "Thời gian", muted: true, render: (o) => formatDateTime(o.created_at) },
    ];
    const last = data.orders.at(-1);
    return (
      <>
        <section className="am-kpis is-four" aria-label="Tóm tắt đơn trong danh sách">
          <Kpi icon="check" tone="mint" label="Đã thanh toán" value={count("paid")} note="Trong danh sách đang xem" />
          <Kpi icon="calendar" tone="cream" label="Hết hạn" value={count("expired")} note="Link quá 15 phút" />
          <Kpi icon="close" tone="blue" label="Đã hủy" value={count("cancelled")} note="Khách hủy trên PayOS" />
          <Kpi icon="alert" tone="coral" label="Cần xem" value={count("review", "verifying")} note="Đối soát hoặc đang xác minh" />
        </section>

        <form className="ap-filter" method="get" aria-label="Lọc đơn thanh toán">
          <Field label="Trạng thái" width={200}>
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">Tất cả</option>
              {STATUS_FILTERS.map((v) => <option key={v} value={v}>{PAYMENT_ORDER_PHASE_LABELS[v]}</option>)}
            </select>
          </Field>
          <button className="ap-btn" type="submit">Lọc</button>
        </form>

        <div className={data.events.length ? "ap-split-wide" : undefined}>
          <Card receipt eyebrow="PayOS" title="Giao dịch thanh toán">
            <Table columns={columns} rows={data.orders} caption="Giao dịch thanh toán PayOS" selected={(o) => o.id === query.id} empty="Chưa có giao dịch." />
            {data.orders.length === 50 && last && (
              <nav className="ap-pagination" aria-label="Phân trang">
                <span />
                <Link className="ap-btn is-coral" href={`/admin/payments?before=${encodeURIComponent(last.created_at)}&beforeId=${last.id}`}>Trang tiếp</Link>
              </nav>
            )}
          </Card>
          {!!data.events.length && (
            <Card eyebrow="Diễn biến" title="Nhật ký đơn">
              <Timeline items={data.events.map((e, i) => ({
                title: <>{e.event_type}{typeof e.details.amount === "number" ? ` · ${formatVnd(e.details.amount)}` : ""}</>,
                meta: formatDateTime(e.created_at),
                color: i === 0 ? "var(--ap-mauve)" : "var(--ap-muted)",
              }))} />
            </Card>
          )}
        </div>
      </>
    );
  }
  const userId =
    query.userId && /^[a-f0-9-]{36}$/i.test(query.userId)
      ? query.userId
      : undefined;
  const data = await api.adminPermissions<{
    catalog: { code: string; description: string }[];
    rules: {
      permission: string;
      allowed: boolean;
      revision: number;
      expires_at: string | null;
    }[];
    groups: Group[];
  }>(accessToken, userId);
  const groups: Group[] = [...data.groups, { id: "", name: "", revision: 0, permissions: [], member: false }];
  return (
    <>
      <p className="ap-card-note am-lead">
        Chọn user bất kỳ bằng UUID. Quyền từ chối riêng ghi đè quyền nhóm; không làm mất quyền dùng ứng dụng cá nhân.
      </p>
      {query.error && <Banner tone="danger" icon="alert" title="Không lưu được quyền" text="Kiểm tra MFA, dữ liệu hoặc tải lại phiên bản quyền mới nhất." />}
      {query.saved && <Banner tone="success" icon="check" title="Đã lưu quyền" />}
      {!mfaVerified && (
        <Banner icon="list" title="Cần xác minh MFA để thay đổi quyền"
          action={<Link className="ap-btn is-ghost" href="/admin/security">Xác minh MFA</Link>} />
      )}

      <form className="ap-filter" method="get" aria-label="Tra cứu người dùng">
        <Field label="UUID người dùng" grow>
          <input name="userId" required defaultValue={userId} pattern="[a-fA-F0-9\-]{36}" placeholder="00000000-0000-0000-0000-000000000000" />
        </Field>
        <button className="ap-btn is-secondary" type="submit"><AdminIcon name="search" size={18} />Tra cứu</button>
      </form>

      <Card receipt eyebrow="Quyền × nhóm" title="Ma trận phân quyền"
        note={userId ? `Cột cuối là quyền riêng của user ${userId.slice(0, 8)}… (ghi đè quyền nhóm).` : "Tra cứu một user để thấy quyền riêng của họ."}>
        <div className="am-matrix-wrap" tabIndex={0} role="region" aria-label="Ma trận quyền theo nhóm">
          <table className="am-matrix">
            <caption className="ap-sr">Quyền theo nhóm</caption>
            <thead>
              <tr>
                <th scope="col">Quyền</th>
                {data.groups.map((g) => <th scope="col" key={g.id}>{g.name}{userId && g.member && <small>User là thành viên</small>}</th>)}
                {userId && <th scope="col">Quyền riêng</th>}
              </tr>
            </thead>
            <tbody>
              {data.catalog.map((c) => {
                const rule = data.rules.find((r) => r.permission === c.code);
                return (
                  <tr key={c.code}>
                    <th scope="row"><code>{c.code}</code><small>{c.description}</small></th>
                    {data.groups.map((g) => (
                      <td key={g.id}>
                        {g.permissions.includes(c.code)
                          ? <span className="am-yes"><AdminIcon name="check" size={16} /><span className="ap-sr">Có</span></span>
                          : <span className="am-no" aria-hidden="true">–<span className="ap-sr">Không</span></span>}
                      </td>
                    ))}
                    {userId && <td>{rule ? <Chip tone={rule.allowed ? "success" : "danger"}>{rule.allowed ? "Cho phép" : "Từ chối"}</Chip> : <span className="am-no">–</span>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data.groups.length && <p className="ap-card-note">Chưa có nhóm quyền tùy chỉnh.</p>}
      </Card>

      <section aria-labelledby="perm-groups" className="am-col">
        <header className="am-head"><div><span className="ap-eyebrow">Chỉnh sửa</span><h2 id="perm-groups" className="ap-card-title">Nhóm quyền tùy chỉnh</h2></div></header>
        <div className="ap-grid ap-grid-2 am-groups">
          {groups.map((group) => (
            <Card key={group.id || "new"} compact className={group.id ? undefined : "am-new"}>
              <details className="am-details" open={!group.id && data.groups.length === 0}>
                <summary>
                  <span>
                    <b>{group.name || "Tạo nhóm mới"}</b>
                    <small>{group.id ? `${group.permissions.length} quyền${userId && group.member ? " · user là thành viên" : ""}` : "Đặt tên và chọn quyền"}</small>
                  </span>
                  {group.id ? <Chip tone="lilac">{group.permissions.length}/{data.catalog.length}</Chip> : <Chip tone="coral" icon="plus">Mới</Chip>}
                </summary>
                <form className="ap-form" action={savePermissionGroup}>
                  <fieldset disabled={!mfaVerified}>
                    <input type="hidden" name="action" value="save" />
                    <input type="hidden" name="id" value={group.id} />
                    <input type="hidden" name="revision" value={group.revision} />
                    <input type="hidden" name="userId" value={userId ?? ""} />
                    <Field label="Tên nhóm"><input name="name" required maxLength={80} defaultValue={group.name} /></Field>
                    <fieldset className="am-checks">
                      <legend className="ap-eyebrow">Quyền trong nhóm</legend>
                      {data.catalog.map((c) => (
                        <label key={c.code} className="ap-check">
                          <input type="checkbox" name="permissions" value={c.code} defaultChecked={group.permissions.includes(c.code)} />
                          <span>{c.code}</span>
                        </label>
                      ))}
                    </fieldset>
                    <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
                    <SubmitButton className="ap-btn">Lưu nhóm</SubmitButton>
                  </fieldset>
                </form>
                {userId && group.id && (
                  <form className="ap-form" action={savePermissionGroup}>
                    <fieldset disabled={!mfaVerified}>
                      <hr className="ap-divider" />
                      <input type="hidden" name="action" value="member" />
                      <input type="hidden" name="id" value={group.id} />
                      <input type="hidden" name="userId" value={userId} />
                      <input type="hidden" name="enabled" value={group.member ? "false" : "true"} />
                      <Field label="Hết hạn thành viên"><input type="datetime-local" name="expiresAt" /></Field>
                      <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
                      <SubmitButton className="ap-btn is-secondary">{group.member ? "Gỡ user khỏi nhóm" : "Thêm user vào nhóm"}</SubmitButton>
                    </fieldset>
                  </form>
                )}
              </details>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="perm-user" className="am-col">
        <header className="am-head"><div><span className="ap-eyebrow">Ghi đè theo user</span><h2 id="perm-user" className="ap-card-title">Quyền riêng của user</h2></div></header>
        {userId ? (
          <Card receipt compact>
            <ul className="am-rules">
              {data.catalog.map((c) => {
                const rule = data.rules.find((r) => r.permission === c.code);
                return (
                  <li key={c.code}>
                    <form className="am-rule" action={saveUserPermission}>
                      <fieldset disabled={!mfaVerified}>
                        <input type="hidden" name="userId" value={userId} />
                        <input type="hidden" name="permission" value={c.code} />
                        <input type="hidden" name="revision" value={rule?.revision ?? 0} />
                        <span className="am-rule-name"><b>{c.code}</b><small>{c.description}</small></span>
                        <Field label="Hiệu lực">
                          <select name="allowed" defaultValue={rule?.allowed === false ? "false" : "true"}>
                            <option value="true">Cho phép</option>
                            <option value="false">Từ chối</option>
                          </select>
                        </Field>
                        <Field label="Hết hạn"><input type="datetime-local" name="expiresAt" /></Field>
                        <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
                        <SubmitButton className="ap-btn is-secondary">Lưu quyền</SubmitButton>
                      </fieldset>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <p className="ap-card-note">Nhập UUID người dùng ở trên để xem và chỉnh quyền riêng của họ.</p>
        )}
      </section>
    </>
  );
}
