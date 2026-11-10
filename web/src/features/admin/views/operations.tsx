import Link from "next/link";
import { AdminIcon } from "../ui/admin-icon";
import { AdminPager } from "../ui/admin-pager";
import { AdminRecordForm } from "../components/admin-record-form";
import { Banner, Button, Card, Chip, Field, Table, Tile, Timeline, display, formatDateTime, formatNumber, relativeTime, type Column } from "../ui/paper";
import { componentInfo, componentName, label, num, object, rows, sectionHref, statusTone, str, type Query, type Row, type ViewProps } from "./shared";
import "./ops-content-system.css";

export const PAGE_SIZE = 25;

/** Pagination (25/page via ?page=) shared by the ops, content and system views. */
export function Pager({ base, query, page, total }: { base: string; query: Query; page: number; total: unknown }) {
  const count = num(total);
  if (count === undefined) return null;
  return <AdminPager base={base} query={query} page={page} total={count} pageSize={PAGE_SIZE} clear={["incidentId", "contentId", "partnerId"]} />;
}

/** Source / timezone / query-time footnote kept from the previous admin pages. */
export function AsOf({ data }: { data: Record<string, unknown> }) {
  return (
    <p className="ap-footnote">
      <AdminIcon name="sparkle" size={14} />
      Nguồn: API Picket · Múi giờ hiển thị: {str(data.timezone) || "—"} · Truy vấn lúc {formatDateTime(data.asOf)}. Nguồn ngoài giữ ngày/timezone riêng.
    </p>
  );
}

const VITAL_NAMES: Record<string, string> = { crash_rate: "Tỷ lệ crash", anr_rate: "Tỷ lệ ANR", slow_start_rate: "Khởi động chậm", excessive_wakeups: "Đánh thức quá mức" };
const QUEUE_ICONS: Record<string, { icon: string; tone: "coral" | "mint" | "blue" | "lilac" | "cream"; name: string }> = {
  ocr_cloud: { icon: "receipt", tone: "coral", name: "OCR cloud" },
  push: { icon: "bell", tone: "lilac", name: "Thông báo đẩy" },
  exports: { icon: "download", tone: "blue", name: "Xuất báo cáo" },
};
const SEGMENTS = 24;

