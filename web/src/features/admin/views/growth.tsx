import { AdminIcon } from "../ui/admin-icon";
import { AdminPager } from "../ui/admin-pager";
import { Banner, Card, Chip, Kpi, Progress, Table, Tile, formatDate, formatDateTime, formatNumber, relativeTime, type ChipTone, type Column } from "../ui/paper";
import { componentInfo, componentName, label, num, object, rows, statusTone, str, type Row, type ViewProps } from "./shared";
import "./views.css";
import "./growth-customers.css";

const PAGE_SIZE = 25;
const sum = (items: Row[], key: string) => items.reduce((s, r) => s + (num(r[key]) ?? 0), 0);
const shortDay = (value: unknown) => {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(str(value));
  return m ? `${m[3]}/${m[2]}` : "—";
};
const latest = (items: Row[], key: string) => items.map((r) => Date.parse(str(r[key]))).filter((t) => !Number.isNaN(t)).sort((a, b) => b - a)[0];

const eventInfo: Record<string, { name: string; icon: string; tone: "coral" | "mint" | "blue" | "lilac" | "cream" }> = {
  landing_view: { name: "Xem landing", icon: "eye", tone: "coral" },
  apk_click: { name: "Bấm tải APK", icon: "download", tone: "mint" },
  first_open: { name: "Mở app lần đầu", icon: "sparkle", tone: "lilac" },
};
const eventName = (e: unknown) => eventInfo[str(e)]?.name ?? label(e);

function Footnote({ p, children }: { p: ViewProps; children?: React.ReactNode }) {
  return (
    <p className="ap-footnote">
      <AdminIcon name="sparkle" size={14} />
      <span>{children ? <>{children} </> : null}Nguồn: API Picket · Múi giờ {str(p.data.timezone) || "—"} · Truy vấn lúc {formatDateTime(p.data.asOf)}. Nguồn ngoài giữ ngày/timezone riêng.</span>
    </p>
  );
}

function queryPage(value: string | undefined, total: number) {
  const requested = /^\d{1,5}$/.test(value ?? "") ? Number(value) : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return Math.min(requested, pages - 1);
}

/** Totals only exist once measurement has started (data.firstObservedAt). */
function totalsOf(data: Row) {
  const events = rows(data.events), metrics = rows(data.metrics);
  const observed = Boolean(data.firstObservedAt);
  const total = (event: string, key: string) => (observed ? sum(events.filter((r) => r.event === event), key) : undefined);
  const play = metrics.filter((r) => r.source === "google_play_installs" && r.metric === "Daily Device Installs");
  const apk = metrics.filter((r) => r.source === "apk_access" && r.metric === "served_requests");
  return { events, metrics, observed, total, play: play.length ? sum(play, "value") : undefined, apk: apk.length ? sum(apk, "value") : undefined };
}

/* ---------- Events (shared by acquisition and engagement) ---------- */
function EventsCard({ events, eyebrow, p }: { events: Row[]; eyebrow: string; p: ViewProps }) {
  const page = queryPage(p.query.eventPage, events.length);
  const pageRows = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const base = p.section === "engagement" ? "/admin/engagement" : "/admin/acquisition";
  const kinds = [...new Set(events.map((r) => str(r.event)))];
  const summary = kinds.map((k) => {
    const list = events.filter((r) => str(r.event) === k);
    return { event: k, events: sum(list, "events"), sessions: sum(list, "sessions"), users: sum(list, "users") };
  });
  const summaryColumns: Column<Row>[] = [
    { key: "event", label: "Sự kiện", render: (r) => <span className="ag-source"><Tile icon={eventInfo[str(r.event)]?.icon ?? "list"} tone={eventInfo[str(r.event)]?.tone ?? "cream"} />{eventName(r.event)}</span> },
    { key: "events", label: "Lượt", align: "right", render: (r) => formatNumber(r.events) },
    { key: "sessions", label: "Phiên", align: "right", render: (r) => formatNumber(r.sessions) },
    { key: "users", label: "Tài khoản", align: "right", render: (r) => formatNumber(r.users) },
  ];
  const dayColumns: Column<Row>[] = [
    { key: "day", label: "Ngày", render: (r) => formatDate(r.day) },
    { key: "event", label: "Sự kiện", render: (r) => eventName(r.event) },
    { key: "channel", label: "Kênh", muted: true, render: (r) => label(r.channel) },
    { key: "events", label: "Số lượt", align: "right", render: (r) => formatNumber(r.events) },
    { key: "sessions", label: "Phiên", align: "right", render: (r) => formatNumber(r.sessions) },
    { key: "users", label: "Tài khoản", align: "right", render: (r) => formatNumber(r.users) },
  ];
  return (
    <Card receipt eyebrow={eyebrow} title="Sự kiện quan sát được">
      <Table columns={summaryColumns} rows={summary as Row[]} caption="Tổng sự kiện trong kỳ" rowKey={(r) => str(r.event)} />
      {events.length > 0 && (
        <details className="ag-details">
          <summary>Chi tiết theo ngày</summary>
          <Table columns={dayColumns} rows={pageRows} caption="Sự kiện theo ngày" rowKey={(r, i) => `${str(r.day)}-${str(r.event)}-${str(r.channel)}-${page * PAGE_SIZE + i}`} />
          <AdminPager base={base} query={p.query} page={page} total={events.length} pageSize={PAGE_SIZE} pageParam="eventPage" />
        </details>
      )}
      <p className="ap-card-note">Giờ Việt Nam. Traffic quản trị được loại khi xác định được; chỉ đo trên phiên đồng ý analytics.</p>
    </Card>
  );
}

