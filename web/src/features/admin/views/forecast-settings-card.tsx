import { ForecastSettingsForm } from "../components/forecast-settings-form";
import { saveForecastSettingsAction } from "../payment-actions";
import { forecastSettingsSummary } from "../forecast-settings-form";
import { formatDateTime } from "../ui/paper";
import type { ViewProps } from "./shared";

export function ForecastSettingsCard(p: ViewProps) {
  const f = p.forecastSettings;
  if (!f) return null;
  return <div className="fs-settings">
    <ForecastSettingsForm key={f.settings.revision} settings={f.settings} disabled={!p.mfaVerified} saved={!!p.query.forecastSaved} error={p.query.forecastError} action={saveForecastSettingsAction} />
    {!!f.history.length && <ol className="av-log" aria-label="Lịch sử thay đổi dự báo">{f.history.slice(0, 5).map((h, i) => <li key={i}><b>{forecastSettingsSummary(h.after ?? {})}</b><small>{formatDateTime(h.createdAt)} · {h.reason}</small></li>)}</ol>}
  </div>;
}
