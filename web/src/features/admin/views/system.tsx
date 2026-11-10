import Link from "next/link";
import { randomUUID } from "node:crypto";
import { SubmitButton } from "@/core/ui/submit-button";
import { mutateAdmin } from "../actions";
import { AdminIcon } from "../ui/admin-icon";
import { AdminPager } from "../ui/admin-pager";
import { Button, Card, Chip, Field, Person, Table, Tile, display, formatDateTime, formatNumber, relativeTime, toneFor, type ChipTone, type Column } from "../ui/paper";
import { can, componentInfo, label, num, object, rows, str, statusTone, type Row, type ViewProps } from "./shared";
import { AsOf, Pager } from "./operations";
import "./ops-content-system.css";

const SOURCE_NAMES: Record<string, string> = { google_play: "Google Play Console", apk_access: "Máy chủ APK", landing_analytics: "Landing analytics", ocr_provider: "Nhà cung cấp OCR" };
const SOURCE_ICONS: Record<string, { icon: string; tone: "coral" | "mint" | "blue" | "lilac" | "cream" }> = {
  google_play: { icon: "wallet", tone: "mint" }, apk_access: { icon: "download", tone: "blue" }, landing_analytics: { icon: "eye", tone: "lilac" }, ocr_provider: { icon: "receipt", tone: "coral" },
};
const sourceName = (k: unknown) => SOURCE_NAMES[str(k)] ?? componentInfo[str(k)]?.name ?? label(k);
const sourceIcon = (k: unknown) => SOURCE_ICONS[str(k)] ?? { icon: componentInfo[str(k)]?.icon ?? "grid", tone: componentInfo[str(k)]?.tone ?? "cream" };
const INTEGRATION_PAGE_SIZE = 5;

