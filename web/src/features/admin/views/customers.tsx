import Link from "next/link";
import { randomUUID } from "node:crypto";
import { SubmitButton } from "@/core/ui/submit-button";
import { mutateAdmin } from "../actions";
import { AdminRecordForm } from "../components/admin-record-form";
import { AdminDialog } from "../components/admin-dialog";
import { AdminIcon } from "../ui/admin-icon";
import { AdminPager } from "../ui/admin-pager";
import { Bars, Card, Chip, Field, Kpi, Table, formatDate, formatDateTime, formatNumber, relativeTime, type ChipTone, type Column } from "../ui/paper";
import { can, label, num, rows, sectionHref, statusTone, str, type Row, type ViewProps } from "./shared";
import "./views.css";
import "./growth-customers.css";

const PAGE_SIZE = 25;

function Footnote({ p, children }: { p: ViewProps; children?: React.ReactNode }) {
  return (
    <p className="ap-footnote">
      <AdminIcon name="sparkle" size={14} />
      <span>{children ? <>{children} </> : null}Nguồn: API Picket · Múi giờ {str(p.data.timezone) || "—"} · Truy vấn lúc {formatDateTime(p.data.asOf)}.</span>
    </p>
  );
}

function Pager({ p, total, base }: { p: ViewProps; total: number; base: string }) {
  return <AdminPager base={base} query={p.query} page={p.page} total={total} pageSize={PAGE_SIZE} clear={["ticketId"]} />;
}

/* ---------- Tickets · Figma 11 (150:6644) ---------- */
const statusTabs = [
  { value: "", name: "Tất cả" },
  { value: "open", name: "Mở" },
  { value: "in_progress", name: "Đang xử lý" },
  { value: "resolved", name: "Đã xử lý" },
  { value: "closed", name: "Đóng" },
];
const priorityTone: Record<string, ChipTone> = { urgent: "warning", high: "coral", normal: "outline", low: "neutral" };
const ticketNumber = (id: unknown) => {
  const s = str(id);
  return s.length > 10 ? s.replace(/-/g, "").slice(0, 8).toUpperCase() : s.replace(/^t/i, "");
};

