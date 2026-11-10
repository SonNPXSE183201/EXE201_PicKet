import { DateField } from "../ui/date-field";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { SubmitButton } from "@/core/ui/submit-button";
import { AdminDialog } from "../components/admin-dialog";
import { accountAction, mutateAdmin } from "../actions";
import { AdminIcon } from "../ui/admin-icon";
import { AdminPager } from "../ui/admin-pager";
import { Button, Card, Chip, Drawer, Field, Person, Table, Timeline, formatDate, formatDateTime, formatNumber, relativeTime, toneFor, type ChipTone, type Column } from "../ui/paper";
import { can, label, num, rows, sectionHref, str, type Row, type ViewProps } from "./shared";
import "./views.css";

const PAGE_SIZE = 25;
const tierTone: Record<string, ChipTone> = { pro: "coral", plus: "lilac", free: "outline" };

/* Figma › Admin Web › 02 · Người dùng (147:5988) and Chi tiết (147:6408). */
export function UsersView(p: ViewProps) {
  const { data, query, page } = p;
  const users = rows(data.rows);
  const total = num(data.total) ?? users.length;
  const base = "/admin/users";
  const extraCount = ["createdFrom", "createdTo", "version"].filter((k) => query[k]).length;
  const selected = query.userId ? users.find((u) => str(u.id) === query.userId) : undefined;

  const columns: Column<Row>[] = [
    { key: "email", label: "Email", render: (u) => <Person name={identity(u)} sub={<span className="av-user-id">ID {str(u.id) || "—"}</span>} tone={toneFor(identity(u))} href={sectionHref(base, query, { userId: str(u.id) })} /> },
    { key: "created_at", label: "Ngày đăng ký", render: (u) => formatDate(u.created_at) },
    { key: "email_confirmed_at", label: "Email", render: (u) => (u.email_confirmed_at ? <Chip tone="success">Đã xác minh</Chip> : <Chip tone="warning">Chưa xác minh</Chip>) },
    { key: "last_activity_at", label: "Hoạt động gần nhất", muted: true, render: (u) => relativeTime(u.last_activity_at ?? u.last_sign_in_at) },
    { key: "app_version", label: "Phiên bản", render: (u) => str(u.app_version) || "—" },
    { key: "play_tier", label: "Gói Play", render: (u) => tierChip(u) },
    { key: "status", label: "Trạng thái", render: (u) => (isSuspended(u) ? <Chip tone="warning">Đang khoá</Chip> : <Chip tone="success">Hoạt động</Chip>) },
  ];

  return (
    <>
      <form className="ap-filter av-filter" method="get" aria-label="Lọc người dùng">
        {query.days && <input type="hidden" name="days" value={query.days} />}
        <Field label="Tìm kiếm" grow><input name="search" type="search" maxLength={160} defaultValue={query.search} placeholder="Email, số điện thoại hoặc User ID" /></Field>
        <Field label="Trạng thái" width={130}>
          <select name="status" defaultValue={query.status ?? ""}><option value="">Tất cả</option><option value="active">Hoạt động</option><option value="suspended">Đang khoá</option></select>
        </Field>
        <Field label="Gói hiệu lực" width={130}>
          <select name="tier" defaultValue={query.tier ?? ""}><option value="">Tất cả</option><option value="free">Free</option><option value="plus">Plus</option><option value="pro">Pro</option></select>
        </Field>
        <Field label="Sắp xếp" width={160}>
          <select name="sort" defaultValue={query.sort ?? "newest"}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="email">Email A–Z</option></select>
        </Field>
        <details className="av-more-filters">
          <summary className="ap-field"><span>Bộ lọc khác</span><span className="ap-input av-more-value">Ngày, phiên bản{extraCount ? ` (${extraCount})` : ""}<AdminIcon name="chevron-down" size={14} /></span></summary>
          <div className="av-more-panel">
            <Field label="Đăng ký từ"><DateField name="createdFrom" type="date" defaultValue={query.createdFrom} /></Field>
            <Field label="Đăng ký đến"><DateField name="createdTo" type="date" defaultValue={query.createdTo} /></Field>
            <Field label="Phiên bản quan sát"><input name="version" maxLength={40} defaultValue={query.version} placeholder="Ví dụ 1.0.9" /></Field>
          </div>
        </details>
        <div className="av-filter-actions">
          <button className="ap-btn" type="submit">Áp dụng</button>
          <Link className="ap-btn is-ghost" href={query.days ? `${base}?days=${query.days}` : base}>Xoá bộ lọc</Link>
        </div>
      </form>

      <Card receipt eyebrow={`${formatNumber(total)} tài khoản`} title="Danh sách người dùng"
        actions={can(p, "exports") ? <Button href="/admin/exports" variant="secondary" icon="download">Xuất CSV</Button> : undefined}>
        <Table columns={columns} rows={users} caption="Danh sách người dùng" selected={(u) => str(u.id) === query.userId} />
        <AdminPager base={base} query={query} page={page} total={total} pageSize={PAGE_SIZE} clear={["userId"]} />
      </Card>

      {query.userId && <UserDrawer p={p} user={selected} closeHref={sectionHref(base, query, { userId: undefined })} />}
    </>
  );
}