/* Figma › Admin Web › 14 · Sức khoẻ hệ thống (152:7069). */
export function HealthView(p: ViewProps) {
  const { data, query, page } = p;
  const asOf = Date.parse(str(data.asOf));
  const staleMs = (num(data.staleMinutes) ?? 15) * 60000;
  const components = rows(data.rows).map((r) => (asOf - Date.parse(str(r.checked_at)) > staleMs ? { ...r, status: "stale" } : r));
  const probes = new Map(rows(data.probeSuccess).map((r) => [str(r.component), r]));
  const queue = rows(data.queue), vitals = rows(data.vitals), diagnostics = rows(data.diagnostics), probeRows = rows(data.probeSuccess);

  const queueColumns: Column<Row>[] = [
    { key: "queue", label: "Hàng đợi", render: (r) => { const q = QUEUE_ICONS[str(r.queue)]; return <span className="ap-row" style={{ flexWrap: "nowrap" }}><Tile icon={q?.icon ?? "list"} tone={q?.tone ?? "cream"} /><b>{q?.name ?? label(r.queue)}</b></span>; } },
    { key: "jobs", label: "Đang chờ", align: "right", render: (r) => formatNumber(r.jobs) },
    { key: "status", label: "Trạng thái", render: (r) => <Chip tone={statusTone(r.status)}>{label(r.status)}</Chip> },
  ];
  const probeColumns: Column<Row>[] = [
    { key: "component", label: "Thành phần", render: (r) => componentName(r.component) },
    { key: "samples", label: "Số mẫu", align: "right", render: (r) => formatNumber(r.samples) },
    { key: "successful", label: "Mẫu OK", align: "right", render: (r) => formatNumber(r.successful) },
  ];
  const diagColumns: Column<Row>[] = [
    { key: "metric", label: "Loại sự kiện", render: (r) => label(r.metric) },
    { key: "day", label: "Ngày (UTC)", render: (r) => display(r.day) },
    { key: "value", label: "Số lượt", align: "right", render: (r) => formatNumber(r.value) },
    { key: "observed_at", label: "Cập nhật gần nhất", muted: true, render: (r) => relativeTime(r.observed_at) },
  ];

  return (
    <>
      <section aria-label="Thành phần hệ thống" className="ao-health-grid">
        {components.length ? components.map((c) => {
          const key = str(c.component), info = componentInfo[key], status = str(c.status);
          const probe = probes.get(key);
          const samples = num(probe?.samples), ok = num(probe?.successful);
          const failing = samples && ok !== undefined ? Math.min(SEGMENTS, Math.max(ok < samples ? 1 : 0, Math.round(((samples - ok) / samples) * SEGMENTS))) : 0;
          const latency = num(c.latency_ms);
          return (
            <article key={key} className={`ap-card ao-component${status === "ok" ? "" : " is-attention"}`}>
              <header className="ao-component-head">
                <Tile icon={info?.icon ?? "grid"} tone={info?.tone ?? "cream"} />
                <h2>{componentName(key)}</h2>
                <Chip tone={statusTone(status)}>{label(status)}</Chip>
              </header>
              <div className="ao-component-main">
                <strong>{latency === undefined ? "—" : `${formatNumber(latency)} ms`}</strong>
                <span>{str(c.message) || "Chưa có thông tin"}</span>
              </div>
              <div className="ao-segments" role="img" aria-label={samples ? `${formatNumber(ok)} trên ${formatNumber(samples)} mẫu probe OK trong 24 giờ` : "Chưa có mẫu probe"}>
                {Array.from({ length: SEGMENTS }, (_, i) => <span key={i} className={!samples ? "is-empty" : i >= SEGMENTS - failing ? "is-bad" : undefined} />)}
              </div>
              <p className="ao-component-foot">Kiểm tra {relativeTime(c.checked_at)}{samples ? ` · Mẫu OK ${formatNumber(ok)}/${formatNumber(samples)}` : ""}</p>
            </article>
          );
        }) : <p className="ap-card-note">Chưa có dữ liệu probe.</p>}
      </section>
      <p className="ap-footnote"><AdminIcon name="sparkle" size={14} />Thanh màu thể hiện tỷ lệ mẫu probe OK trong 24 giờ, không phải thứ tự thời gian; không khẳng định uptime liên tục giữa hai lần probe. Probe quá {formatNumber(num(data.staleMinutes) ?? 15)} phút được đánh dấu “Quá hạn”.</p>

      <div className="ap-split-wide">
        <Card receipt eyebrow="Worker" title="Hàng đợi xử lý">
          <Table columns={queueColumns} rows={queue} caption="Hàng đợi xử lý" rowKey={(r) => str(r.queue)} />
        </Card>
        <Card eyebrow="Google Play vitals" title="Chất lượng Android"
          note="Không có dòng dữ liệu không đồng nghĩa tỷ lệ crash bằng 0. Google có thể chưa đủ mẫu hoặc chưa có quyền Reporting API.">
          {vitals.length ? (
            <ul className="ao-vitals">
              {vitals.map((v, i) => (
                <li key={`${str(v.metric)}-${str(v.day)}-${i}`}>
                  <span><b>{VITAL_NAMES[str(v.metric)] ?? label(v.metric)}</b><small>Ngày nguồn {display(v.day)} · {str(v.source_timezone) || "—"} · đồng bộ {relativeTime(v.observed_at)}</small></span>
                  <strong>{num(v.value) === undefined ? "—" : `${formatNumber(v.value)}%`}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="ap-empty-row">Chưa có dữ liệu từ Google Play.</p>}
        </Card>
      </div>

      <div className="ap-split-wide">
        <Card eyebrow="24 giờ" title="Kết quả probe" note="Đây là số mẫu kiểm tra, không khẳng định uptime liên tục giữa hai lần probe.">
          <Table columns={probeColumns} rows={probeRows} caption="Thống kê probe" rowKey={(r) => str(r.component)} />
        </Card>
        <Card eyebrow="Backend" title="Hạn mức và lỗi vận hành">
          <Table columns={diagColumns} rows={diagnostics} caption="Sự kiện backend" rowKey={(r, i) => `${str(r.metric)}-${str(r.day)}-${i}`} />
          <p className="ap-footnote"><AdminIcon name="sparkle" size={14} />Bắt đầu ghi nhận khi backend mới được triển khai; không suy dữ liệu lịch sử từ số lượt quét thành công.</p>
        </Card>
      </div>

      <Pager base="/admin/health" query={query} page={page} total={data.total} />
      <AsOf data={data} />
    </>
  );
}

/* Figma › Admin Web › 15 · Sự cố (152:7513). */
export function IncidentsView(p: ViewProps) {
  const { data, query, page, mfaVerified, days } = p;
  const base = "/admin/incidents";
  const incidents = rows(data.rows);
  const isLive = (r: Row) => ["open", "investigating"].includes(str(r.status));
  const live = incidents.find(isLive);
  const creating = query.incidentId === "new";
  const selected = creating ? undefined : incidents.find((r) => str(r.id) === query.incidentId) ?? live ?? incidents[0];
  const hrefFor = (id: string) => `${sectionHref(base, query, { incidentId: id })}#incident-detail`;
  const details = object(selected?.details);

  const columns: Column<Row>[] = [
    { key: "title", label: "Sự cố", render: (r) => (
      <Link className="ao-row-link" href={hrefFor(str(r.id))} aria-current={str(r.id) === str(selected?.id) ? "true" : undefined}>
        <b>{str(r.title)}</b><small>Cập nhật {formatDateTime(r.updated_at)}</small>
      </Link>
    ) },
    { key: "status", label: "Trạng thái", render: (r) => <Chip tone={statusTone(r.status)}>{label(r.status)}</Chip> },
    { key: "updated_at", label: "Cập nhật", align: "right", muted: true, render: (r) => relativeTime(r.updated_at) },
  ];
  const facts: [string, string][] = [
    ["Thành phần", str(details.component)], ["Mức độ", details.severity ? label(details.severity) : ""],
    ["Ảnh hưởng", str(details.impact)], ["Người xử lý", str(details.owner)],
  ];

  return (
    <>
      {live ? (
        <Banner tone="incident" icon="alert" eyebrow={`${label(live.status)} · cập nhật ${relativeTime(live.updated_at)}`} title={str(live.title)}
          text={[str(object(live.details).impact) && `Ảnh hưởng: ${str(object(live.details).impact)}`, str(object(live.details).owner) && `người xử lý ${str(object(live.details).owner)}`].filter(Boolean).join(" · ") || undefined}
          action={<Button href={hrefFor(str(live.id))} variant="coral">Cập nhật tiến độ</Button>} />
      ) : (
        <Banner tone="success" icon="check" title="Không có sự cố đang mở" text="Mọi sự cố trong kỳ đã được xử lý." />
      )}

      <form className="ap-filter" method="get" aria-label="Lọc sự cố">
        <input type="hidden" name="days" value={days} />
        <Field label="Tìm kiếm" grow><input name="search" type="search" maxLength={160} defaultValue={query.search} placeholder="Tiêu đề hoặc thao tác" /></Field>
        <Field label="Trạng thái" width={160}>
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">Tất cả</option>
            {["open", "investigating", "resolved"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <div className="ao-filter-actions">
          <button className="ap-btn" type="submit">Áp dụng</button>
          <Link className="ap-btn is-ghost" href={`${base}?days=${days}`}>Xoá bộ lọc</Link>
        </div>
      </form>

      <div className="ap-split-wide">
        <Card receipt eyebrow={`${days} ngày`} title="Tất cả sự cố" actions={<Button href={`${sectionHref(base, query, { incidentId: "new" })}#incident-detail`} variant="secondary" icon="plus" size="sm">Báo sự cố</Button>}>
          <Table columns={columns} rows={incidents} caption="Danh sách sự cố" selected={(r) => str(r.id) === str(selected?.id)} />
          <Pager base={base} query={query} page={page} total={data.total} />
        </Card>

        <Card eyebrow={creating ? "Tạo mới" : "Diễn biến"} title={creating ? "Báo sự cố mới" : selected ? str(selected.title) : "Chưa chọn sự cố"} className="ao-detail">
          <span id="incident-detail" className="ao-anchor" />
          {selected && (
            <>
              <Timeline items={[{ title: `Trạng thái hiện tại: ${label(selected.status)}`, meta: `Cập nhật ${formatDateTime(selected.updated_at)}`, color: "var(--ap-mauve)" }]} />
              {facts.some(([, v]) => v) && (
                <dl className="ao-facts">{facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              )}
              <p className="ap-footnote"><AdminIcon name="sparkle" size={14} />Chưa có dòng thời gian chi tiết; mọi lần lưu được ghi trong Nhật ký hoạt động.</p>
            </>
          )}
          {(selected || creating) && <AdminRecordForm key={creating ? "new" : str(selected?.id)} action="incident" row={creating ? undefined : selected} disabled={!mfaVerified} />}
          {!selected && !creating && <p className="ap-card-note">Chưa có sự cố trong kỳ. Dùng “Báo sự cố” để tạo mới.</p>}
        </Card>
      </div>
      <AsOf data={data} />
    </>
  );
}
