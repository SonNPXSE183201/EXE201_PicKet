import { SubmitButton } from "@/core/ui/submit-button";
import { saveForecastSettingsAction } from "../payment-actions";
import { FORECAST_PLANS, forecastSettingsSummary } from "../forecast-settings-form";
import { Card, Chip, Field, formatDateTime, formatNumber } from "../ui/paper";
import type { ViewProps } from "./shared";

const PLAN_NAMES: Record<string, string> = { free: "Free", plus: "Plus", pro: "Pro" };

/* End-of-month forecast: computed on the user's device; admins switch it, set the history it needs and the plans with the scenario. */
export function ForecastSettingsCard(p: ViewProps) {
  const f = p.forecastSettings;
  if (!f) return null;
  const s = f.settings;
  return (
    <Card receipt eyebrow="Dự báo tài chính" title="Dự báo số dư cuối tháng" actions={<Chip tone="outline">Phiên bản v{formatNumber(s.revision)}</Chip>}>
      <div className="av-card-body">
        <p className="ap-card-note">
          Ứng dụng tự tính dự báo trên thiết bị từ ghi chép của người dùng (so sánh cùng khoảng ngày ở các tháng trước), không gửi giao dịch lên máy chủ.
          Cấu hình có hiệu lực trong khoảng 1 phút. Cần quyền <b>Cấu hình dự báo tài chính</b> và xác thực MFA.
        </p>
        {p.query.forecastSaved && <p className="av-ok" role="status">Đã lưu cấu hình dự báo.</p>}
        {p.query.forecastError && (
          <p className="av-error" role="alert">{p.query.forecastError === "stale"
            ? "Cấu hình vừa được người khác thay đổi. Tải lại trang rồi lưu lại."
            : "Chưa lưu được. Kiểm tra quyền, MFA, số ngày (1–90), số tháng (1–6) và lý do (5–500 ký tự)."}</p>
        )}
        <form action={saveForecastSettingsAction} className="av-form" key={s.revision}>
          <fieldset disabled={!p.mfaVerified}>
            <input type="hidden" name="revision" value={s.revision} />
            <div className="av-switches">
              <label className="av-switch-row">
                <span><b>Bật dự báo cuối tháng</b><small>Thẻ dự báo ở trang chủ và màn chi tiết. Tắt sẽ ẩn hoàn toàn với mọi người dùng.</small></span>
                <span className="ap-switch"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /><span /></span>
              </label>
            </div>
            <div className="av-fields">
              <Field label="Số ngày có ghi chép tối thiểu (90 ngày gần nhất)"><input name="minHistoryDays" type="number" min={1} max={90} step={1} required defaultValue={s.minHistoryDays} /></Field>
              <Field label="Số tháng trước dùng để so sánh"><input name="lookbackMonths" type="number" min={1} max={6} step={1} required defaultValue={s.lookbackMonths} /></Field>
            </div>
            <fieldset className="av-switches" aria-label="Gói có kịch bản Nếu tôi mua">
              <span className="ap-card-note"><b>Kịch bản &quot;Nếu tôi mua&quot;</b> dành cho các gói:</span>
              {FORECAST_PLANS.map((plan) => (
                <label key={plan} className="av-switch-row">
                  <span><b>{PLAN_NAMES[plan]}</b></span>
                  <span className="ap-switch"><input type="checkbox" name="scenarioPlans" value={plan} defaultChecked={s.scenarioPlans.includes(plan)} /><span /></span>
                </label>
              ))}
            </fieldset>
            <div className="av-fields">
              <Field label="Lý do thay đổi" grow><input name="reason" minLength={5} maxLength={500} required placeholder="Ví dụ: mở kịch bản cho gói Plus" /></Field>
            </div>
            <SubmitButton className="ap-btn">Lưu cấu hình dự báo</SubmitButton>
          </fieldset>
        </form>
        {!!f.history.length && (
          <ol className="av-log" aria-label="Lịch sử thay đổi dự báo">
            {f.history.slice(0, 5).map((h, i) => (
              <li key={i}><b>{forecastSettingsSummary(h.after ?? {})}</b><small>{formatDateTime(h.createdAt)} · {h.reason}</small></li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
