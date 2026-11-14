import Link from "next/link";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { AdminIcon } from "../ui/admin-icon";
import { Banner, Card, Chip, Kpi, formatNumber } from "../ui/paper";
import {
  FINANCE_PERIODS, FINANCE_PERIOD_LABELS, bucketKey, bucketKeys, bucketLabel, bucketTitle, chartPlan, financeRange, parseAnchor, parseFinancePeriod, shiftAnchor,
  type ChartPlan, type FinancePeriod,
} from "../finance-period";
import { REVENUE_SOURCE_LABELS } from "./revenue-labels";
import { SlidingTabs } from "./sliding-tabs";
import { RevenueBars, type SeriesRow } from "./revenue-bars";
import "./modules.css";

type Query = Record<string, string | undefined>;
type Summary = {
  confirmedVnd: number; estimatedVnd: number; reviewVnd: number;
  unconverted: { currency: string; amount: number }[];
  bySource: { source: string; name: string; enabled: boolean; confirmed: number; estimated: number; charges: number; refunded: number }[];
  series: SeriesRow[];
};
const dayOf = (period: string) => period.slice(0, 10);

/** One column per unit of the chosen filter, including units with no revenue. */
function buildColumns(plan: ChartPlan, series: SeriesRow[]) {
  const sources = [...new Set(series.map((r) => r.source))];
  const columns = bucketKeys(plan.bucket, plan.start, plan.end).map((key) => {
    const parts = sources.map((source) => ({
      source,
      amount: series.filter((r) => r.source === source && bucketKey(plan.bucket, dayOf(r.period)) === key).reduce((t, r) => t + r.amount, 0),
    }));
    return { key, parts, total: parts.reduce((t, p) => t + p.amount, 0), label: bucketLabel(plan.bucket, key), title: bucketTitle(plan.bucket, key) };
  });
  return { columns, sources };
}

const periodHref = (period: FinancePeriod, anchor: string, dir?: "next" | "prev") => `/admin/finance?period=${period}&date=${anchor}${dir ? `&dir=${dir}` : ""}`;

