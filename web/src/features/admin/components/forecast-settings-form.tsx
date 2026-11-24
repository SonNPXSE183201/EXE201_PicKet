"use client";

import { useState } from "react";
import { SubmitButton } from "@/core/ui/submit-button";
import { AdminIcon } from "../ui/admin-icon";
import { Card, formatDateTime } from "../ui/paper";
import { FORECAST_PLANS } from "../forecast-settings-form";
import type { ForecastSettingsView } from "../views/shared";

const PLAN_NAMES = { free: "Free", plus: "Plus", pro: "Pro" };
export function ForecastSettingsForm({ settings: s, disabled, saved, error, action }: {
  settings: ForecastSettingsView["settings"]; disabled: boolean; saved: boolean; error?: string;
  action: (form: FormData) => Promise<void>;
}) {
  const [days, setDays] = useState(String(s.minHistoryDays));
  const [months, setMonths] = useState(String(s.lookbackMonths));
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const badDays = !/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 90;
  const badMonths = !/^\d+$/.test(months) || Number(months) < 1 || Number(months) > 6;
  const badReason = reason.trim().length < 5 || reason.trim().length > 500;
  return <form className="fs-final-form" action={action} onReset={() => { setDays(String(s.minHistoryDays)); setMonths(String(s.lookbackMonths)); setReason(""); setReasonTouched(false); }}>
    <fieldset disabled={disabled} className="fs-final-grid"><input type="hidden" name="revision" value={s.revision} />
      <div className="fs-final-main">
        <Card eyebrow="DỰ BÁO TÀI CHÍNH" title="Bật dự báo cuối tháng" actions={<label className="fs-switch-control"><span className="ap-sr">Bật dự báo cuối tháng</span><span className="ap-switch"><input aria-label="Bật dự báo cuối tháng" type="checkbox" name="enabled" defaultChecked={s.enabled} /><span /></span></label>}>
          <div className="fs-final-body"><p className="fs-final-warning"><AdminIcon name="alert" size={16} />Tắt dự báo sẽ ẩn thẻ ở Home và màn chi tiết với mọi người dùng.</p></div>
        </Card>
        <Card eyebrow="THAM SỐ DỰ BÁO" title="Dữ liệu tối thiểu và khoảng tham chiếu">
          <div className="fs-final-body fs-final-fields">
            <div className="fs-final-field"><label htmlFor="forecast-days">Ngày ghi chép tối thiểu (1–90)</label><input id="forecast-days" name="minHistoryDays" type="number" min={1} max={90} step={1} required value={days} onChange={e => setDays(e.target.value)} aria-invalid={badDays} aria-describedby={badDays ? "forecast-days-error" : undefined} />{badDays && <small id="forecast-days-error" role="alert">Nhập số ngày từ 1 đến 90. Giá trị hiện tại là {days || "trống"}.</small>}</div>
            <div className="fs-final-field"><label htmlFor="forecast-months">Tháng tham chiếu (1–6)</label><input id="forecast-months" name="lookbackMonths" type="number" min={1} max={6} step={1} required value={months} onChange={e => setMonths(e.target.value)} aria-invalid={badMonths} aria-describedby={badMonths ? "forecast-months-error" : undefined} />{badMonths && <small id="forecast-months-error" role="alert">Nhập số tháng từ 1 đến 6.</small>}</div>
            <div className="fs-final-field"><label htmlFor="forecast-range">Khoảng dao động</label><input id="forecast-range" value="P10 – P90" readOnly aria-readonly="true" /></div>
          </div>
        </Card>
        <Card eyebrow="QUYỀN XEM DỰ BÁO" title="Gói được xem dự báo cuối tháng"><div className="fs-final-body"><PlanChips name="accessPlans" label="Gói được xem dự báo cuối tháng" selected={s.accessPlans ?? ["plus", "pro"]} /></div></Card>
      </div>
      <div className="fs-final-side">
        {saved && <div className="fs-final-success" role="status"><span><AdminIcon name="check" size={20} /></span><div><b>Đã lưu cấu hình dự báo</b><p>Phiên bản v{s.revision} có hiệu lực ngay trên app.</p></div></div>}
        {error && <p className="av-error" role="alert">{error === "stale" ? "Cấu hình vừa được người khác thay đổi. Tải lại trang rồi lưu lại." : "Chưa lưu được. Kiểm tra quyền, MFA, số ngày (1–90), số tháng (1–6) và lý do (5–500 ký tự)."}</p>}
        <Card eyebrow={'KỊCH BẢN "NẾU TÔI MUA"'} title="Gói được dùng kịch bản"><div className="fs-final-body"><PlanChips name="scenarioPlans" label="Gói được dùng kịch bản" selected={s.scenarioPlans} /><p className="fs-final-hint">Quyền dùng kịch bản chỉ có hiệu lực với các gói được xem dự báo.</p></div></Card>
        <Card receipt eyebrow="XÁC NHẬN THAY ĐỔI"><div className="fs-final-body">
          <div className="fs-final-field"><label htmlFor="forecast-reason">Lý do thay đổi (bắt buộc)</label><input id="forecast-reason" name="reason" minLength={5} maxLength={500} required value={reason} onChange={e => { setReason(e.target.value); setReasonTouched(true); }} onBlur={() => setReasonTouched(true)} aria-invalid={reasonTouched && badReason} aria-describedby={reasonTouched && badReason ? "forecast-reason-error" : undefined} />{reasonTouched && badReason && <small id="forecast-reason-error" role="alert">{reason.trim() ? "Lý do cần từ 5 đến 500 ký tự." : "Cần nhập lý do trước khi lưu."}</small>}</div>
          <div className="fs-actions"><button aria-label="Huỷ thay đổi cấu hình dự báo" type="reset" className="ap-btn is-secondary">Huỷ</button><SubmitButton className="ap-btn" disabled={badDays || badMonths || badReason}>Lưu</SubmitButton></div>
          <p className="fs-final-hint">Phiên bản cấu hình hiện tại: v{s.revision} · {formatDateTime(s.updatedAt)}</p>
        </div></Card>
      </div>
    </fieldset>
  </form>;
}
function PlanChips({ name, label, selected }: { name: "accessPlans" | "scenarioPlans"; label: string; selected: string[] }) {
  return <fieldset className="fs-plans"><legend className="ap-sr">{label}</legend><div className="fs-chips">{FORECAST_PLANS.map(plan => <label key={plan} className="fs-chip"><input type="checkbox" name={name} value={plan} defaultChecked={selected.includes(plan)} aria-label={`${label}: ${PLAN_NAMES[plan]}`} /><span><AdminIcon name="check" size={14} />{PLAN_NAMES[plan]}</span></label>)}</div></fieldset>;
}
