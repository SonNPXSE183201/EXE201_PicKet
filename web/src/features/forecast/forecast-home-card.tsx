import Image from "next/image";
import Link from "next/link";

import { BalanceAmount } from "@/app/(finance)/balance-privacy";
import { ForecastChart, ForecastStatusChip } from "./forecast-detail";
import { percentOf } from "./forecast-geometry";
import type { WebForecast } from "./load-forecast";

/** Dashboard card: month-end balance estimate. Hidden when admins switch the forecast off. */
export function ForecastHomeCard({ data }: { data: WebForecast }) {
  const { settings, forecast, currency } = data;
  if (!settings.enabled || !forecast) return null;
  const fmt = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  if (forecast.status === "insufficient-history") {
    return (
      <section className="fc-card fc-home fc-empty" aria-labelledby="fc-home-title">
        <Image src="/paper/state-empty-wallet-v1.png" alt="" width={64} height={64} />
        <p className="fc-eyebrow">Dự báo cuối tháng</p>
        <h2 id="fc-home-title">Cần thêm dữ liệu để dự báo</h2>
        <div className="fc-track" role="progressbar" aria-valuemin={0} aria-valuemax={forecast.neededDays} aria-valuenow={Math.min(forecast.historyDays, forecast.neededDays)} aria-label="Số ngày đã ghi chép"><span style={{ width: `${percentOf(forecast.historyDays, forecast.neededDays)}%` }} /></div>
        <small>Đã có {forecast.historyDays}/{forecast.neededDays} ngày ghi chép</small>
      </section>
    );
  }
  return (
    <section className="fc-card fc-home" aria-labelledby="fc-home-title">
      <div className="fc-head"><p className="fc-eyebrow" id="fc-home-title">Dự kiến cuối tháng</p><ForecastStatusChip forecast={forecast} /></div>
      <div className="fc-amount-row">
        <p className={`fc-big${forecast.expected < 0 ? " fc-neg" : ""}`}><BalanceAmount value={fmt(forecast.expected)} /></p>
        <Image src="/paper/picket-money-bloom-v2.png" alt="" width={64} height={64} />
      </div>
      {forecast.monthsUsed > 1 && forecast.low !== forecast.high && <p className="fc-muted">Khoảng <BalanceAmount value={fmt(forecast.low)} /> – <BalanceAmount value={fmt(forecast.high)} /></p>}
      <ForecastChart path={forecast.path} />
      <Link className="fc-link" href="/forecast">Xem chi tiết dự báo</Link>
    </section>
  );
}