export function TicketsView(p: ViewProps) {
  const { data, query, mfaVerified } = p;
  const tickets = rows(data.rows);
  const total = num(data.total) ?? tickets.length;
  const base = "/admin/tickets";
  const status = query.status ?? "";
  const selected = tickets.find((t) => str(t.id) === query.ticketId) ?? tickets[0];
  const href = (id: unknown) => sectionHref(base, query, { ticketId: str(id) });
  const activeTab = statusTabs.find((t) => t.value === status);

  const columns: Column<Row>[] = [
    { key: "title", label: "Yêu cầu", render: (t) => (
      <span>
        <Link className="ag-ticket-link" href={href(t.id)} aria-current={selected && str(selected.id) === str(t.id) ? "true" : undefined}>{str(t.title) || "(Không có tiêu đề)"}</Link>
        <small className="ag-sub">{str(t.target_user) || "—"}</small>
      </span>
    ) },
    { key: "priority", label: "Ưu tiên", render: (t) => <Chip tone={priorityTone[str(t.priority)] ?? "neutral"}>{label(t.priority)}</Chip> },
    { key: "assignee", label: "Người xử lý", render: (t) => (str(t.assignee) ? str(t.assignee) : <span className="ag-muted">Chưa giao</span>) },
    { key: "updated_at", label: "Cập nhật", align: "right", render: (t) => relativeTime(t.updated_at) },
  ];

  const comments = selected ? rows(data.comments).filter((c) => c.ticket_id === selected.id) : [];

  return (
    <>
      <nav className="ag-tabs" aria-label="Lọc theo trạng thái">
        {statusTabs.map((t) => (
          <Link key={t.value || "all"} className="ag-tab" href={sectionHref(base, query, { status: t.value || undefined, ticketId: undefined })} aria-current={t.value === status ? "page" : undefined}>
            {t.name}
            {t.value === status && <Chip>{formatNumber(total)}</Chip>}
          </Link>
        ))}
      </nav>

      <div className="ag-tickets">
        <div className="ag-col">
          <Card receipt eyebrow={`${formatNumber(total)} yêu cầu${activeTab?.value ? ` · ${activeTab.name.toLowerCase()}` : ""}`} title="Hộp thư hỗ trợ"
            actions={
              <form className="ag-inbox-search" method="get" role="search" aria-label="Tìm yêu cầu">
                {query.days && <input type="hidden" name="days" value={query.days} />}
                {status && <input type="hidden" name="status" value={status} />}
                <input name="search" type="search" maxLength={160} defaultValue={query.search} placeholder="Tiêu đề hoặc thao tác" aria-label="Tìm theo tiêu đề hoặc thao tác" />
                <button className="ap-btn is-sm" type="submit">Tìm</button>
                {(query.search || status) && <Link className="ap-btn is-ghost is-sm" href={query.days ? `${base}?days=${query.days}` : base}>Xoá lọc</Link>}
              </form>
            }>
            <Table columns={columns} rows={tickets} caption="Hộp thư hỗ trợ" selected={(t) => Boolean(selected) && str(t.id) === str(selected?.id)} />
            {typeof data.total === "number" && <Pager p={p} total={total} base={base} />}
          </Card>

          <Card eyebrow="Tạo mới" title="Thêm yêu cầu hỗ trợ" flat>
            <details className="ag-details">
              <summary>Mở biểu mẫu</summary>
              <div className="ag-editor"><AdminRecordForm action="ticket" disabled={!mfaVerified} /></div>
            </details>
          </Card>
        </div>

        {selected ? (
          <Card receipt className="ag-detail" eyebrow={`Yêu cầu #${ticketNumber(selected.id)}`} title={str(selected.title) || "(Không có tiêu đề)"}>
            <span className="ap-row" style={{ gap: 6 }}>
              <Chip tone={priorityTone[str(selected.priority)] ?? "neutral"}>{label(selected.priority)}</Chip>
              <Chip tone={statusTone(selected.status)}>{label(selected.status)}</Chip>
              {str(selected.target_user) && <Chip tone="outline">{str(selected.target_user)}</Chip>}
            </span>
            {str(selected.body) && <p className="ag-body">{str(selected.body)}</p>}
            <ul className="ag-kv">
              <li>Người xử lý<b>{str(selected.assignee) || "Chưa giao"}</b></li>
              <li>Cập nhật<b>{formatDateTime(selected.updated_at)}</b></li>
            </ul>

            <span className="ap-eyebrow">Ghi chú nội bộ</span>
            {comments.length ? (
              <ul className="ag-notes">
                {comments.map((c) => (
                  <li key={str(c.id)} className="ag-note">
                    <header><b>{str(c.author) || "—"}</b><span>{formatDateTime(c.created_at)}</span></header>
                    <p>{str(c.body)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="ap-card-note">Chưa có ghi chú nội bộ.</p>}

            <form className="ap-form" action={mutateAdmin}>
              <input type="hidden" name="action" value="comment" />
              <input type="hidden" name="ticketId" value={str(selected.id)} />
              <input type="hidden" name="requestId" value={randomUUID()} />
              <fieldset disabled={!mfaVerified}>
                <Field label="Thêm ghi chú"><textarea name="body" required maxLength={2000} rows={3} placeholder="Viết ghi chú cho đồng đội…" /></Field>
                <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
                <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
                <SubmitButton className="ap-btn">Lưu &amp; ghi nhật ký</SubmitButton>
              </fieldset>
            </form>

            <hr className="ap-divider" />
            <details className="ag-details">
              <summary>Cập nhật yêu cầu (trạng thái, ưu tiên, người xử lý)</summary>
              <div className="ag-editor"><AdminRecordForm action="ticket" row={selected} disabled={!mfaVerified} /></div>
            </details>
          </Card>
        ) : (
          <Card receipt eyebrow="Chi tiết" title="Chưa có yêu cầu">
            <p className="ap-card-note">Không có yêu cầu nào khớp bộ lọc hiện tại.</p>
          </Card>
        )}
      </div>
      <Footnote p={p} />
    </>
  );
}

/* ---------- Billing · Figma 12 (150:6921) ---------- */
const money = (value: number, currency: string) => (currency === "VND" ? `${formatNumber(value)} ₫` : `${formatNumber(value)} ${currency || ""}`.trim());
const stateName = (v: unknown) => str(v).replace(/^(SUBSCRIPTION_STATE|ACKNOWLEDGEMENT_STATE)_/, "");
const tierTone: Record<string, ChipTone> = { pro: "coral", plus: "lilac", free: "outline" };

export function BillingView(p: ViewProps) {
  const { data, mfaVerified, role } = p;
  const entitlements = rows(data.rows);
  const total = num(data.total) ?? entitlements.length;
  const grants = rows(data.grants);
  const sales = rows(data.sales);
  const canGrant = ["owner", "operations"].includes(role ?? "");
  const base = "/admin/billing";
  const pageNote = "Trong trang đang xem";
  const count = (f: (r: Row) => boolean) => entitlements.filter(f).length;

  const groups = new Map<string, { currency: string; metric: string; rows: Row[] }>();
  for (const r of sales) {
    const key = `${str(r.currency)}|${str(r.metric)}`;
    const g = groups.get(key) ?? { currency: str(r.currency), metric: str(r.metric), rows: [] };
    g.rows.push(r);
    groups.set(key, g);
  }
  const groupList = [...groups.values()];
  const main = groupList.sort((a, b) => b.rows.length - a.rows.length)[0];
  const series = main ? [...main.rows].sort((a, b) => str(a.day).localeCompare(str(b.day))).map((r) => num(r.value) ?? 0) : [];

  const columns: Column<Row>[] = [
    { key: "user_id", label: "Người dùng", render: (r) => {
      const who = str(r.user_id);
      const sub = <small className="ag-sub">xác minh {relativeTime(r.verified_at)}</small>;
      return can(p, "users") && r.id
        ? <span><Link className="ag-ticket-link" href={`/admin/users?userId=${encodeURIComponent(str(r.id))}`}>{who}</Link>{sub}</span>
        : <span><b className="ag-strong">{who}</b>{sub}</span>;
    } },
    { key: "product_id", label: "Sản phẩm", muted: true, render: (r) => str(r.product_id) || "—" },
    { key: "tier", label: "Gói", render: (r) => <Chip tone={tierTone[str(r.tier)] ?? "outline"}>{label(r.tier)}</Chip> },
    { key: "active", label: "Hiệu lực", render: (r) => (r.active === true ? <Chip tone="success">Đang hiệu lực</Chip> : <Chip tone="outline">Không</Chip>) },
    { key: "expires_at", label: "Hết hạn", render: (r) => formatDate(r.expires_at) },
    { key: "subscription_state", label: "Trạng thái Google", render: (r) => (str(r.subscription_state) ? <Chip tone={statusTone(stateName(r.subscription_state))}>{stateName(r.subscription_state)}</Chip> : "—") },
    { key: "acknowledgement_state", label: "Acknowledgement", render: (r) => (str(r.acknowledgement_state) ? <Chip tone={stateName(r.acknowledgement_state) === "ACKNOWLEDGED" ? "success" : "warning"}>{stateName(r.acknowledgement_state) === "ACKNOWLEDGED" ? "Đã nhận" : stateName(r.acknowledgement_state)}</Chip> : "—") },
    { key: "is_test", label: "License test", render: (r) => (r.is_test === true ? <Chip tone="warning">Test</Chip> : r.is_test === false ? "Không" : <span className="ag-muted">Chưa rõ</span>) },
  ];
  const salesColumns: Column<Row>[] = [
    { key: "day", label: "Ngày UTC", render: (r) => formatDate(r.day) },
    { key: "metric", label: "Loại số liệu", render: (r) => label(r.metric) },
    { key: "currency", label: "Tiền tệ", render: (r) => str(r.currency) || "—" },
    { key: "value", label: "Số tiền", align: "right", render: (r) => money(num(r.value) ?? 0, str(r.currency)) },
    { key: "observed_at", label: "Đồng bộ", muted: true, render: (r) => relativeTime(r.observed_at) },
  ];

  return (
    <>
      <div className="ap-grid ap-grid-4">
        <Kpi icon="wallet" tone="lilac" label="Pro đang hiệu lực" value={formatNumber(count((r) => r.tier === "pro" && r.active === true))} note={`${pageNote} · đã xác minh với Google`} />
        <Kpi icon="wallet" tone="blue" label="Plus đang hiệu lực" value={formatNumber(count((r) => r.tier === "plus" && r.active === true))} note={`${pageNote} · theo quyền Play`} />
        <Kpi icon="heart" tone="mint" label="Gói hỗ trợ thủ công" value={formatNumber(grants.length)} note="Cấp bởi nhân sự, có hạn" />
        <Kpi icon="alert" tone="coral" label="Chưa xác định" value={formatNumber(count((r) => r.is_test === null || r.is_test === undefined))} note={`${pageNote} · chưa rõ license test`} />
      </div>

      <div className="ag-split">
        {data.financialAccess === true ? (
          <Card receipt eyebrow="Chỉ owner · ước tính" title="Doanh số Google Play" actions={<Chip tone="coral">Trước phí &amp; thuế</Chip>}>
            {groupList.length ? (
              <>
                <div className="ag-stat-row">
                  {groupList.map((g) => (
                    <div key={`${g.currency}|${g.metric}`}>
                      <p className="ag-money">{money(g.rows.reduce((s, r) => s + (num(r.value) ?? 0), 0), g.currency)}</p>
                      <span className="ap-card-note">{label(g.metric)} · {g.currency || "không rõ tiền tệ"}</span>
                    </div>
                  ))}
                </div>
                {series.length > 1 && <div className="ag-chart"><Bars values={series} label={`Doanh số ${label(main.metric)} theo ngày, ${main.currency}`} /><div className="ag-legend"><span><i />{label(main.metric)} · {main.currency || "không rõ tiền tệ"} theo từng ngày đồng bộ</span></div></div>}
              </>
            ) : <p className="ap-card-note">Chưa có dữ liệu doanh số trong kỳ.</p>}
            <p className="ap-card-note">Số tiền đã ghi nhận trong báo cáo sales, tách theo tiền tệ gốc. Chưa trừ đầy đủ phí/thuế, không phải tiền thực nhận và không dùng thay báo cáo kế toán. Không cộng các tiền tệ khác nhau.</p>
          </Card>
        ) : (
          <Card receipt eyebrow="Google Play" title="Quyền mua đã xác minh">
            <p className="ap-card-note">Gói hỗ trợ không phải thuê bao Google và không được tính doanh thu. Không sửa trạng thái Google Play bằng tay.</p>
          </Card>
        )}

        <Card receipt eyebrow="Quyền hỗ trợ" title="Cấp gói thủ công">
          {grants.length ? (
            <ul className="ag-grants">
              {grants.map((g, i) => (
                <li key={`${str(g.user_id)}-${i}`} className="ag-grant">
                  <span><b>{str(g.user_id) || "—"}</b><small className="ag-sub">đến {formatDate(g.expires_at)} · bởi {str(g.granted_by) || "—"}</small></span>
                  <Chip tone={tierTone[str(g.tier)] ?? "outline"}>{label(g.tier)}</Chip>
                </li>
              ))}
            </ul>
          ) : <p className="ap-card-note">Chưa có gói hỗ trợ nào đang hiệu lực.</p>}
          <p className="ap-card-note">Gói hỗ trợ không phải thuê bao Google và không được tính doanh thu. Không sửa trạng thái Google Play bằng tay.</p>
          {canGrant && (
            <AdminDialog title="Cấp gói hỗ trợ thủ công" trigger="Cấp gói cho người dùng" triggerClassName="ap-btn is-secondary">
              <form className="ap-form" action={mutateAdmin}>
                <input type="hidden" name="action" value="grant" />
                <input type="hidden" name="requestId" value={randomUUID()} />
                <fieldset disabled={!mfaVerified}>
                  <Field label="User ID"><input name="userId" required autoComplete="off" /></Field>
                  <Field label="Gói">
                    <select name="tier" defaultValue="plus"><option value="plus">Plus</option><option value="pro">Pro</option><option value="free">Thu hồi quyền hỗ trợ</option></select>
                  </Field>
                  <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
                  <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
                  <p className="ap-card-note">Quyền hỗ trợ có hiệu lực trong 30 ngày.</p>
                  <SubmitButton className="ap-btn">Lưu quyền hỗ trợ</SubmitButton>
                </fieldset>
              </form>
            </AdminDialog>
          )}
        </Card>
      </div>

      <Card receipt eyebrow="Google Play" title="Quyền mua đã xác minh">
        <Table columns={columns} rows={entitlements} caption="Quyền mua đã xác minh" rowKey={(r, i) => `${str(r.id)}-${str(r.product_id)}-${i}`} />
        {typeof data.total === "number" && <Pager p={p} total={total} base={base} />}
      </Card>

      {data.financialAccess === true && (
        <Card eyebrow="Chỉ owner" title="Doanh số theo ngày và tiền tệ">
          <Table columns={salesColumns} rows={sales} caption="Doanh số ước tính theo tiền tệ" rowKey={(r, i) => `${str(r.day)}-${str(r.metric)}-${str(r.currency)}-${i}`} />
        </Card>
      )}
      <Footnote p={p}>Số liệu chỉ gồm quyền Play còn hiệu lực trong 24 giờ; không dùng làm doanh thu.</Footnote>
    </>
  );
}
