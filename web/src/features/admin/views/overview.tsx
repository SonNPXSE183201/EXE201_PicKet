import Link from "next/link";
import { AdminIcon } from "../ui/admin-icon";
import { AdminPager } from "../ui/admin-pager";
import { Bars, Card, Chip, Kpi, Table, Tile, formatNumber, relativeTime, type Column } from "../ui/paper";
import { can, componentInfo, componentName, label, num, rows, statusTone, type Row, type ViewProps } from "./shared";
import "./views.css";

/* Figma › Admin Web › 02 · Tổng quan (146:5767). */
const HEALTH_PAGE_SIZE = 5;

export function OverviewView(p: ViewProps) {
  const { data, days } = p;
  const health = rows(data.health);
  const requestedHealthPage = /^\d{1,5}$/.test(p.query.healthPage ?? "") ? Number(p.query.healthPage) : 0;
  const healthPages = Math.max(1, Math.ceil(health.length / HEALTH_PAGE_SIZE));
  const healthPage = Math.min(requestedHealthPage, healthPages - 1);
  const visibleHealth = health.slice(healthPage * HEALTH_PAGE_SIZE, (healthPage + 1) * HEALTH_PAGE_SIZE);
  const degraded = health.filter((h) => !["ok", "healthy"].includes(String(h.status)));
  const daily = rows(data.dailyUsers);
  const values = daily.map((d) => num(d.value) ?? 0);
  const newUsers = num(data.newUsers), previous = num(data.newUsersPrevious);
  const growth = newUsers !== undefined && previous ? Math.round(((newUsers - previous) / previous) * 100) : undefined;
  const total = num(data.totalUsers), verified = num(data.verifiedUsers);
  const openTickets = num(data.openTickets), openIncidents = num(data.openIncidents), urgent = num(data.urgentTickets);
  const usersHref = can(p, "users") ? "/admin/users" : undefined;

  const columns: Column<Row>[] = [
    { key: "component", label: "Thành phần", render: (r) => <span className="ap-row" style={{ flexWrap: "nowrap" }}><Tile icon={componentInfo[String(r.component)]?.icon ?? "grid"} tone={componentInfo[String(r.component)]?.tone ?? "cream"} /><b style={{ fontWeight: 700, fontSize: 14 }}>{componentName(r.component)}</b></span> },
    { key: "status", label: "Kết quả", render: (r) => <Chip tone={statusTone(r.status)}>{label(r.status)}</Chip> },
    { key: "latency_ms", label: "Độ trễ", align: "right", render: (r) => (num(r.latency_ms) === undefined ? "—" : `${formatNumber(r.latency_ms)} ms`) },
    { key: "checked_at", label: "Kiểm tra", align: "right", render: (r) => relativeTime(r.checked_at) },
  ];

  const shortcuts = [
    can(p, "users") && { href: "/admin/users", icon: "users", tone: "coral", title: "Người dùng", note: `${formatNumber(total)} tài khoản` },
    can(p, "tickets") && { href: "/admin/tickets", icon: "mail", tone: "lilac", title: "Hỗ trợ", note: `${formatNumber(openTickets)} yêu cầu đang mở` },
    can(p, "health") && { href: "/admin/health", icon: "shield", tone: "mint", title: "Sức khoẻ hệ thống", note: degraded.length ? `${degraded.length} thành phần suy giảm` : "Mọi thành phần bình thường" },
    can(p, "incidents") && { href: "/admin/incidents", icon: "alert", tone: "blue", title: "Sự cố", note: `${formatNumber(openIncidents)} đang điều tra` },
  ].filter(Boolean) as { href: string; icon: string; tone: string; title: string; note: string }[];

  return (
    <>
      <p className="ap-greeting">
        Chào {p.greetingName ?? "bạn"}, đây là Picket trong {days} ngày qua.
        <Chip tone={degraded.length ? "warning" : "success"}>{degraded.length ? `${degraded.length} dịch vụ cần chú ý` : "Mọi dịch vụ ổn định"}</Chip>
      </p>

      <div className="av-hero-row">
        <Card receipt className="av-users-card">
          <img className="av-users-art" src="/admin-paper/money-bloom-scene-v1.webp" alt="" width={150} height={126} />
          <span className="ap-eyebrow">Người dùng Picket</span>
          <div className="ap-row">
            <p className="ap-kpi-value is-hero">{formatNumber(total)}</p>
            {newUsers !== undefined && <Chip tone="success">+{formatNumber(newUsers)} trong {days} ngày</Chip>}
          </div>
          <p className="ap-card-note">Tài khoản hiện có, không gồm nhân sự quản trị</p>
          {values.length ? (
            <div className="av-chart">
              <Bars values={values} label={`Đăng ký mỗi ngày trong ${days} ngày; hôm nay ${values.at(-1)}`} />
              <div className="av-chart-axis"><span>{shortDay(daily[0]?.day)}</span><span>Đăng ký mỗi ngày</span><b>Hôm nay {formatNumber(values.at(-1))}</b></div>
            </div>
          ) : <p className="ap-card-note">Chưa có lượt đăng ký trong kỳ.</p>}
        </Card>

        <div className="ap-grid ap-grid-2 av-kpis">
          <Kpi icon="users" tone="coral" label="Đăng ký trong kỳ" value={formatNumber(newUsers)} href={usersHref}
            chip={growth !== undefined ? <Chip tone={growth >= 0 ? "success" : "danger"}>{growth >= 0 ? "+" : ""}{growth}%</Chip> : undefined}
            note={`Kỳ trước: ${formatNumber(previous)} · cùng thời lượng`} />
          <Kpi icon="check" tone="mint" label="Email đã xác minh" value={formatNumber(verified)}
            note={total && verified !== undefined ? `${Math.round((verified / total) * 100)}% tài khoản hiện có` : "Không gồm nhân sự quản trị"} />
          <Kpi icon="wallet" tone="blue" label="Thuê bao Play hiệu lực" value={formatNumber(data.paidUsers)} href={can(p, "billing") ? "/admin/billing" : undefined}
            note={`Test ${formatNumber(data.testUsers)} · Chưa xác định ${formatNumber(data.unknownPurchaseUsers)}`} />
          <Kpi icon="mail" tone="lilac" label="Yêu cầu đang mở" value={formatNumber(openTickets)} href={can(p, "tickets") ? "/admin/tickets" : undefined}
            note={`${urgent !== undefined ? `${formatNumber(urgent)} khẩn cấp · ` : ""}${formatNumber(openIncidents)} sự cố đang mở`} />
        </div>
      </div>

      <div className="ap-split">
        <Card receipt eyebrow="Probe gần nhất" title="Tình trạng dịch vụ"
          actions={can(p, "health") ? <Link className="ap-link" href="/admin/health">Xem sức khoẻ hệ thống</Link> : undefined}>
          <Table columns={columns} rows={visibleHealth} caption="Probe gần nhất của từng thành phần" rowKey={(r, i) => `${String(r.component)}-${healthPage * HEALTH_PAGE_SIZE + i}`} />
          <AdminPager base="/admin" query={p.query} page={healthPage} total={health.length} pageSize={HEALTH_PAGE_SIZE} pageParam="healthPage" />
          <p className="ap-footnote"><AdminIcon name="sparkle" size={14} />Chưa có snapshot lịch sử cho KPI quyền và ticket; không suy ra tỷ lệ tăng trưởng từ số hiện tại.</p>
        </Card>
        {shortcuts.length > 0 && (
          <nav className="av-shortcuts" aria-label="Lối tắt">
            <span className="ap-eyebrow">Lối tắt</span>
            {shortcuts.map((s) => (
              <Link key={s.href} href={s.href} className={`av-folder is-${s.tone}`}>
                <Tile icon={s.icon} large />
                <span><b>{s.title}</b><small>{s.note}</small></span>
                <AdminIcon name="chevron-right" size={16} />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

function shortDay(value: unknown) {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(value ?? ""));
  return m ? `${Number(m[3])}/${Number(m[2])}` : "";
}