/* ---------- Acquisition · Figma 09 (149:6319) ---------- */
export function AcquisitionView(p: ViewProps) {
  const { data, days } = p;
  const t = totalsOf(data);
  const funnel = object(data.funnel);
  const hasFunnel = Object.keys(funnel).length > 0;
  const steps = [
    { name: "Xem landing", value: t.total("landing_view", "events"), color: "var(--ap-lilac)" },
    { name: "Bấm tải APK", value: t.total("apk_click", "events"), color: "var(--ap-blue)" },
    { name: "Cài từ Play", value: t.play, color: "var(--ap-mint)" },
    ...(hasFunnel ? [
      { name: "Đăng ký", value: num(funnel.registered), color: "var(--ap-coral)" },
      { name: "Đã xác minh", value: num(funnel.verified), color: "var(--ap-coral)" },
      { name: "Hoạt động quan sát được", value: t.observed ? num(funnel.observedActive) : undefined, color: "var(--ap-mauve)" },
    ] : []),
  ];
  const max = Math.max(1, ...steps.map((s) => s.value ?? 0));

  const byDay = new Map<string, number>();
  for (const r of t.events.filter((r) => r.event === "landing_view")) byDay.set(str(r.day), (byDay.get(str(r.day)) ?? 0) + (num(r.sessions) ?? 0));
  const daily = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const values = daily.map(([, v]) => v);

  const sourceInfo = (s: unknown) => componentInfo[str(s)];
  const sourceColumns: Column<Row>[] = [
    { key: "source", label: "Nguồn", render: (r) => <span className="ag-source"><Tile icon={sourceInfo(r.source)?.icon ?? "grid"} tone={sourceInfo(r.source)?.tone ?? "cream"} />{componentName(r.source)}</span> },
    { key: "metric", label: "Chỉ số gốc", muted: true },
    { key: "day", label: "Ngày nguồn", render: (r) => formatDate(r.day) },
    { key: "value", label: "Giá trị", align: "right", render: (r) => formatNumber(r.value) },
    { key: "source_timezone", label: "Timezone", muted: true, render: (r) => str(r.source_timezone) || "—" },
    { key: "observed_at", label: "Đồng bộ", muted: true, render: (r) => relativeTime(r.observed_at) },
  ];
  const syncColumns: Column<Row>[] = [
    { key: "source", label: "Nguồn", render: (r) => componentName(r.source) },
    { key: "status", label: "Trạng thái", render: (r) => <Chip tone={statusTone(r.status)}>{label(r.status)}</Chip> },
    { key: "message", label: "Thông tin", muted: true, render: (r) => str(r.message) || "—" },
    { key: "updated_at", label: "Lần thử gần nhất", render: (r) => relativeTime(r.updated_at) },
    { key: "last_success_at", label: "Thành công gần nhất", render: (r) => relativeTime(r.last_success_at) },
  ];
  const sync = latest(t.metrics, "observed_at");
  const integrations = rows(data.integrations);
  const metricsPage = queryPage(p.query.metricsPage, t.metrics.length);
  const metricsRows = t.metrics.slice(metricsPage * PAGE_SIZE, (metricsPage + 1) * PAGE_SIZE);
  const integrationsPage = queryPage(p.query.integrationsPage, integrations.length);
  const integrationsRows = integrations.slice(integrationsPage * PAGE_SIZE, (integrationsPage + 1) * PAGE_SIZE);

  return (
    <>
      <div className="ap-grid ap-grid-4">
        <Kpi icon="eye" tone="coral" label="Lượt xem landing" value={formatNumber(t.total("landing_view", "events"))} note={`Phiên landing: ${formatNumber(t.total("landing_view", "sessions"))}`} />
        <Kpi icon="download" tone="mint" label="Bấm tải APK" value={formatNumber(t.total("apk_click", "events"))} note="Lượt bấm nút tải trên landing" />
        <Kpi icon="grid" tone="blue" label="Lượt phục vụ APK" value={formatNumber(t.apk)} note="Từ máy chủ tải file" />
        <Kpi icon="wallet" tone="lilac" label="Thiết bị cài từ Play" value={formatNumber(t.play)} note="Daily Device Installs · có độ trễ" />
      </div>

      <div className="ag-split">
        <Card receipt eyebrow={`${days} ngày qua`} title="Hành trình sử dụng">
          <ul className="ag-funnel">
            {steps.map((s) => (
              <li key={s.name}>
                <span className="ag-funnel-label">{s.name}</span>
                <span className="ag-funnel-track">
                  <span className="ag-funnel-bar" style={{ width: `calc((100% - 80px) * ${(s.value ?? 0) / max})`, background: s.color }} />
                  <span className="ag-funnel-value">{formatNumber(s.value)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="ap-card-note">Mỗi bước đến từ một nguồn đo khác nhau, không phải tỷ lệ chuyển đổi hay số người cài.</p>
        </Card>
        <div className="ag-col">
          <Card receipt eyebrow="Theo ngày" title="Phiên landing">
            {values.length ? (
              <div className="ag-chart">
                <div className={`ap-bars ${values.length > 7 ? "is-recent" : "is-all"}`} style={{ height: 120 }} role="img" aria-label={`Phiên landing mỗi ngày trong ${values.length} ngày; ngày gần nhất ${values.at(-1)}`}>
                  {values.map((v, i) => <span key={i} style={{ height: `${Math.max(8, (v / Math.max(1, ...values)) * 100)}%` }} />)}
                </div>
                <div className="ag-axis"><span>{shortDay(daily[0][0])}</span><span>{shortDay(daily.at(-1)?.[0])}</span></div>
                <div className="ag-legend">
                  {values.length > 7 ? <><span><i />{values.length - 7} ngày trước</span><span><i className="is-coral" />7 ngày gần nhất</span></> : <span><i className="is-coral" />Phiên mỗi ngày</span>}
                </div>
              </div>
            ) : <p className="ap-card-note">Chưa có dữ liệu phiên landing trong kỳ.</p>}
          </Card>
          <Banner tone="success" icon="sparkle" title="Cách đọc số liệu"
            text="“—” nghĩa là chưa có nguồn đo. Lượt bấm, lượt phục vụ file và lượt cài Play là các số khác nhau, không cộng thành số người cài." />
        </div>
      </div>

      <Card eyebrow="Báo cáo từ nguồn ngoài" title="Số liệu nhập về"
        actions={sync ? <Chip tone="coral">Đồng bộ {relativeTime(new Date(sync).toISOString())}</Chip> : undefined}>
        <Table columns={sourceColumns} rows={metricsRows} caption="Số liệu từ nguồn ngoài" rowKey={(r, i) => `${str(r.source)}-${str(r.metric)}-${str(r.day)}-${metricsPage * PAGE_SIZE + i}`} />
        <AdminPager base="/admin/acquisition" query={p.query} page={metricsPage} total={t.metrics.length} pageSize={PAGE_SIZE} pageParam="metricsPage" />
        <p className="ap-card-note">Giữ ngày và timezone của nguồn. Báo cáo Play có thể trễ 3–7 ngày và được điều chỉnh lại.</p>
      </Card>

      <EventsCard events={t.events} eyebrow={`${days} ngày qua`} p={p} />

      <Card eyebrow="Đồng bộ" title="Tình trạng đồng bộ nguồn">
        <Table columns={syncColumns} rows={integrationsRows} caption="Đồng bộ nguồn" rowKey={(r, i) => `${str(r.source)}-${integrationsPage * PAGE_SIZE + i}`} />
        <AdminPager base="/admin/acquisition" query={p.query} page={integrationsPage} total={integrations.length} pageSize={PAGE_SIZE} pageParam="integrationsPage" />
      </Card>
      <Footnote p={p}>Không thu thập được lịch sử trước khi bật đo lường.</Footnote>
    </>
  );
}

/* ---------- Engagement · Figma 10 (149:6690) ---------- */
export function EngagementView(p: ViewProps) {
  const { data, days } = p;
  const t = totalsOf(data);
  const activity = object(data.activity), funnel = object(data.funnel);
  const act = (k: string) => (t.observed ? num(activity[k]) : undefined);

  const retention = rows(data.retention);
  const retentionColumns: Column<Row>[] = [
    { key: "day", label: "Mốc quay lại", render: (r) => <b className="ag-strong">{num(r.day) !== undefined ? `D${num(r.day)}` : str(r.day)}</b> },
    { key: "eligible", label: "Đủ thời gian theo dõi", align: "right", render: (r) => formatNumber(r.eligible) },
    { key: "retained", label: "Có thao tác thành công", align: "right", render: (r) => formatNumber(r.retained) },
    { key: "rate", label: "Tỷ lệ", align: "right", render: (r) => {
      const eligible = num(r.eligible) ?? 0, retained = num(r.retained) ?? 0;
      if (!eligible) return <span className="ag-pill is-empty">chưa đủ ngày</span>;
      const pct = Math.round((retained / eligible) * 100);
      return <span className={`ag-pill${pct < 30 ? " is-light" : ""}`} style={{ "--ag-level": `${Math.max(25, Math.min(95, pct + 25))}%` } as React.CSSProperties}>{pct}%</span>;
    } },
  ];

  const versions = rows(data.versions).sort((a, b) => (num(b.users) ?? 0) - (num(a.users) ?? 0));
  const versionTotal = sum(versions, "users");
  const shown = versions.slice(0, 4).map((v) => ({ name: str(v.version), users: num(v.users) ?? 0 }));
  const rest = versions.slice(4);
  if (rest.length) shown.push({ name: "Cũ hơn", users: sum(rest, "users") });
  const colors = ["var(--ap-mauve)", "var(--ap-lilac)", "var(--ap-blue)", "var(--ap-mint)", "var(--ap-line)"];

  return (
    <>
      <div className="ap-grid ap-grid-4">
        <Kpi icon="users" tone="coral" label="DAU" value={formatNumber(act("dau"))} note="Người có hoạt động ý nghĩa trong 24 giờ" />
        <Kpi icon="calendar" tone="mint" label="WAU" value={formatNumber(act("wau"))} note="7 ngày gần nhất" />
        <Kpi icon="chart" tone="blue" label="MAU" value={formatNumber(act("mau"))} note="30 ngày gần nhất" />
        <Kpi icon="sparkle" tone="lilac" label="First-open quan sát được" value={formatNumber(t.total("first_open", "events"))} note="Lần mở đầu tiên sau cài" />
      </div>

      <div className="ag-split">
        <Card receipt eyebrow="Cohort sau first-open" title="Quay lại sử dụng D1 / D7 / D30">
          <Table columns={retentionColumns} rows={retention} caption="Retention quan sát được" rowKey={(r, i) => `${str(r.day)}-${i}`} />
          <p className="ap-card-note">Cohort bắt đầu ở first-open quan sát được sau khi đồng ý thống kê. Chỉ tính cohort đã đủ tuổi; không đại diện toàn bộ lượt cài.</p>
        </Card>
        <div className="ag-col">
          <Card receipt eyebrow="Android" title="Phiên bản đang được dùng">
            {shown.length ? (
              <ul className="ag-bar-list">
                {shown.map((v, i) => (
                  <li key={v.name}>
                    <span>{v.name}</span>
                    <Progress value={v.users} max={versionTotal} color={colors[i % colors.length]} />
                    <em>{versionTotal ? Math.round((v.users / versionTotal) * 100) : 0}% · {formatNumber(v.users)}</em>
                  </li>
                ))}
              </ul>
            ) : <p className="ap-card-note">Chưa có dữ liệu phiên bản trong kỳ.</p>}
            <p className="ap-card-note">Mỗi tài khoản được tính ở phiên bản quan sát gần nhất trong kỳ.</p>
          </Card>
          <Card eyebrow={`${days} ngày qua`} title="Đăng ký đến hoạt động" compact>
            <ul className="ag-kv">
              <li>Đăng ký trong kỳ<b>{formatNumber(funnel.registered)}</b></li>
              <li>Đã xác minh<b>{formatNumber(funnel.verified)}</b></li>
              <li>Hoạt động quan sát được<b>{formatNumber(t.observed ? funnel.observedActive : undefined)}</b></li>
            </ul>
            <p className="ap-card-note">Chỉ gồm người đồng ý chia sẻ; không phải tỷ lệ chuyển đổi đầy đủ.</p>
          </Card>
        </div>
      </div>

      <EventsCard events={t.events} eyebrow={`${days} ngày qua`} p={p} />
      <Footnote p={p}>“—” nghĩa là chưa có nguồn đo; không thu thập được lịch sử trước khi bật đo lường.</Footnote>
    </>
  );
}

/* ---------- OCR · Figma 13 (150:7293) ---------- */
const diagnosticName: Record<string, string> = {
  ocr_low_quality: "Ảnh mờ / thiếu sáng",
  ocr_not_receipt: "Không phải hoá đơn",
  ocr_timeout: "Quá thời gian chờ",
};

export function OcrView(p: ViewProps) {
  const { data, query } = p;
  const days = rows(data.rows);
  const resultsPage = queryPage(query.resultsPage, days.length);
  const visibleDays = days.slice(resultsPage * PAGE_SIZE, (resultsPage + 1) * PAGE_SIZE);
  const scans = sum(days, "scans"), ok = sum(days, "successful");
  const avg = scans ? days.reduce((s, r) => s + (num(r.average_ms) ?? 0) * (num(r.scans) ?? 0), 0) / scans : undefined;
  const p95 = days.length ? Math.max(...days.map((r) => num(r.p95_ms) ?? 0)) : undefined;
  const rate = scans ? Math.round((ok / scans) * 1000) / 10 : undefined;
  const diagnostics = rows(data.diagnostics);
  const scope = `${days.length} ngày đang hiển thị`;

  const columns: Column<Row>[] = [
    { key: "day", label: "Ngày", render: (r) => formatDate(r.day) },
    { key: "scans", label: "Lượt", align: "right", render: (r) => formatNumber(r.scans) },
    { key: "successful", label: "Thành công", render: (r) => {
      const s = num(r.scans) ?? 0, k = num(r.successful) ?? 0;
      if (!s) return "—";
      const pct = Math.round((k / s) * 100);
      const tone: ChipTone = pct >= 93 ? "success" : pct >= 80 ? "warning" : "danger";
      return <span className="ap-row" style={{ gap: 8, flexWrap: "nowrap" }}><Chip tone={tone}>{pct}%</Chip><span className="ag-muted">{formatNumber(k)}</span></span>;
    } },
    { key: "average_ms", label: "TB (ms)", align: "right", render: (r) => formatNumber(r.average_ms) },
    { key: "p95_ms", label: "P95 (ms)", align: "right", render: (r) => formatNumber(r.p95_ms) },
  ];
  const diagColumns: Column<Row>[] = [
    { key: "metric", label: "Loại sự kiện", render: (r) => diagnosticName[str(r.metric)] ?? label(r.metric) },
    { key: "day", label: "Ngày (UTC)", muted: true, render: (r) => formatDate(r.day) },
    { key: "value", label: "Số lượt", align: "right", render: (r) => <b>{formatNumber(r.value)}</b> },
    { key: "observed_at", label: "Cập nhật", muted: true, render: (r) => relativeTime(r.observed_at) },
  ];

  return (
    <>
      <div className="ap-grid ap-grid-4">
        <Kpi icon="receipt" tone="coral" label="Lượt xử lý cloud" value={formatNumber(days.length ? scans : undefined)} note={scope} />
        <Kpi icon="check" tone="mint" label="Thành công" value={rate === undefined ? "—" : `${formatNumber(rate)}%`} note={days.length ? `${formatNumber(ok)} hoá đơn đọc được` : "Chưa có dữ liệu"} />
        <Kpi icon="chart" tone="blue" label="Thời gian trung bình" value={avg === undefined ? "—" : `${formatNumber(Math.round(avg))} ms`} note="Trung bình theo số lượt từng ngày" />
        <Kpi icon="alert" tone="lilac" label="p95 cao nhất" value={p95 === undefined ? "—" : `${formatNumber(p95)} ms`} note="Giá trị p95 lớn nhất theo ngày" />
      </div>

      <div className="ag-split">
        <Card receipt eyebrow={scope} title="Kết quả theo ngày">
          <Table columns={columns} rows={visibleDays} caption="Kết quả nhận diện hoá đơn theo ngày" rowKey={(r, i) => `${str(r.day)}-${resultsPage * PAGE_SIZE + i}`} />
          <AdminPager base="/admin/ocr" query={query} page={resultsPage} total={days.length} pageSize={PAGE_SIZE} pageParam="resultsPage" />
        </Card>
        <Card receipt eyebrow="Vận hành" title="Hạn mức và lỗi">
          <Table columns={diagColumns} rows={diagnostics} caption="Sự kiện backend" empty="Chưa có sự kiện lỗi được ghi nhận." rowKey={(r, i) => `${str(r.metric)}-${str(r.day)}-${i}`} />
          <p className="ap-card-note">Bắt đầu ghi nhận khi backend mới được triển khai; không suy dữ liệu lịch sử từ số lượt quét thành công.</p>
        </Card>
      </div>
      <Footnote p={p} />
    </>
  );
}
