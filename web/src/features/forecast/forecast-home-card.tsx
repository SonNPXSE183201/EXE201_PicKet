import Link from "next/link";
import { forecastAccess, forecastStatus } from "@picket/domain";
import { BalanceAmount } from "@/app/(finance)/balance-privacy";
import { Icon } from "@/core/ui/workspace-icon";
import { ForecastStatusChip } from "./forecast-detail";
import { percentOf, shortDay } from "./forecast-geometry";
import type { WebForecast } from "./load-forecast";

export function ForecastHomeCard({ data }: { data: WebForecast }) {
  const { settings, forecast, currency } = data;
  const access = forecastAccess(settings);
  if (access === "hidden" || data.settingsError) return null;
  const fmt = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount).replace(/^-/, "−");
  if (access === "locked" || access === "signIn") return <Link href={access === "locked" ? "/forecast" : "/login"} className="fc-card fc-home fc-home-gated" aria-label={access === "locked" ? "Xem bạn còn bao nhiêu tiền cuối tháng" : "Đăng nhập để xem dự báo"}><span className="fc-lock-icon"><Icon name={access === "locked" ? "lock" : "person"} /></span><div className="fc-col"><p className="fc-eyebrow">DỰ BÁO CUỐI THÁNG</p><h2>{access === "locked" ? "Xem bạn còn bao nhiêu tiền cuối tháng" : "Đăng nhập để xem dự báo"}</h2><p className="fc-muted">{access === "locked" ? "Dự báo cuối tháng có trong gói Plus và Pro." : "Dự báo cuối tháng dành cho tài khoản Plus và Pro. Bạn đang dùng trên thiết bị."}</p><span className="fc-chip fc-chip-outline">{access === "locked" ? "Plus · Pro" : "Đăng nhập"}</span></div></Link>;
  if (!forecast) return null;
  if (forecast.status === "insufficient-history") return <section className="fc-card fc-home"><p className="fc-eyebrow">DỰ BÁO CUỐI THÁNG</p><h2>Cần thêm dữ liệu để dự báo</h2><p className="fc-muted">{forecast.historyDays < forecast.neededDays ? `Ghi chép thêm ${forecast.neededDays - forecast.historyDays} ngày nữa để PicKet dự báo số dư cuối tháng.` : "PicKet cần ít nhất một tháng trước có ghi chép để so sánh."}</p><div className="fc-track" role="progressbar" aria-valuemin={0} aria-valuemax={forecast.neededDays} aria-valuenow={Math.min(forecast.historyDays, forecast.neededDays)} aria-label="Số ngày đã ghi chép"><span style={{ width: `${percentOf(forecast.historyDays, forecast.neededDays)}%` }} /></div><small>Đã có {forecast.historyDays}/{forecast.neededDays} ngày ghi chép</small></section>;
  const status = forecastStatus(forecast);
  const statusText = status.kind === "ok" ? "Đủ tiền đến cuối tháng" : `${status.kind === "negative" ? "Dự báo số dư âm từ " : "Có thể thiếu tiền từ "}${shortDay(status.day)}`;
  return <Link className="fc-card fc-home" href="/forecast" aria-label={`Xem chi tiết dự báo. ${statusText}`}><div className="fc-head"><p className="fc-eyebrow">DỰ BÁO CUỐI THÁNG</p><Icon name="chevronRight" /></div><p className="fc-muted">Cuối tháng còn khoảng</p><p className={`fc-home-amount${forecast.expected < 0 ? " fc-neg" : ""}`}><BalanceAmount value={fmt(forecast.expected)} /></p>{forecast.monthsUsed > 1 && forecast.low !== forecast.high && <p className="fc-muted">Khoảng <BalanceAmount value={fmt(forecast.low)} /> – <BalanceAmount value={fmt(forecast.high)} /></p>}<ForecastStatusChip forecast={forecast} /></Link>;
}
