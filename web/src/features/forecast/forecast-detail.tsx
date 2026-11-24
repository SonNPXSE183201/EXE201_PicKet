"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { applyPurchase, forecastStatus, parseScenarioAmount, spendingPace, type MonthForecast } from "@picket/domain";

import { BalanceAmount } from "@/app/(finance)/balance-privacy";
import { chartGeometry, percentOf, shortDay } from "./forecast-geometry";

type Ready = Extract<MonthForecast, { status: "ready" }>;
const chartWidth = 560;
const chartHeight = 150;

export function ForecastChart({ path }: { path: Ready["path"] }) {
  const g = chartGeometry(path, chartWidth, chartHeight);
  return (
    <figure className="fc-chart">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Số dư dự kiến theo ngày đến cuối tháng" preserveAspectRatio="none">
        <line className="fc-grid" x1="0" x2={chartWidth} y1={g.topY} y2={g.topY} />
        <line className={g.zeroY === null ? "fc-grid" : "fc-zero"} x1="0" x2={chartWidth} y1={g.baseY} y2={g.baseY} />
        <path className="fc-band" d={g.band} />
        <polyline className="fc-line" points={g.line} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="fc-axis"><span>{shortDay(path[0].day)}</span><span>{shortDay(path[path.length - 1].day)}</span></div>
      <figcaption className="fc-legend">
        <span><svg width="24" height="6" aria-hidden="true"><line className="fc-line" x1="0" x2="24" y1="3" y2="3" /></svg>Dự báo</span>
        <span><svg width="18" height="12" aria-hidden="true"><rect className="fc-band-sample" width="18" height="12" rx="3" /></svg>Khoảng dao động</span>
      </figcaption>
    </figure>
  );
}

export function ForecastStatusChip({ forecast }: { forecast: Ready }) {
  const status = forecastStatus(forecast);
  if (status.kind === "ok") return <span className="fc-chip fc-chip-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>Đủ tiền đến cuối tháng</span>;
  return <span className="fc-chip fc-chip-warn">{status.kind === "negative" ? "Dự báo số dư âm từ " : "Có thể thiếu tiền từ "}{shortDay(status.day)}</span>;
}

