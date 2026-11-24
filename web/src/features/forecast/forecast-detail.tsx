"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { applyPurchase, forecastStatus, parseScenarioAmount, spendingPace, type MonthForecast } from "@picket/domain";
import { BalanceAmount, useBalancePrivacy } from "@/app/(finance)/balance-privacy";
import { Notice } from "@/core/ui/notice";
import { Icon } from "@/core/ui/workspace-icon";
import { chartGeometry, percentOf, shortDay } from "./forecast-geometry";

type Ready = Extract<MonthForecast, { status: "ready" }>;
const chartWidth = 660;
const chartHeight = 150;

export function ForecastChart({ path, scenario }: { path: Ready["path"]; scenario?: Ready | null }) {
  const { hidden } = useBalancePrivacy();
  if (hidden) return <p className="fc-muted">Số tiền đang được ẩn</p>;
  const scale = [...path, ...(scenario?.path ?? [])];
  const g = chartGeometry(path, chartWidth, chartHeight, 8, scale);
  const s = scenario ? chartGeometry(scenario.path, chartWidth, chartHeight, 8, scale) : null;
  const lowestPath = scenario?.path ?? path;
  const lowestIndex = lowestPath.reduce((best, point, i) => point.expected < lowestPath[best].expected ? i : best, 0);
  const lowest = lowestPath[lowestIndex];
  const positions = (s ?? g).line.split(" ")[lowestIndex].split(",").map(Number);
  const riskDay = scenario?.negativeDay ?? scenario?.riskDay;
  return <figure className="fc-chart">
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Số dư dự kiến theo ngày đến cuối tháng. ${riskDay ? `Chạm 0 ₫ ngày ${shortDay(riskDay)}` : `Thấp nhất ${shortDay(lowest.day)}`}`} preserveAspectRatio="none">
      <line className="fc-grid" x1="0" x2={chartWidth} y1={g.topY} y2={g.topY} /><line className="fc-zero" x1="0" x2={chartWidth} y1={g.baseY} y2={g.baseY} /><path className="fc-band" d={g.band} />
      <polyline className="fc-line" points={g.line} fill="none" vectorEffect="non-scaling-stroke" />
      {s && <polyline className="fc-scenario-line" points={s.line} fill="none" vectorEffect="non-scaling-stroke" />}
      <circle className="fc-dot" cx={g.today.x} cy={g.today.y} r="5" vectorEffect="non-scaling-stroke" /><circle className={scenario ? "fc-dot fc-dot-scenario" : "fc-dot"} cx={positions[0]} cy={positions[1]} r="5" vectorEffect="non-scaling-stroke" />
    </svg>
    <div className="fc-chart-annotation"><span className={`fc-chip ${riskDay ? "fc-chip-warn" : "fc-chip-ok"}`}>{riskDay ? `Chạm 0 ₫ ngày ${shortDay(riskDay)}` : `Thấp nhất ${shortDay(lowest.day)}`}</span></div>
    <div className="fc-axis"><span>Hôm nay</span><span>{shortDay(path[Math.floor((path.length - 1) / 2)].day)}</span><span>{shortDay(path[path.length - 1].day)}</span></div>
    <figcaption className="fc-legend"><span><i className="fc-line-sample" />Dự báo</span><span><i className="fc-band-sample" />Khoảng dao động</span>{scenario && <span><i className="fc-scenario-sample" />Nếu mua</span>}</figcaption>
  </figure>;
}
export function ForecastStatusChip({ forecast }: { forecast: Ready }) {
  const status = forecastStatus(forecast);
  return <span className={`fc-chip ${status.kind === "ok" ? "fc-chip-ok" : "fc-chip-warn"}`}>{status.kind === "ok" ? "Đủ tiền đến cuối tháng" : `${status.kind === "negative" ? "Dự báo số dư âm từ " : "Có thể thiếu tiền từ "}${shortDay(status.day)}`}</span>;
}

export function ForecastDetail({ forecast, scenarioAllowed, currency }: { forecast: MonthForecast; scenarioAllowed: boolean; currency: string }) {
  const fmt = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount).replace(/^-/, "−");
  const [amountText, setAmountText] = useState("");
  const amountId = useId();
  if (forecast.status === "insufficient-history") {
    const missing = Math.max(0, forecast.neededDays - forecast.historyDays);
    return <div className="fc-col"><section className="fc-card fc-empty" aria-labelledby="fc-need"><Image src="/paper/save-jar-v1.webp" alt="" width={96} height={96} /><h2 id="fc-need">Cần thêm dữ liệu để dự báo</h2><p className="fc-muted">{missing ? `Ghi chép thêm ${missing} ngày nữa (đã có ${forecast.historyDays}/${forecast.neededDays} ngày trong 90 ngày qua) để PicKet dự báo số dư cuối tháng.` : "PicKet cần ít nhất một tháng trước có ghi chép để so sánh. Hãy tiếp tục ghi chép, dự báo sẽ tự xuất hiện."}</p><div className="fc-track" role="progressbar" aria-valuemin={0} aria-valuemax={forecast.neededDays} aria-valuenow={Math.min(forecast.historyDays, forecast.neededDays)} aria-label="Số ngày đã ghi chép"><span style={{ width: `${percentOf(forecast.historyDays, forecast.neededDays)}%` }} /></div><small>Đã có {forecast.historyDays}/{forecast.neededDays} ngày ghi chép</small><Link className="button primary" href="/transactions#new">Thêm giao dịch</Link></section><Notice title="Mỗi ngày ghi một khoản" body="Ghi chép đều tay giúp dự báo sát hơn." /><p className="fc-muted">Đây là ước tính từ dữ liệu bạn đã ghi, không phải lời khuyên tài chính.</p></div>;
  }
  const parsed = parseScenarioAmount(amountText);
  let what: Ready | null = null;
  if (scenarioAllowed && parsed) { try { what = applyPurchase(forecast, parsed); } catch { /* Invalid resulting balances must not break the page. */ } }
  const pace = spendingPace(forecast);
  const spendMax = Math.max(1, forecast.spentSoFar, forecast.typicalSpentSoFar);
  const status = forecastStatus(forecast);
  const amount = (value: number) => <BalanceAmount value={fmt(value)} />;
  return <div className="fc-detail-grid">
    <section className="fc-hero fc-summary" aria-label="Số dư dự kiến cuối tháng"><Image src="/paper/month-close-scene-v1.webp" alt="" width={72} height={72} /><div className="fc-hero-copy"><p className="fc-hero-label">SỐ DƯ DỰ KIẾN NGÀY {shortDay(forecast.endDay)}</p><p className="fc-big">{amount(forecast.expected)}</p>{forecast.monthsUsed > 1 && forecast.low !== forecast.high && <p>Khoảng {amount(forecast.low)} – {amount(forecast.high)}</p>}</div><ForecastStatusChip forecast={forecast} /></section>
    {status.kind !== "ok" && <div className="fc-risk"><Notice tone="warning" title={`Có thể thiếu tiền từ ${shortDay(status.day)}`} body={<>Số dư thấp nhất dự kiến {amount(forecast.lowest.expected)} vào {shortDay(forecast.lowest.day)}.</>} /></div>}
    <div className="fc-tiles">
      <div className="fc-tile"><small>Số dư hiện tại</small><b>{amount(forecast.balanceNow)}</b></div><div className="fc-tile"><small>Số dư thấp nhất</small><b className={forecast.lowest.expected < 0 ? "fc-neg" : undefined}>{amount(forecast.lowest.expected)}</b><small>{shortDay(forecast.lowest.day)}</small></div>
      <div className="fc-tile"><small>Thu nhập dự kiến còn lại</small><b className="fc-pos">+{amount(forecast.remainingIncome)}</b></div><div className="fc-tile"><small>Chi tiêu dự kiến còn lại</small><b className="fc-neg">−{amount(forecast.remainingExpense)}</b></div>
    </div>
    <div className="fc-chart-row"><section className="fc-card fc-chart-card"><h2>Số dư dự kiến theo ngày</h2><ForecastChart path={forecast.path} scenario={what} /></section>
    <section className="fc-card fc-spending"><h2>So với thường lệ</h2><div className="fc-bar-row"><span>Đã chi đến nay</span><b>{amount(forecast.spentSoFar)}</b></div><div className="fc-track fc-track-expense"><span style={{ width: `${percentOf(forecast.spentSoFar, spendMax)}%` }} /></div><div className="fc-bar-row"><span>Thường lệ cùng thời điểm</span><b>{amount(forecast.typicalSpentSoFar)}</b></div><div className="fc-track fc-track-muted"><span style={{ width: `${percentOf(forecast.typicalSpentSoFar, spendMax)}%` }} /></div>{pace !== null && <p className="fc-muted">{Math.abs(pace) < 5 ? "Tháng này bạn chi tương đương cùng kỳ các tháng trước." : `Tháng này bạn đang chi ${pace > 0 ? "nhiều" : "ít"} hơn ${Math.abs(pace)}% so với cùng kỳ các tháng trước.`}</p>}</section>
    </div><section className="fc-card fc-scenario" aria-labelledby="fc-if"><div className="fc-head"><h2 id="fc-if">Nếu tôi mua hôm nay</h2><span className="fc-chip fc-chip-pro">PRO</span></div>{scenarioAllowed ? <>
      <p className="fc-muted">Nhập số tiền để xem số dư cuối tháng thay đổi thế nào.</p><div className="fc-money-input"><input id={amountId} aria-label="Số tiền dự định chi" placeholder="Số tiền dự định chi" inputMode="numeric" autoComplete="off" value={amountText} onChange={event => { const raw = event.target.value; if (/^[\d.,\s]*$/.test(raw)) { const digits = raw.replace(/[.,\s]/g, ""); if (digits.length <= 13) setAmountText(digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : ""); } }} onBlur={() => { if (parsed) setAmountText(new Intl.NumberFormat("vi-VN").format(parsed)); }} /><span>{currency === "VND" ? "₫" : currency}</span></div>
      {what && <div className="fc-scenario-result" role="status"><p>Sau khi mua, cuối tháng còn khoảng {amount(what.expected)}.</p>{forecastStatus(what).kind !== "ok" && <ForecastStatusChip forecast={what} />}<button className="fc-link" type="button" aria-label="Bỏ kịch bản" onClick={() => setAmountText("")}>Bỏ kịch bản</button></div>}
    </> : <><div className="fc-locked"><Icon name="lock" /><p>Kịch bản &quot;Nếu tôi mua&quot; dành cho gói Pro. Gói Plus chỉ có dự báo cuối tháng.</p></div><Link className="button primary" href="/billing">Nâng cấp lên Pro</Link></>}</section>
    <section className="fc-card fc-method" aria-label="Phương pháp và lưu ý"><p className="fc-eyebrow">PHƯƠNG PHÁP</p><p className="fc-muted">Dựa trên {forecast.monthsUsed} tháng trước: số dư hiện tại cộng thu chi thường gặp từ ngày mai đến cuối tháng (lấy trung vị).</p>{forecast.monthsUsed === 1 && <p className="fc-muted">Mới có 1 tháng để so sánh nên dự báo chưa chắc chắn.</p>}<p className="fc-muted">Đây là ước tính từ dữ liệu bạn đã ghi, không phải lời khuyên tài chính. Dự báo chỉ tính trên thiết bị và không gửi giao dịch đi đâu.</p></section>
  </div>;
}
