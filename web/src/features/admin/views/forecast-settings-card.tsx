import { SubmitButton } from "@/core/ui/submit-button";
import { AdminIcon } from "../ui/admin-icon";
import { ForecastStepper } from "../components/forecast-stepper";
import { saveForecastSettingsAction } from "../payment-actions";
import { FORECAST_PLANS, forecastSettingsSummary } from "../forecast-settings-form";
import { Card, Chip, formatDateTime, formatNumber } from "../ui/paper";
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
            <div className="fs-toggle">
              <label className="fs-toggle-row">
                <span><b>Bật tính năng dự báo</b><small>Tắt sẽ ẩn thẻ dự báo ở Home và màn chi tiết cho mọi người dùng.</small></span>
                <span className="ap-switch"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /><span /></span>
              </label>
            </div>
            <ForecastStepper name="minHistoryDays" label="Số ngày lịch sử tối thiểu" min={1} max={90} defaultValue={s.minHistoryDays} unit="ngày" hint="Từ 1 đến 90 ngày" />
            <ForecastStepper name="lookbackMonths" label="Số tháng nhìn lại" min={1} max={6} defaultValue={s.lookbackMonths} unit="tháng" hint="Từ 1 đến 6 tháng" />
            <fieldset className="fs-plans">
              <legend className="fs-label">Gói được dùng kịch bản &quot;Nếu tôi mua...&quot;</legend>
              <div className="fs-chips">
                {FORECAST_PLANS.map((plan) => (
                  <label key={plan} className="fs-chip">
                    <input type="checkbox" name="scenarioPlans" value={plan} defaultChecked={s.scenarioPlans.includes(plan)} />
                    <span><AdminIcon name="check" size={14} />{PLAN_NAMES[plan]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="fs-field">
              <label className="fs-label" htmlFor="forecast-reason">Lý do thay đổi (bắt buộc, ghi vào nhật ký)</label>
              <textarea id="forecast-reason" name="reason" className="fs-reason" minLength={5} maxLength={500} required rows={3} placeholder="Ví dụ: giảm số ngày tối thiểu để người dùng mới thấy dự báo sớm hơn" />
            </div>
            <div className="fs-actions">
              <button type="reset" className="ap-btn is-secondary">Huỷ</button>
              <SubmitButton className="ap-btn">Lưu thay đổi</SubmitButton>
            </div>
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