/** Full forecast page: summary, chart, key numbers, spending pace and the PRO "if I buy" scenario. */
export function ForecastDetail({ forecast, scenarioAllowed, currency }: { forecast: MonthForecast; scenarioAllowed: boolean; currency: string }) {
  const fmt = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const [amountText, setAmountText] = useState("");
  const [name, setName] = useState("");
  const [applied, setApplied] = useState<number | null>(null);
  const amountId = useId();
  const nameId = useId();

  if (forecast.status === "insufficient-history") {
    const ratio = percentOf(forecast.historyDays, forecast.neededDays);
    return (
      <section className="fc-card fc-empty" aria-labelledby="fc-need">
        <Image src="/paper/state-empty-wallet-v1.png" alt="" width={84} height={84} />
        <h2 id="fc-need">Cần thêm dữ liệu để dự báo</h2>
        <p>{forecast.historyDays >= forecast.neededDays ? "PicKet cần ít nhất một tháng trước có ghi chép để so sánh. Hãy tiếp tục ghi chép, dự báo sẽ tự xuất hiện." : `Ghi chép thêm ${forecast.neededDays - forecast.historyDays} ngày nữa để PicKet dự báo số dư cuối tháng.`}</p>
        <div className="fc-track" role="progressbar" aria-valuemin={0} aria-valuemax={forecast.neededDays} aria-valuenow={Math.min(forecast.historyDays, forecast.neededDays)} aria-label="Số ngày đã ghi chép"><span style={{ width: `${ratio}%` }} /></div>
        <small>Đã có {forecast.historyDays}/{forecast.neededDays} ngày ghi chép</small>
        <Link className="button primary" href="/transactions#new">Thêm giao dịch</Link>
      </section>
    );
  }

  const parsed = parseScenarioAmount(amountText);
  const what = scenarioAllowed && applied ? applyPurchase(forecast, applied) : null;
  const whatStatus = what ? forecastStatus(what) : null;
  const pace = spendingPace(forecast);
  const spendMax = Math.max(1, forecast.spentSoFar, forecast.typicalSpentSoFar);
  return (
    <div className="fc-layout">
      <div className="fc-col">
        <section className="fc-card" aria-label="Số dư dự kiến cuối tháng">
          <div className="fc-head"><p className="fc-eyebrow">Cuối tháng {Number(forecast.month.slice(5))} · dự kiến</p><ForecastStatusChip forecast={forecast} /></div>
          <p className={`fc-big${forecast.expected < 0 ? " fc-neg" : ""}`}><BalanceAmount value={fmt(forecast.expected)} /></p>
          {forecast.monthsUsed > 1 && forecast.low !== forecast.high && <p className="fc-muted">Khoảng <BalanceAmount value={fmt(forecast.low)} /> – <BalanceAmount value={fmt(forecast.high)} /></p>}
          <ForecastChart path={forecast.path} />
        </section>
        <section className="fc-card" aria-labelledby="fc-spend">
          <p className="fc-eyebrow" id="fc-spend">Chi tiêu</p>
          <h2>So với thường lệ</h2>
          <div className="fc-bar-row"><span>Đã chi đến nay</span><b><BalanceAmount value={fmt(forecast.spentSoFar)} /></b></div>
          <div className="fc-track"><span style={{ width: `${percentOf(forecast.spentSoFar, spendMax)}%` }} /></div>
          <div className="fc-bar-row"><span>Thường lệ cùng thời điểm</span><b><BalanceAmount value={fmt(forecast.typicalSpentSoFar)} /></b></div>
          <div className="fc-track fc-track-muted"><span style={{ width: `${percentOf(forecast.typicalSpentSoFar, spendMax)}%` }} /></div>
          {pace !== null && <p className="fc-muted">{Math.abs(pace) < 5 ? "Tháng này bạn chi tương đương cùng kỳ các tháng trước." : `Tháng này bạn đang chi ${pace > 0 ? "nhiều" : "ít"} hơn ${Math.abs(pace)}% so với cùng kỳ các tháng trước.`}</p>}
          <p className="fc-muted">Dựa trên {forecast.monthsUsed} tháng trước (lấy trung vị thu chi từ ngày mai đến cuối tháng).{forecast.monthsUsed === 1 ? " Mới có 1 tháng để so sánh nên dự báo chưa chắc chắn." : ""}</p>
        </section>
      </div>
      <div className="fc-col">
        <div className="fc-tiles">
          <div className="fc-tile"><small>Số dư hiện tại</small><b><BalanceAmount value={fmt(forecast.balanceNow)} /></b><small>{shortDay(forecast.today)}</small></div>
          <div className="fc-tile"><small>Số dư thấp nhất</small><b className={forecast.lowest.expected < 0 ? "fc-neg" : undefined}><BalanceAmount value={fmt(forecast.lowest.expected)} /></b><small>dự kiến {shortDay(forecast.lowest.day)}</small></div>
          <div className="fc-tile"><small>Thu nhập dự kiến còn lại</small><b className="fc-pos">+<BalanceAmount value={fmt(forecast.remainingIncome)} /></b><small>theo nhịp thường lệ</small></div>
          <div className="fc-tile"><small>Chi tiêu dự kiến còn lại</small><b className="fc-neg">−<BalanceAmount value={fmt(forecast.remainingExpense)} /></b><small>theo nhịp thường lệ</small></div>
        </div>
        <section className="fc-card" aria-labelledby="fc-if">
          <div className="fc-head"><h2 id="fc-if">Nếu tôi mua…?</h2><span className="fc-chip fc-chip-pro">PRO</span></div>
          {scenarioAllowed ? (
            <form className="fc-form" onSubmit={(event) => { event.preventDefault(); setApplied(parsed); }}>
              <label htmlFor={nameId}>Món định mua</label>
              <input id={nameId} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} autoComplete="off" />
              <label htmlFor={amountId}>Số tiền</label>
              <input id={amountId} inputMode="numeric" value={amountText} onChange={(event) => { setAmountText(event.target.value); setApplied(null); }} autoComplete="off" />
              <button className="button primary" type="submit" disabled={!parsed}>Tính thử</button>
              {what && whatStatus && (
                <div className={`fc-result${what.expected < 0 ? " fc-result-neg" : ""}`} role="status">
                  <small>{name.trim() ? `Số dư cuối tháng nếu mua “${name.trim()}”` : "Số dư cuối tháng"}</small>
                  <b><BalanceAmount value={fmt(what.expected)} /></b>
                  {whatStatus.kind !== "ok" && <span>{whatStatus.kind === "negative" ? `Dự báo số dư âm từ ${shortDay(whatStatus.day)} nếu mua hôm nay.` : `Có thể thiếu tiền từ ${shortDay(whatStatus.day)}.`}</span>}
                </div>
              )}
            </form>
          ) : (
            <p className="fc-muted">Kịch bản &quot;Nếu tôi mua&quot; dành cho gói PRO. <Link href="/billing">Xem gói PRO</Link></p>
          )}
        </section>
      </div>
    </div>
  );
}