/* Figma › Admin Web › 19 · Nguồn dữ liệu (153:7841). */
export function IntegrationsView(p: ViewProps) {
  const { data, query } = p;
  const sources = rows(data.rows);
  const requestedPage = /^\d{1,5}$/.test(query.integrationPage ?? "") ? Number(query.integrationPage) : 0;
  const pageCount = Math.max(1, Math.ceil(sources.length / INTEGRATION_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount - 1);
  const visibleSources = sources.slice(page * INTEGRATION_PAGE_SIZE, (page + 1) * INTEGRATION_PAGE_SIZE);
  const columns: Column<Row>[] = [
    { key: "source", label: "Nguồn", render: (r) => { const i = sourceIcon(r.source); return <span className="ap-row" style={{ flexWrap: "nowrap" }}><Tile icon={i.icon} tone={i.tone} /><b>{sourceName(r.source)}</b></span>; } },
    { key: "status", label: "Trạng thái", render: (r) => <Chip tone={statusTone(r.status)}>{label(r.status)}</Chip> },
    { key: "message", label: "Thông tin", muted: true, render: (r) => str(r.message) || "—" },
    { key: "updated_at", label: "Lần thử gần nhất", align: "right", render: (r) => relativeTime(r.updated_at) },
    { key: "last_success_at", label: "Thành công gần nhất", align: "right", render: (r) => relativeTime(r.last_success_at) },
  ];
  return (
    <>
      <section className="ao-sources" aria-label="Nguồn dữ liệu">
        {sources.length ? sources.map((r, i) => {
          const icon = sourceIcon(r.source), status = str(r.status);
          return (
            <article key={str(r.source) || i} className={`ap-card ao-source${["error", "failed", "down"].includes(status) ? " is-attention" : ""}`}>
              <Tile icon={icon.icon} tone={icon.tone} />
              <h2>{sourceName(r.source)}</h2>
              <Chip tone={statusTone(status)}>{label(status)}</Chip>
              <p>Thử gần nhất: {relativeTime(r.updated_at)}</p>
            </article>
          );
        }) : <p className="ap-card-note">Chưa có nguồn dữ liệu nào.</p>}
      </section>
      <Card receipt eyebrow="Lịch sử đồng bộ" title="Tình trạng đồng bộ"
        note="Giữ ngày và timezone của nguồn. Báo cáo Play có thể trễ 3–7 ngày và được điều chỉnh lại.">
        <Table columns={columns} rows={visibleSources} caption="Đồng bộ nguồn" rowKey={(r, i) => `${str(r.source)}-${page * INTEGRATION_PAGE_SIZE + i}`} />
        <AdminPager base="/admin/integrations" query={query} page={page} total={sources.length} pageSize={INTEGRATION_PAGE_SIZE} pageParam="integrationPage" />
      </Card>
      <AsOf data={data} />
    </>
  );
}

const ACTIONS: Record<string, string> = {
  grant: "Cấp gói hỗ trợ", comment: "Ghi chú ticket", incident: "Sự cố", suspend: "Khoá tài khoản", restore: "Mở khoá tài khoản", reset_password: "Đặt lại mật khẩu",
  revoke_sessions: "Thu hồi phiên", settings: "Đổi cấu hình", staff: "Đổi vai trò", review_content: "Review nội dung", content: "Nội dung", partner: "Đối tác", release: "Phiên bản", ticket: "Yêu cầu hỗ trợ",
};
const actionTone = (a: string): ChipTone => (["suspend", "revoke_sessions"].includes(a) ? "warning" : ["grant", "settings", "staff"].includes(a) ? "coral" : ["incident"].includes(a) ? "warning" : "outline");
function summarize(details: unknown) {
  const o = object(details);
  const parts = Object.entries(o).map(([k, v]) => (Array.isArray(v) ? `${k} ${v.map((x) => display(x)).join(" → ")}` : `${k} ${display(v)}`));
  return parts.join(" · ");
}

/* Figma › Admin Web › 20 · Nhật ký hoạt động (154:7752). */
export function AuditView(p: ViewProps) {
  const { data, query, page, days } = p;
  const base = "/admin/audit";
  const entries = rows(data.rows);
  const total = num(data.total) ?? entries.length;
  const columns: Column<Row>[] = [
    { key: "created_at", label: "Thời gian", render: (r) => formatDateTime(r.created_at) },
    { key: "actor", label: "Người thực hiện", render: (r) => { const a = str(r.actor) === "system" ? "Hệ thống" : str(r.actor) || "—"; return <Person name={a} tone={toneFor(a)} />; } },
    { key: "action", label: "Thao tác", render: (r) => <Chip tone={actionTone(str(r.action))}>{ACTIONS[str(r.action)] ?? label(r.action)}</Chip> },
    { key: "target", label: "Đối tượng", render: (r) => <span className="ao-target"><b>{str(r.target) || "—"}</b>{r.details ? <small title="Trước / sau (đã giới hạn dữ liệu)">{summarize(r.details)}</small> : null}</span> },
    { key: "reason", label: "Lý do", muted: true, render: (r) => str(r.reason) || "—" },
    { key: "request_id", label: "Mã yêu cầu", render: (r) => <small className="ao-mono">{str(r.request_id) || "—"}</small> },
  ];
  return (
    <>
      <form className="ap-filter" method="get" aria-label="Lọc nhật ký">
        <input type="hidden" name="days" value={days} />
        <Field label="Tìm kiếm" grow><input name="search" type="search" maxLength={160} defaultValue={query.search} placeholder="Tiêu đề hoặc thao tác" /></Field>
        <div className="ao-filter-actions">
          <button className="ap-btn" type="submit">Áp dụng</button>
          <Link className="ap-btn is-ghost" href={`${base}?days=${days}`}>Xoá bộ lọc</Link>
        </div>
      </form>
      <Card receipt eyebrow={`${formatNumber(total)} thao tác · không thể sửa hay xoá`} title="Nhật ký quản trị"
        actions={can(p, "exports") ? <Button href="/admin/exports" variant="secondary" icon="download">Xuất CSV</Button> : undefined}>
        <Table columns={columns} rows={entries} caption="Nhật ký quản trị" rowKey={(r, i) => `${str(r.id)}-${i}`} />
        <p className="ap-footnote"><AdminIcon name="lock" size={14} />Trước / sau được giới hạn dữ liệu, không lưu thông tin tài chính của người dùng.</p>
        <Pager base={base} query={query} page={page} total={data.total} />
      </Card>
      <AsOf data={data} />
    </>
  );
}

const ROLES = [
  { key: "owner", note: "Toàn quyền, cấu hình lưu trữ", tone: "lilac" },
  { key: "operations", note: "Sức khoẻ, sự cố, phiên bản", tone: "blue" },
  { key: "support", note: "Người dùng, ticket, gói", tone: "mint" },
  { key: "analyst", note: "Tăng trưởng, OCR", tone: "coral" },
  { key: "content", note: "Bài học, đối tác", tone: "lilac" },
] as const;
const roleTone: Record<string, ChipTone> = { owner: "coral", operations: "outline", support: "outline", analyst: "outline", content: "outline" };
const shortId = (id: unknown) => { const s = str(id).replace(/-/g, ""); return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-3)}` : s || "—"; };

/* Figma › Admin Web › 21 · Nhân sự và quyền (154:8057). */
export function StaffView(p: ViewProps) {
  const { data, query, page, mfaVerified } = p;
  const staff = rows(data.rows);
  const count = (role: string) => staff.filter((s) => str(s.role) === role).length;
  const columns: Column<Row>[] = [
    { key: "email", label: "Thành viên", render: (r) => <Person name={str(r.email) || str(r.user_id)} tone={toneFor(str(r.email))} /> },
    { key: "user_id", label: "User ID", muted: true, render: (r) => <span title={str(r.user_id)}>{shortId(r.user_id)}</span> },
    { key: "role", label: "Vai trò", render: (r) => <Chip tone={roleTone[str(r.role)] ?? "outline"}>{label(r.role)}</Chip> },
    { key: "mfa", label: "MFA", render: (r) => (typeof r.mfa === "boolean" ? <Chip tone={r.mfa ? "success" : "warning"}>{r.mfa ? "Đã bật" : "Chưa bật"}</Chip> : "—") },
  ];
  return (
    <>
      <div className="ao-split ao-staff">
        <div className="ap-stack">
          <section className="ao-roles" aria-label="Số người theo vai trò">
            {ROLES.map((r) => (
              <article key={r.key} className={`ao-role ap-tone-${r.tone}`}>
                <strong>{formatNumber(count(r.key))}</strong>
                <b>{label(r.key)}</b>
                <small>{r.note}</small>
              </article>
            ))}
          </section>
          <Card receipt eyebrow={`${formatNumber(num(data.total) ?? staff.length)} người`} title="Thành viên quản trị">
            <Table columns={columns} rows={staff} caption="Thành viên quản trị" rowKey={(r, i) => `${str(r.user_id)}-${i}`} />
            <Pager base="/admin/staff" query={query} page={page} total={data.total} />
          </Card>
        </div>
        <Card eyebrow="Chỉ chủ sở hữu" title="Cấp hoặc thay đổi vai trò">
          <form className="ap-form" action={mutateAdmin}>
            <input type="hidden" name="action" value="staff" />
            <input type="hidden" name="requestId" value={randomUUID()} />
            <fieldset disabled={!mfaVerified}>
              <Field label="User ID"><input name="userId" required placeholder="UUID của người được cấp quyền" /></Field>
              <Field label="Vai trò">
                <select name="role" defaultValue="support">
                  {["owner", "operations", "support", "analyst", "content", "remove"].map((r) => <option key={r} value={r}>{label(r)}</option>)}
                </select>
              </Field>
              <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} /></Field>
              <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
              <SubmitButton className="ap-btn is-block">Lưu quyền</SubmitButton>
            </fieldset>
            <p className="ap-footnote"><AdminIcon name="shield" size={14} />Không thể gỡ owner cuối cùng. Thay đổi có hiệu lực ở lần kiểm tra quyền tiếp theo, gồm cả mobile.</p>
          </form>
        </Card>
      </div>
      <AsOf data={data} />
    </>
  );
}

/* Figma › Admin Web › 22 · Cấu hình ứng dụng (154:8341). */
export function SettingsView(p: ViewProps) {
  const { data, mfaVerified, role } = p;
  const s = object(data.settings);
  const owner = role === "owner";
  return (
    <>
      <form className="ap-form" action={mutateAdmin}>
        <input type="hidden" name="action" value="settings" />
        <input type="hidden" name="expectedVersion" value={Number(s.row_version ?? 1)} />
        <input type="hidden" name="requestId" value={randomUUID()} />
        <fieldset className="ao-settings" disabled={!mfaVerified}>
          <div className="ap-stack ao-settings-main">
            <Card eyebrow="Bảo trì và thông báo hệ thống" title="Chế độ bảo trì"
              actions={<label className="ap-switch"><input type="checkbox" name="maintenance" defaultChecked={s.maintenance === true} aria-label="Bật bảo trì" /><span /></label>}>
              <Field label="Thông báo hiển thị trong app"><textarea name="notice" rows={3} maxLength={1000} defaultValue={str(s.notice)} /></Field>
              <p className="ao-warn"><AdminIcon name="alert" size={18} />Bảo trì tác động người dùng thật. Thực hiện theo lịch vận hành đã thống nhất.</p>
            </Card>
            <Card eyebrow="Giám sát" title="Ngưỡng probe & cảnh báo">
              <div className="ao-fields-3">
                <Field label="Cảnh báo khi đĩa dùng đến (%)"><input name="diskWarningPercent" type="number" min="60" max="99" defaultValue={Number(s.disk_warning_percent ?? 85)} required /></Field>
                <Field label="Timeout mỗi probe (giây)"><input name="probeTimeoutSeconds" type="number" min="2" max="20" defaultValue={Number(s.probe_timeout_seconds ?? 8)} required /></Field>
                <Field label="Đánh dấu probe quá hạn sau (phút)"><input name="staleMinutes" type="number" min="5" max="60" defaultValue={Number(s.stale_minutes ?? 15)} required /></Field>
              </div>
            </Card>
          </div>
          <div className="ap-stack ao-settings-side">
            <Card eyebrow="Chỉ chủ sở hữu" title="Thời hạn lưu thống kê">
              <fieldset className="ao-inner" disabled={!owner}>
                <div className="ao-fields-2">
                  <Field label="Sự kiện chi tiết (ngày)"><input name="analyticsRetentionDays" type="number" min="30" max="90" defaultValue={Number(s.analytics_retention_days ?? 90)} required /></Field>
                  <Field label="Thống kê tổng hợp (tháng)"><input name="aggregateRetentionMonths" type="number" min="3" max="13" defaultValue={Number(s.aggregate_retention_months ?? 13)} required /></Field>
                </div>
                <p className="ap-card-note">Chỉ cho phép trong giới hạn privacy hiện hành. Rút ngắn thời hạn sẽ xoá dữ liệu chi tiết cũ ở lần chạy worker kế tiếp; không thể lấy lại bằng cách tăng lại giá trị.</p>
              </fieldset>
            </Card>
            <Card receipt eyebrow="Xác nhận thay đổi">
              <Field label="Lý do"><input name="reason" required minLength={5} maxLength={500} placeholder="Ví dụ: giảm báo động giả do probe chậm" /></Field>
              <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
              <SubmitButton className="ap-btn is-block">Lưu cấu hình</SubmitButton>
              <p className="ap-card-note">Phiên bản cấu hình hiện tại: v{formatNumber(num(s.row_version) ?? 1)}</p>
            </Card>
          </div>
        </fieldset>
      </form>
      <AsOf data={data} />
    </>
  );
}
