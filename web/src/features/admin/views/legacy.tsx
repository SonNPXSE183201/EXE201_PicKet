import Link from "next/link";
import { randomUUID } from "node:crypto";
import { SubmitButton } from "@/core/ui/submit-button";
import {
  adminSections,
  canViewAdminSection,
  type AdminSection,
} from "../admin-permissions";
import type { ViewProps } from "./shared";
import { mutateAdmin, accountAction } from "../actions";
import { AdminRecordForm } from "../components/admin-record-form";
import { adminLabel } from "../admin-labels";
import "../admin-platform.css";

type Row = Record<string, unknown>;
type Document = Record<string, unknown>;
const rows = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.filter((r): r is Row => Boolean(r) && typeof r === "object")
    : [];
const object = (v: unknown): Row =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {};
function text(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number")
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(
      value,
    );
  if (typeof value === "object") return JSON.stringify(value);
  const raw = String(value);
  if (/^\d{4}-\d\d-\d\dT/.test(raw) && !Number.isNaN(Date.parse(raw)))
    return new Date(raw).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  return adminLabel(raw);
}
const columns: Record<string, Record<string, string>> = {
  users: {
    phone: "Số điện thoại",
    email: "Email cũ",
    created_at: "Ngày đăng ký",
    email_confirmed_at: "Xác minh email",
    last_sign_in_at: "Đăng nhập gần nhất",
    last_activity_at: "Hoạt động quan sát gần nhất",
    app_version: "Phiên bản quan sát",
    banned_until: "Khóa đến",
    role: "Quyền quản trị",
    play_tier: "Gói Play",
    payos_tier: "Gói PayOS",
    grant: "Gói hỗ trợ",
  },
  billing: {
    user_id: "Người dùng",
    product_id: "Sản phẩm",
    tier: "Gói",
    active: "Đang hiệu lực",
    expires_at: "Hết hạn",
    verified_at: "Xác minh gần nhất",
    is_test: "License test (trống = chưa rõ)",
    subscription_state: "Trạng thái Google",
    acknowledgement_state: "Acknowledgement",
  },
  ocr: {
    day: "Ngày",
    scans: "Lượt xử lý",
    successful: "Thành công",
    average_ms: "Trung bình (ms)",
    p95_ms: "p95 (ms)",
  },
  audit: {
    created_at: "Thời gian",
    actor: "Người thực hiện",
    action: "Thao tác",
    target: "Đối tượng",
    reason: "Lý do",
    request_id: "Mã yêu cầu",
    details: "Trước / sau (đã giới hạn dữ liệu)",
  },
  health: {
    component: "Thành phần",
    status: "Trạng thái",
    latency_ms: "Độ trễ (ms)",
    message: "Thông tin",
    checked_at: "Kiểm tra gần nhất",
  },
  integrations: {
    source: "Nguồn",
    status: "Trạng thái",
    message: "Thông tin",
    updated_at: "Lần thử gần nhất",
    last_success_at: "Thành công gần nhất",
  },
  staff: { email: "Email", user_id: "User ID", role: "Vai trò" },
  tickets: {
    title: "Tiêu đề",
    status: "Trạng thái",
    priority: "Ưu tiên",
    target_user: "Người dùng",
    assignee: "Người xử lý",
    updated_at: "Cập nhật",
  },
  incidents: { title: "Sự cố", status: "Trạng thái", updated_at: "Cập nhật" },
  releases: {
    title: "Phiên bản",
    status: "Trạng thái",
    details: "Thông tin bản phát hành",
    updated_at: "Cập nhật",
  },
  content: { title: "Nội dung", status: "Trạng thái", updated_at: "Cập nhật" },
  partners: {
    title: "Tiêu đề",
    url: "Liên kết",
    active: "Hiển thị",
    starts_at: "Bắt đầu",
    ends_at: "Kết thúc",
  },
};
function DataTable({
  data,
  fields,
  caption,
}: {
  data: Row[];
  fields: Record<string, string>;
  caption: string;
}) {
  return data.length ? (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {Object.entries(fields).map(([key, label]) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              {Object.keys(fields).map((key) => (
                <td key={key} data-label={fields[key]}>
                  {key === "email" && row.id ? (
                    <Link
                      href={`/admin/users?userId=${encodeURIComponent(String(row.id))}`}
                    >
                      {text(row[key])}
                    </Link>
                  ) : (
                    text(row[key])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty-state">Chưa có dữ liệu phù hợp trong kỳ này.</p>
  );
}
function Kpi({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: unknown;
  note?: string;
  href?: string;
}) {
  return (
    <article className="admin-kpi">
      <span>{href ? <Link href={href}>{label}</Link> : label}</span>
      <strong>{text(value)}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
function DailyChart({ data }: { data: Row[] }) {
  const max = Math.max(1, ...data.map((r) => Number(r.value) || 0));
  return (
    <section className="admin-panel">
      <h2>Người dùng đăng ký theo ngày</h2>
      {!data.length ? (
        <p>Chưa có lượt đăng ký trong kỳ.</p>
      ) : (
        <>
          <svg
            className="admin-chart"
            viewBox="0 0 700 160"
            role="img"
            aria-label="Biểu đồ người dùng đăng ký; số liệu chi tiết trong bảng bên dưới"
          >
            {data.map((r, i) => (
              <rect
                key={i}
                x={(i * 700) / data.length + 2}
                y={150 - (Number(r.value) / max) * 135}
                width={Math.max(1, 700 / data.length - 4)}
                height={(Number(r.value) / max) * 135}
                rx="3"
              >
                <title>{`${text(r.day)}: ${text(r.value)}`}</title>
              </rect>
            ))}
          </svg>
          <details>
            <summary>Xem số liệu dạng bảng</summary>
            <DataTable
              data={data}
              fields={{ day: "Ngày", value: "Người đăng ký" }}
              caption="Đăng ký theo ngày"
            />
          </details>
        </>
      )}
    </section>
  );
}
function Acquisition({
  data,
  engagement,
}: {
  data: Document;
  engagement: boolean;
}) {
  const events = rows(data.events),
    metrics = rows(data.metrics),
    integrations = rows(data.integrations),
    activity = object(data.activity);
  const total = (event: string, key: string) =>
    data.firstObservedAt
      ? events
          .filter((r) => r.event === event)
          .reduce((sum, r) => sum + (Number(r[key]) || 0), 0)
      : undefined;
  const play = metrics.filter(
    (r) =>
      r.source === "google_play_installs" &&
      r.metric === "Daily Device Installs",
  );
  const apk = metrics.filter(
    (r) => r.source === "apk_access" && r.metric === "served_requests",
  );
  return (
    <>
      <div className="admin-kpis">
        {engagement ? (
          <>
            <Kpi
              label="DAU"
              value={data.firstObservedAt ? activity.dau : undefined}
              note="Người có hoạt động ý nghĩa trong 24 giờ"
            />
            <Kpi
              label="WAU"
              value={data.firstObservedAt ? activity.wau : undefined}
            />
            <Kpi
              label="MAU"
              value={data.firstObservedAt ? activity.mau : undefined}
            />
            <Kpi
              label="First-open quan sát được"
              value={total("first_open", "events")}
            />
          </>
        ) : (
          <>
            <Kpi
              label="Lượt xem landing"
              value={total("landing_view", "events")}
            />
            <Kpi
              label="Phiên landing theo ngày"
              value={total("landing_view", "sessions")}
            />
            <Kpi
              label="Lượt bấm tải APK"
              value={total("apk_click", "events")}
            />
            <Kpi
              label="Lượt phục vụ file APK"
              value={
                apk.length
                  ? apk.reduce((s, r) => s + Number(r.value), 0)
                  : undefined
              }
            />
            <Kpi
              label="Play: thiết bị cài trong kỳ"
              value={
                play.length
                  ? play.reduce((s, r) => s + Number(r.value), 0)
                  : undefined
              }
              note="Metric Daily Device Installs; dữ liệu có độ trễ"
            />
          </>
        )}
      </div>
      <p className="admin-notice">
        “—” nghĩa là chưa có nguồn đo. Lượt bấm, lượt phục vụ file và lượt cài
        Play là các số liệu khác nhau. Không cộng thành số người cài. Không thu
        thập được lịch sử trước khi bật đo lường.
      </p>
      {engagement && (
        <>
          <section className="admin-panel">
            <h2>Hành trình sử dụng</h2>
            <p>
              Số tài khoản đăng ký/xác minh và người có hoạt động quan sát được
              trong kỳ. Chỉ số hoạt động chỉ gồm người đồng ý chia sẻ; không coi
              đây là tỷ lệ chuyển đổi đầy đủ.
            </p>
            <div className="admin-kpis">
              <Kpi
                label="Đăng ký trong kỳ"
                value={object(data.funnel).registered}
              />
              <Kpi label="Đã xác minh" value={object(data.funnel).verified} />
              <Kpi
                label="Hoạt động quan sát được"
                value={
                  data.firstObservedAt
                    ? object(data.funnel).observedActive
                    : undefined
                }
              />
            </div>
          </section>
          <section className="admin-panel">
            <h2>Quay lại sử dụng D1 / D7 / D30</h2>
            <p>
              Cohort bắt đầu ở first-open quan sát được sau khi đồng ý thống kê.
              Chỉ tính cohort đã đủ tuổi; không đại diện toàn bộ lượt cài.
            </p>
            <DataTable
              data={rows(data.retention)}
              fields={{
                day: "Ngày quay lại",
                eligible: "Đủ thời gian theo dõi",
                retained: "Có thao tác thành công",
              }}
              caption="Retention quan sát được"
            />
          </section>
          <section className="admin-panel">
            <h2>Phiên bản đang được dùng</h2>
            <p>
              Mỗi tài khoản được tính ở phiên bản quan sát gần nhất trong kỳ.
            </p>
            <DataTable
              data={rows(data.versions)}
              fields={{
                version: "Phiên bản",
                users: "Tài khoản quan sát được",
              }}
              caption="Phân bố phiên bản"
            />
          </section>
        </>
      )}
      <section className="admin-panel">
        <h2>Sự kiện quan sát được</h2>
        <p>
          Giờ Việt Nam. Traffic quản trị được loại khi xác định được; chỉ đo
          trên phiên đồng ý analytics.
        </p>
        <DataTable
          data={events}
          fields={{
            day: "Ngày",
            event: "Sự kiện",
            channel: "Kênh",
            events: "Số lượt",
            sessions: "Phiên",
            users: "Tài khoản",
          }}
          caption="Sự kiện theo ngày"
        />
      </section>
      <section className="admin-panel">
        <h2>Báo cáo từ nguồn ngoài</h2>
        <p>
          Giữ ngày và timezone của nguồn. Báo cáo Play có thể trễ 3–7 ngày và
          được điều chỉnh lại.
        </p>
        <DataTable
          data={metrics}
          fields={{
            day: "Ngày nguồn",
            source: "Nguồn",
            metric: "Chỉ số gốc",
            value: "Giá trị",
            source_timezone: "Timezone nguồn",
            observed_at: "Đồng bộ gần nhất",
          }}
          caption="Số liệu từ nguồn ngoài"
        />
      </section>
      <section className="admin-panel">
        <h2>Tình trạng đồng bộ</h2>
        <DataTable
          data={integrations}
          fields={columns.integrations}
          caption="Đồng bộ nguồn"
        />
      </section>
    </>
  );
}
function SettingsForm({
  data,
  disabled,
  owner,
}: {
  data: Document;
  disabled: boolean;
  owner: boolean;
}) {
  const settings = object(data.settings);
  return (
    <form className="finance-form admin-panel" action={mutateAdmin}>
      <input type="hidden" name="action" value="settings" />
      <input
        type="hidden"
        name="expectedVersion"
        value={Number(settings.row_version ?? 1)}
      />
      <input type="hidden" name="requestId" value={randomUUID()} />
      <fieldset disabled={disabled}>
        <legend>Bảo trì và thông báo hệ thống</legend>
        <fieldset disabled={!owner}>
          <legend>Thời hạn lưu thống kê · chỉ owner</legend>
          <p>
            Chỉ cho phép trong giới hạn privacy hiện hành. Rút ngắn thời hạn sẽ
            xóa dữ liệu chi tiết cũ ở lần chạy worker kế tiếp; không thể lấy lại
            bằng cách tăng lại giá trị.
          </p>
          <label>
            Sự kiện chi tiết (ngày)
            <input
              name="analyticsRetentionDays"
              type="number"
              min="30"
              max="90"
              defaultValue={Number(settings.analytics_retention_days ?? 90)}
              required
            />
          </label>
          <label>
            Thống kê tổng hợp (tháng)
            <input
              name="aggregateRetentionMonths"
              type="number"
              min="3"
              max="13"
              defaultValue={Number(settings.aggregate_retention_months ?? 13)}
              required
            />
          </label>
        </fieldset>
        <label>
          Cảnh báo khi đĩa dùng đến (%)
          <input
            name="diskWarningPercent"
            type="number"
            min="60"
            max="99"
            defaultValue={Number(settings.disk_warning_percent ?? 85)}
            required
          />
        </label>
        <label>
          Timeout mỗi probe (giây)
          <input
            name="probeTimeoutSeconds"
            type="number"
            min="2"
            max="20"
            defaultValue={Number(settings.probe_timeout_seconds ?? 8)}
            required
          />
        </label>
        <label>
          Đánh dấu probe quá hạn sau (phút)
          <input
            name="staleMinutes"
            type="number"
            min="5"
            max="60"
            defaultValue={Number(settings.stale_minutes ?? 15)}
            required
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="maintenance"
            defaultChecked={settings.maintenance === true}
          />
          Bật bảo trì
        </label>
        <label>
          Thông báo
          <textarea
            name="notice"
            rows={4}
            maxLength={1000}
            defaultValue={String(settings.notice ?? "")}
          />
        </label>
        <p>
          Bảo trì tác động người dùng thật. Thực hiện theo lịch vận hành đã
          thống nhất.
        </p>
        <label>
          Lý do
          <input name="reason" required minLength={5} maxLength={500} />
        </label>
        <label>
          Nhập SAVE để xác nhận
          <input name="confirmation" pattern="SAVE" required />
        </label>
        <SubmitButton className="button primary">Lưu cấu hình</SubmitButton>
      </fieldset>
    </form>
  );
}
/** Previous admin rendering, kept only for sections not yet moved to the Paper design. */
export function LegacyBody({ section, data, query, role, permissions, mfaVerified, days, page }: ViewProps) {
  void days;
  const records = rows(data.rows).map((r) =>
    section === "health" &&
    Date.parse(String(data.asOf)) - Date.parse(String(r.checked_at)) >
      Number(data.staleMinutes ?? 15) * 60000
      ? { ...r, status: "stale" }
      : r,
  );
  const recordAction = (
    {
      tickets: "ticket",
      incidents: "incident",
      releases: "release",
      content: "content",
      partners: "partner",
    } as Record<string, string>
  )[section];
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value && !["page", "done", "error"].includes(key))
      params.set(key, value);
  const pagination = (n: number) =>
    `${adminSections[section].href}?${new URLSearchParams({ ...Object.fromEntries(params), page: String(n) })}`;
  return (
    <main className="admin-platform" id="main-content">
      <header className="admin-platform-header">
        <div>
          <h1>{adminSections[section].title}</h1>
          <p>
            Quản trị Picket · {adminLabel(role ?? "")} · Dữ liệu theo quyền truy
            cập
          </p>
        </div>
        <Link className="button secondary" href="/admin/security">
          Bảo mật & MFA
        </Link>
      </header>
      {!mfaVerified && (
        <p className="admin-notice">
          Bạn đang ở chế độ đọc.{" "}
          <Link href="/admin/security">Xác minh MFA</Link> để thực hiện thay đổi
          hoặc xuất dữ liệu.
        </p>
      )}
      {query.done && (
        <p className="admin-success" role="status">
          Đã lưu thay đổi và ghi nhật ký quản trị.
        </p>
      )}
      {query.error && (
        <p className="mutation-error" role="alert">
          Chưa lưu được. Kiểm tra quyền/MFA, thông tin nhập và lý do. Nếu bản
          ghi đã thay đổi, tải lại trước khi lưu.
        </p>
      )}
      <form className="admin-filter" method="get">
        <label>
          Khoảng thời gian
          <select name="days" defaultValue={days}>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="90">90 ngày</option>
          </select>
        </label>
        {[
          "users",
          "tickets",
          "incidents",
          "releases",
          "content",
          "audit",
        ].includes(section) && (
          <label>
            Tìm kiếm
            <input
              name="search"
              maxLength={160}
              defaultValue={query.search}
              placeholder={
                section === "users"
                  ? "Số điện thoại, email cũ hoặc User ID"
                  : "Tiêu đề hoặc thao tác"
              }
            />
          </label>
        )}
        {["users", "tickets", "incidents", "releases", "content"].includes(
          section,
        ) && (
          <label>
            Trạng thái
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">Tất cả</option>
              {(section === "users"
                ? ["active", "suspended"]
                : section === "tickets"
                  ? ["open", "in_progress", "resolved", "closed"]
                  : section === "incidents"
                    ? ["open", "investigating", "resolved"]
                    : ["draft", "review", "published", "archived"]
              ).map((s) => (
                <option key={s} value={s}>
                  {adminLabel(s)}
                </option>
              ))}
            </select>
          </label>
        )}
        {section === "users" && (
          <>
            <label>
              Sắp xếp
              <select name="sort" defaultValue={query.sort ?? "newest"}>
                <option value="newest">Mới đăng ký trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="email">Email A–Z</option>
              </select>
            </label>
            <label>
              Gói hiệu lực
              <select name="tier" defaultValue={query.tier ?? ""}>
                <option value="">Tất cả</option>
                <option value="free">Free</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
              </select>
            </label>
            <label>
              Đăng ký từ
              <input
                name="createdFrom"
                type="date"
                defaultValue={query.createdFrom}
              />
            </label>
            <label>
              Đăng ký đến
              <input
                name="createdTo"
                type="date"
                defaultValue={query.createdTo}
              />
            </label>
            <label>
              Phiên bản quan sát
              <input
                name="version"
                maxLength={40}
                defaultValue={query.version}
                placeholder="Ví dụ 1.0.9"
              />
            </label>
            {query.userId && (
              <input type="hidden" name="userId" value={query.userId} />
            )}
          </>
        )}
        <button className="button primary">Áp dụng</button>
        <Link href={adminSections[section].href}>Xóa bộ lọc</Link>
      </form>
      {section === "overview" ? (
        <>
          <div className="admin-kpis">
            <Kpi
              label="Người dùng"
              value={data.totalUsers}
              note="Tài khoản hiện có, không gồm nhân sự quản trị"
              href={
                canViewAdminSection(role, "users", permissions) ? "/admin/users" : undefined
              }
            />
            <Kpi
              label="Đăng ký trong kỳ"
              value={data.newUsers}
              note={`Kỳ tương đương trước: ${text(data.newUsersPrevious)}. So sánh cùng thời lượng đã trôi qua.`}
              href={
                canViewAdminSection(role, "users", permissions) ? "/admin/users" : undefined
              }
            />
            <Kpi
              label="Tài khoản đã xác minh"
              value={data.verifiedUsers}
              note="Tổng tài khoản hiện có đã xác minh, không gồm staff"
            />
            <Kpi
              label="Thuê bao Play thực còn hiệu lực"
              value={data.paidUsers}
              note={`License test: ${text(data.testUsers)} · Chưa xác định: ${text(data.unknownPurchaseUsers)}. Chỉ tính quyền xác minh trong 24 giờ; không dùng làm doanh thu.`}
            />
            <Kpi label="Yêu cầu đang mở" value={data.openTickets} />
            <Kpi label="Sự cố đang mở" value={data.openIncidents} />
          </div>
          <section className="admin-panel">
            <h2>Tình trạng dịch vụ</h2>
            <DataTable
              data={rows(data.health)}
              fields={{
                component: "Thành phần",
                status: "Kết quả probe",
                checked_at: "Kiểm tra gần nhất",
              }}
              caption="Probe gần nhất; xem thời gian để nhận biết dữ liệu quá hạn"
            />
            <p>
              Chưa có snapshot lịch sử cho các KPI quyền và ticket; không suy ra
              tỷ lệ tăng trưởng từ số hiện tại.
            </p>
          </section>
          <DailyChart data={rows(data.dailyUsers)} />
          <div className="admin-shortcuts">
            {(Object.keys(adminSections) as AdminSection[])
              .filter((s) => s !== "overview" && canViewAdminSection(role, s, permissions))
              .filter((s) =>
                [
                  "users",
                  "acquisition",
                  "health",
                  "tickets",
                  "billing",
                  "incidents",
                ].includes(s),
              )
              .map((s) => (
                <Link href={adminSections[s].href} key={s}>
                  <h2>{adminSections[s].title}</h2>
                  <span>Mở quản lý</span>
                </Link>
              ))}
          </div>
        </>
      ) : section === "acquisition" || section === "engagement" ? (
        <Acquisition data={data} engagement={section === "engagement"} />
      ) : section === "settings" ? (
        <SettingsForm
          data={data}
          disabled={!mfaVerified}
          owner={role === "owner"}
        />
      ) : (
        <section className="admin-panel">
          <DataTable
            data={records}
            fields={
              columns[section] ?? { title: "Tiêu đề", status: "Trạng thái" }
            }
            caption={adminSections[section].title}
          />
        </section>
      )}
      {typeof data.total === "number" && (
        <nav className="admin-pagination" aria-label="Phân trang">
          <span>
            {text(data.total)} bản ghi · Trang {page + 1}
          </span>
          {page > 0 && <Link href={pagination(page - 1)}>Trang trước</Link>}
          {(page + 1) * 25 < data.total && (
            <Link href={pagination(page + 1)}>Trang sau</Link>
          )}
        </nav>
      )}
      {(section === "health" || section === "ocr") && (
        <section className="admin-panel">
          <h2>Hạn mức và lỗi vận hành</h2>
          <DataTable
            data={rows(data.diagnostics)}
            fields={{
              metric: "Loại sự kiện",
              day: "Ngày (UTC)",
              value: "Số lượt",
              observed_at: "Cập nhật gần nhất",
            }}
            caption="Sự kiện backend"
          />
          <p className="admin-note">
            Bắt đầu ghi nhận khi backend mới được triển khai; không suy dữ liệu
            lịch sử từ số lượt quét thành công.
          </p>
        </section>
      )}
      {section === "content" && (
        <section className="admin-panel">
          <h2>Bài học cloud đã đăng ký</h2>
          <DataTable
            data={rows(data.lessons)}
            fields={{
              lesson_id: "Mã bài học",
              content_version: "Phiên bản",
              published: "Cho phép chấm bài cloud",
            }}
            caption="Bài học cloud"
          />
        </section>
      )}
      {section === "health" && (
        <>
          <section className="admin-panel">
            <h2>Chất lượng Android từ Google Play</h2>
            <p>
              Không có dòng dữ liệu không đồng nghĩa tỷ lệ crash bằng 0. Google
              có thể chưa đủ mẫu hoặc chưa có quyền Reporting API.
            </p>
            <DataTable
              data={rows(data.vitals)}
              fields={{
                day: "Ngày nguồn",
                metric: "Chỉ số",
                value: "Giá trị nguồn (%)",
                source_timezone: "Timezone",
                observed_at: "Đồng bộ",
              }}
              caption="Android vitals"
            />
          </section>
          <section className="admin-panel">
            <h2>Hàng đợi xử lý</h2>
            <DataTable
              data={rows(data.queue)}
              fields={{
                queue: "Hàng đợi",
                status: "Trạng thái",
                jobs: "Số tác vụ",
              }}
              caption="Hàng đợi"
            />
          </section>
          <section className="admin-panel">
            <h2>Kết quả probe trong 24 giờ</h2>
            <p>
              Đây là số mẫu kiểm tra, không khẳng định uptime liên tục giữa hai
              lần probe.
            </p>
            <DataTable
              data={rows(data.probeSuccess)}
              fields={{
                component: "Thành phần",
                samples: "Số mẫu",
                successful: "Mẫu OK",
              }}
              caption="Thống kê probe"
            />
          </section>
        </>
      )}
      {section === "billing" && (
        <section className="admin-panel">
          <h2>Quyền hỗ trợ cấp thủ công</h2>
          <DataTable
            data={rows(data.grants)}
            fields={{
              user_id: "User ID",
              tier: "Gói",
              expires_at: "Hết hạn",
              granted_by: "Người cấp",
            }}
            caption="Gói hỗ trợ"
          />
          <p>
            Gói hỗ trợ không phải thuê bao Google và không được tính doanh thu.
            Không sửa trạng thái Google Play bằng tay.
          </p>
        </section>
      )}
      {section === "billing" && data.financialAccess === true && (
        <section className="admin-panel">
          <h2>Doanh số Google Play ước tính</h2>
          <p>
            Số tiền đã ghi nhận trong báo cáo sales, tách theo tiền tệ gốc. Chưa
            trừ đầy đủ phí/thuế, không phải tiền thực nhận và không dùng thay
            báo cáo kế toán. Không cộng các tiền tệ khác nhau.
          </p>
          <DataTable
            data={rows(data.sales)}
            fields={{
              day: "Ngày UTC",
              metric: "Loại số liệu",
              currency: "Tiền tệ",
              value: "Số tiền",
              observed_at: "Đồng bộ",
            }}
            caption="Doanh số ước tính theo tiền tệ"
          />
        </section>
      )}
      {section === "users" && query.userId && (
        <section className="admin-panel">
          <h2>Lịch sử tài khoản</h2>
          <p>
            Chỉ hiển thị metadata hỗ trợ và sự kiện quản trị. Phiên bản/hoạt
            động có thể thiếu nếu người dùng chưa đồng ý đo lường.
          </p>
          <DataTable
            data={rows(data.timeline)}
            fields={{
              created_at: "Thời gian",
              action: "Thao tác",
              reason: "Lý do",
              details: "Thay đổi",
            }}
            caption="50 sự kiện quản trị gần nhất"
          />
          <DataTable
            data={rows(data.tickets)}
            fields={{
              title: "Yêu cầu",
              status: "Trạng thái",
              priority: "Ưu tiên",
              updated_at: "Cập nhật",
            }}
            caption="Yêu cầu hỗ trợ liên quan"
          />
          <DataTable
            data={rows(data.quota)}
            fields={{
              day: "Ngày UTC",
              attempts: "Lượt OCR",
              successful: "Thành công",
            }}
            caption="Mức sử dụng OCR trong kỳ"
          />
          <Link href="/admin/users">Quay lại danh sách người dùng</Link>
        </section>
      )}
      {section === "users" &&
        records.map((user) => (
          <details className="admin-panel" key={String(user.id)}>
            <summary>{text(user.email)} · quản lý tài khoản</summary>
            <form className="finance-form" action={accountAction}>
              <input type="hidden" name="userId" value={String(user.id)} />
              <input type="hidden" name="requestId" value={randomUUID()} />
              <fieldset disabled={!mfaVerified}>
                <legend>Thao tác tài khoản</legend>
                <label>
                  Hành động
                  <select name="action">
                    <option value="reset_password">
                      Gửi hướng dẫn đặt lại mật khẩu
                    </option>
                    <option value="suspend">Khóa tài khoản</option>
                    <option value="restore">Mở khóa tài khoản</option>
                  </select>
                </label>
                <label>
                  Lý do
                  <input name="reason" required minLength={5} maxLength={500} />
                </label>
                <label>
                  Nhập SAVE để xác nhận
                  <input name="confirmation" pattern="SAVE" required />
                </label>
                <SubmitButton className="button primary">
                  Thực hiện
                </SubmitButton>
              </fieldset>
            </form>
            <form className="finance-form" action={mutateAdmin}>
              <input type="hidden" name="action" value="revoke_sessions" />
              <input type="hidden" name="userId" value={String(user.id)} />
              <input type="hidden" name="requestId" value={randomUUID()} />
              <fieldset disabled={!mfaVerified}>
                <legend>Thu hồi các phiên hiện có</legend>
                <p>
                  Các phiên hiện tại sẽ bị API từ chối. Người dùng có thể đăng
                  nhập lại để tạo phiên mới.
                </p>
                <label>
                  Lý do
                  <input name="reason" required minLength={5} maxLength={500} />
                </label>
                <label>
                  Nhập SAVE để xác nhận
                  <input name="confirmation" pattern="SAVE" required />
                </label>
                <SubmitButton className="button secondary">
                  Thu hồi phiên
                </SubmitButton>
              </fieldset>
            </form>
          </details>
        ))}
      {section === "billing" &&
        ["owner", "operations"].includes(role ?? "") && (
          <form className="finance-form admin-panel" action={mutateAdmin}>
            <input type="hidden" name="action" value="grant" />
            <input type="hidden" name="requestId" value={randomUUID()} />
            <fieldset disabled={!mfaVerified}>
              <legend>Cấp quyền hỗ trợ trong 30 ngày</legend>
              <label>
                User ID
                <input name="userId" required />
              </label>
              <label>
                Gói
                <select name="tier">
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                  <option value="free">Thu hồi quyền hỗ trợ</option>
                </select>
              </label>
              <label>
                Lý do
                <input name="reason" required minLength={5} maxLength={500} />
              </label>
              <label>
                Nhập SAVE để xác nhận
                <input name="confirmation" pattern="SAVE" required />
              </label>
              <SubmitButton className="button primary">
                Lưu quyền hỗ trợ
              </SubmitButton>
            </fieldset>
          </form>
        )}
      {recordAction && (
        <section className="admin-panel">
          <h2>Biên tập {adminSections[section].title.toLowerCase()}</h2>
          <AdminRecordForm action={recordAction} disabled={!mfaVerified} />
          {records.map((r) => (
            <details className="admin-record" key={String(r.id)}>
              <summary>{text(r.title)} · chỉnh sửa</summary>
              <AdminRecordForm
                action={recordAction}
                row={r}
                disabled={!mfaVerified}
              />
              {section === "content" && (
                <form className="finance-form" action={mutateAdmin}>
                  <input type="hidden" name="action" value="review_content" />
                  <input type="hidden" name="id" value={String(r.id)} />
                  <input
                    type="hidden"
                    name="expectedVersion"
                    value={Number(r.row_version)}
                  />
                  <input type="hidden" name="requestId" value={randomUUID()} />
                  <fieldset disabled={!mfaVerified}>
                    <legend>Review độc lập</legend>
                    <p>
                      Người review phải khác người chỉnh sửa nội dung gần nhất.
                      Nội dung thay đổi sau review phải được kiểm tra lại.
                    </p>
                    <label>
                      Nhận xét review
                      <input
                        name="reason"
                        minLength={5}
                        maxLength={500}
                        required
                      />
                    </label>
                    <label>
                      Nhập SAVE để xác nhận
                      <input name="confirmation" pattern="SAVE" required />
                    </label>
                    <SubmitButton className="button primary">
                      Xác nhận đã review
                    </SubmitButton>
                  </fieldset>
                </form>
              )}
              {section === "tickets" && (
                <>
                  <ul>
                    {rows(data.comments)
                      .filter((c) => c.ticket_id === r.id)
                      .map((c) => (
                        <li key={String(c.id)}>
                          {text(c.created_at)} · {text(c.author)}
                          <p>{text(c.body)}</p>
                        </li>
                      ))}
                  </ul>
                  <form className="finance-form" action={mutateAdmin}>
                    <input type="hidden" name="action" value="comment" />
                    <input type="hidden" name="ticketId" value={String(r.id)} />
                    <input
                      type="hidden"
                      name="requestId"
                      value={randomUUID()}
                    />
                    <fieldset disabled={!mfaVerified}>
                      <legend>Ghi chú nội bộ</legend>
                      <label>
                        Ghi chú
                        <textarea name="body" required maxLength={2000} />
                      </label>
                      <label>
                        Lý do
                        <input
                          name="reason"
                          required
                          minLength={5}
                          maxLength={500}
                        />
                      </label>
                      <label>
                        Nhập SAVE để xác nhận
                        <input name="confirmation" pattern="SAVE" required />
                      </label>
                      <SubmitButton className="button primary">
                        Thêm ghi chú
                      </SubmitButton>
                    </fieldset>
                  </form>
                </>
              )}
            </details>
          ))}
        </section>
      )}
      {section === "staff" && (
        <form className="finance-form admin-panel" action={mutateAdmin}>
          <input type="hidden" name="action" value="staff" />
          <input type="hidden" name="requestId" value={randomUUID()} />
          <fieldset disabled={!mfaVerified}>
            <legend>Cấp hoặc thay đổi vai trò</legend>
            <label>
              User ID
              <input name="userId" required />
            </label>
            <label>
              Vai trò
              <select name="role">
                {[
                  "owner",
                  "operations",
                  "support",
                  "analyst",
                  "content",
                  "remove",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Lý do
              <input name="reason" required minLength={5} maxLength={500} />
            </label>
            <label>
              Nhập SAVE để xác nhận
              <input name="confirmation" pattern="SAVE" required />
            </label>
            <SubmitButton className="button primary">Lưu quyền</SubmitButton>
          </fieldset>
          <p>
            Không thể gỡ owner cuối cùng. Thay đổi có hiệu lực ở lần kiểm tra
            quyền tiếp theo, gồm cả mobile.
          </p>
        </form>
      )}
      <p className="admin-note">
        Nguồn: API Picket · Múi giờ hiển thị: {text(data.timezone)} · Truy vấn
        lúc {text(data.asOf)}. Nguồn ngoài giữ ngày/timezone riêng.
      </p>
    </main>
  );
}