function UserDrawer({ p, user, closeHref }: { p: ViewProps; user?: Row; closeHref: string }) {
  const { data, mfaVerified, role } = p;
  const userId = p.query.userId ?? "";
  const name = user ? identity(user) : userId;
  const timeline = rows(data.timeline);
  const recentTimeline = timeline.slice(0, 8);
  const tickets = rows(data.tickets);
  const quota = rows(data.quota);
  const canGrant = ["owner", "operations"].includes(role ?? "");
  return (
    <Drawer title="Chi tiết người dùng" closeHref={closeHref}>
      <div className="av-profile">
        <span className={`ap-avatar ap-tone-${toneFor(name)}`}>{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <b>{name}</b>
          <small className="av-user-id">User ID {userId || "—"}{user?.created_at ? ` · đăng ký ${formatDate(user.created_at)}` : ""}</small>
          {user && (
            <span className="ap-row" style={{ gap: 6, marginTop: 6 }}>
              {user.email_confirmed_at ? <Chip tone="success">Đã xác minh</Chip> : <Chip tone="warning">Chưa xác minh</Chip>}
              {str(user.play_tier) && str(user.play_tier) !== "free" && <Chip tone="coral">{label(user.play_tier)} · Google Play</Chip>}
              {str(user.payos_tier) && <Chip tone="lilac">{label(user.payos_tier)} · PayOS</Chip>}
              {str(user.grant) && <Chip tone="lilac">Gói hỗ trợ {label(user.grant)}</Chip>}
              {str(user.app_version) && <Chip tone="outline">Android {str(user.app_version)}</Chip>}
              {isSuspended(user) && <Chip tone="warning">Khoá đến {formatDate(user.banned_until)}</Chip>}
            </span>
          )}
        </div>
      </div>

      <Card receipt eyebrow="Lịch sử tài khoản" compact>
        {timeline.length
          ? <><Timeline items={recentTimeline.map((t, i) => ({ title: str(t.reason) || label(t.action), meta: formatDateTime(t.created_at), color: i === 0 ? "var(--ap-mauve)" : i === 1 ? "var(--ap-success)" : "var(--ap-muted)" }))} />{timeline.length > recentTimeline.length && <p className="ap-card-note">Đang hiển thị {recentTimeline.length} sự kiện gần nhất. <Link href="/admin/audit">Mở Nhật ký hoạt động</Link> để xem lịch sử đầy đủ.</p>}</>
          : <p className="ap-card-note">Chưa có sự kiện quản trị. Phiên bản/hoạt động có thể thiếu nếu người dùng chưa đồng ý đo lường.</p>}
        {tickets.length > 0 && (
          <>
            <hr className="ap-divider" />
            <span className="ap-eyebrow">Yêu cầu hỗ trợ</span>
            {tickets.map((t) => <span key={str(t.id)} className="ap-row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: 13 }}>{str(t.title)}</b><Chip tone="warning">{label(t.status)}</Chip></span>)}
          </>
        )}
        {quota.length > 0 && (
          <p className="ap-card-note">OCR trong kỳ: {formatNumber(quota.reduce((s, q) => s + (num(q.attempts) ?? 0), 0))} lượt · {formatNumber(quota.reduce((s, q) => s + (num(q.successful) ?? 0), 0))} thành công</p>
        )}
      </Card>

      <Card eyebrow="Thao tác quản trị" compact flat>
        {canGrant && (
          <AdminDialog title="Cấp gói hỗ trợ" trigger="Cấp gói hỗ trợ" triggerClassName="ap-btn is-secondary">
            <form className="ap-form" action={mutateAdmin}>
              <input type="hidden" name="action" value="grant" />
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="requestId" value={randomUUID()} />
              <fieldset disabled={!mfaVerified}>
                <div className="av-inline">
                  <Field label="Gói hỗ trợ" grow>
                    <select name="tier" defaultValue="plus"><option value="plus">Plus · 30 ngày</option><option value="pro">Pro · 30 ngày</option><option value="free">Thu hồi gói hỗ trợ</option></select>
                  </Field>
                  <SubmitButton className="ap-btn is-coral">Cấp gói</SubmitButton>
                </div>
                <Field label="Lý do (bắt buộc, được ghi vào nhật ký)"><input name="reason" required minLength={5} maxLength={500} placeholder="Ví dụ: hỗ trợ khách bị trừ tiền 2 lần" /></Field>
                <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
              </fieldset>
            </form>
          </AdminDialog>
        )}
        {canGrant && <hr className="ap-divider" />}
        <details className="av-danger">
          <summary>
            <span><b>Khoá tài khoản</b><small>Người dùng sẽ bị đăng xuất khỏi mọi thiết bị.</small></span>
            <span className="ap-btn is-danger">Khoá tài khoản</span>
          </summary>
          <form className="ap-form" action={accountAction}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="requestId" value={randomUUID()} />
            <fieldset disabled={!mfaVerified}>
              <Field label="Hành động">
                <select name="action" defaultValue={user && isSuspended(user) ? "restore" : "suspend"}>
                  <option value="suspend">Khoá tài khoản</option>
                  <option value="restore">Mở khoá tài khoản</option>
                  <option value="reset_password">Gửi hướng dẫn đặt lại mật khẩu</option>
                </select>
              </Field>
              <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
              <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
              <SubmitButton className="ap-btn is-danger">Thực hiện</SubmitButton>
            </fieldset>
          </form>
          <form className="ap-form" action={mutateAdmin}>
            <input type="hidden" name="action" value="revoke_sessions" />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="requestId" value={randomUUID()} />
            <fieldset disabled={!mfaVerified}>
              <hr className="ap-divider" />
              <span className="ap-eyebrow">Thu hồi các phiên hiện có</span>
              <p className="ap-card-note">API sẽ từ chối các phiên hiện tại. Người dùng có thể đăng nhập lại để tạo phiên mới.</p>
              <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
              <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
              <SubmitButton className="ap-btn is-secondary">Thu hồi phiên</SubmitButton>
            </fieldset>
          </form>
        </details>
      </Card>
    </Drawer>
  );
}

const identity = (u: Row) => str(u.email) || str(u.phone) || str(u.id);
const isSuspended = (u: Row) => Boolean(u.banned_until) && Date.parse(str(u.banned_until)) > Date.now();
function tierChip(u: Row) {
  const tier = str(u.play_tier) || str(u.payos_tier) || str(u.grant) || "free";
  return <Chip tone={tierTone[tier] ?? "outline"}>{label(tier)}</Chip>;
}