export async function FinanceAdmin({ query }: { query: Query }) {
  const { api, accessToken } = await requireApiSession("admin");
  const period = parseFinancePeriod(query.period);
  const anchor = parseAnchor(query.date);
  const direction = query.dir === "next" || query.dir === "prev" ? query.dir : "none";
  const range = financeRange(period, anchor);
  const plan = chartPlan(period, anchor);
  const today = parseAnchor(undefined);
  const [summary, chart] = await Promise.all([
    api.adminRevenue<Summary>(accessToken, { from: range.from, to: range.to, bucket: "day" }),
    api.adminRevenue<Summary>(accessToken, { from: plan.from, to: plan.to, bucket: plan.rpcBucket }),
  ]);
  const { columns, sources } = buildColumns(plan, chart.series);
  const refunded = summary.bySource.reduce((t, s) => t + s.refunded, 0);
  const charges = summary.bySource.reduce((t, s) => t + s.charges, 0);
  const gross = summary.confirmedVnd + refunded;
  const prev = shiftAnchor(period, anchor, -1);
  const next = shiftAnchor(period, anchor, 1);
  const canNext = financeRange(period, next).start <= today;
  const selectedKeys = new Set(bucketKeys(plan.bucket, range.start, range.end).map((k) => k));
  const exportQuery = new URLSearchParams({ from: range.from, to: range.to }).toString();
  const ledgerHref = `/admin/revenue?${new URLSearchParams({ from: `${range.start}T00:00`, to: `${range.end}T23:59` })}`;
  const CHART_EYEBROW: Record<ChartPlan["bucket"], string> = {
    day: `Từng ngày · tháng ${plan.start.slice(5, 7)}/${plan.start.slice(0, 4)}`,
    week: `Từng tuần · quý ${(Number(plan.start.slice(5, 7)) - 1) / 3 + 1}/${plan.start.slice(0, 4)}`,
    month: `Từng tháng · năm ${plan.start.slice(0, 4)}`,
    quarter: `Từng quý · năm ${plan.start.slice(0, 4)}`,
    year: `Từng năm · ${plan.start.slice(0, 4)} – ${plan.end.slice(0, 4)}`,
  };
  const chartEyebrow = CHART_EYEBROW[plan.bucket];

  return (
    <>
      <p className="ap-card-note am-lead">
        Báo cáo tài chính doanh thu theo VND (giờ Việt Nam). Chỉ cộng các khoản <strong>đã xác nhận</strong>, đã trừ hoàn tiền; khoản tạm tính của
        Google Play và giao dịch thử nghiệm được tách riêng.
      </p>

      <div className="ap-filter fin-toolbar">
        <SlidingTabs label="Chu kỳ báo cáo" activeKey={period} tabs={FINANCE_PERIODS.map((p) => ({ key: p, label: FINANCE_PERIOD_LABELS[p], href: periodHref(p, anchor, FINANCE_PERIODS.indexOf(p) > FINANCE_PERIODS.indexOf(period) ? "next" : "prev") }))} />
        <div className="fin-nav">
          <Link className="ap-icon-btn" href={periodHref(period, prev, "prev")} aria-label="Kỳ trước"><AdminIcon name="chevron-right" size={16} /></Link>
          <strong>{range.label}</strong>
          {canNext
            ? <Link className="ap-icon-btn" href={periodHref(period, next, "next")} aria-label="Kỳ sau"><AdminIcon name="chevron-right" size={16} /></Link>
            : <span className="ap-icon-btn is-disabled" aria-hidden="true"><AdminIcon name="chevron-right" size={16} /></span>}
          {anchor !== today && <Link className="ap-btn is-secondary" href={periodHref(period, today)}>Hôm nay</Link>}
        </div>
        <form className="fin-jump" method="get" aria-label="Chọn ngày">
          <input type="hidden" name="period" value={period} />
          <input type="date" name="date" defaultValue={anchor} max={today} aria-label="Chọn ngày trong kỳ" />
          <button className="ap-btn is-secondary" type="submit">Xem</button>
        </form>
        <a className="ap-btn is-secondary" href={`/api/admin/revenue/export?${exportQuery}`}><AdminIcon name="download" size={18} />Tải CSV</a>
      </div>

      <div key={`${period}-${anchor}`} className={`fin-slide is-${direction}`}>
      <section className="am-kpis" aria-label={`Tổng quan ${range.label}`}>
        <Kpi icon="cash" tone="mint" label="Doanh thu ròng" value={formatVnd(summary.confirmedVnd)} note={range.label} />
        <Kpi icon="wallet" tone="lilac" label="Doanh thu gộp" value={formatVnd(gross)} note={`${formatNumber(charges)} khoản thu`} />
        <Kpi icon="alert" tone="coral" label="Hoàn tiền" value={formatVnd(refunded)} note="Đã trừ khỏi doanh thu ròng" />
        <Kpi icon="calendar" tone="blue" label="Tạm tính" value={formatVnd(summary.estimatedVnd)} note="Chờ báo cáo Google" />
        <Kpi icon="alert" tone="cream" label="Cần đối soát" value={formatVnd(summary.reviewVnd)} note="Không tính vào doanh thu" />
      </section>
      {!!summary.unconverted.length && (
        <Banner icon="alert" title={`Chưa quy đổi VND: ${summary.unconverted.map((u) => `${u.amount} ${u.currency}`).join(", ")}`} />
      )}

      <Card receipt eyebrow={chartEyebrow} title="Biểu đồ doanh thu">
        {columns.some((c) => c.total > 0) ? (
          <RevenueBars columns={columns} sources={sources} isSelected={(key) => selectedKeys.has(key)} />
        ) : <p className="ap-card-note">Chưa có khoản thu trong khoảng thời gian này.</p>}
      </Card>

      <Card receipt eyebrow="Tổng hợp" title="Theo nguồn thu" note={range.label}>
        <div className="fin-sources">
          {summary.bySource.map((s) => (
            <section key={s.source} className="fin-source">
              <div className="am-sources-head"><b>{REVENUE_SOURCE_LABELS[s.source] ?? s.name}</b><Chip tone={s.enabled ? "success" : "outline"}>{s.enabled ? "Đang nhận" : "Đã ngừng"}</Chip></div>
              <dl className="am-dl">
                <div><dt>Đã xác nhận</dt><dd>{formatVnd(s.confirmed)}</dd></div>
                <div><dt>Tạm tính</dt><dd>{formatVnd(s.estimated)}</dd></div>
                <div><dt>Đã hoàn</dt><dd>{formatVnd(s.refunded)}</dd></div>
                <div><dt>Số khoản thu</dt><dd>{s.charges}</dd></div>
              </dl>
            </section>
          ))}
        </div>
        <p className="ap-card-note"><Link className="am-link" href={ledgerHref}>Xem sổ doanh thu chi tiết của kỳ này →</Link></p>
      </Card>
      </div>
    </>
  );
}
