import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import { saveReleaseAction } from "../payment-actions";
import { Banner, Card, Chip, Field, Table, formatDateTime, relativeTime, type ChipTone, type Column } from "../ui/paper";
import "./modules.css";

type Query = Record<string, string | undefined>;
type Release = {
  id: string;
  channel: string;
  version_name: string;
  version_code: number;
  status: string;
  rollout_percent: number | null;
  sha256: string | null;
  bytes: number | null;
  filename: string | null;
  abi: string | null;
  min_sdk: number | null;
  min_supported_code: number | null;
  notes_vi: string | null;
  notes_en: string | null;
  released_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  revision: number;
  audit: { id: number; source: string; reason: string; created_at: string }[];
};

export const RELEASE_CHANNEL_LABELS: Record<string, string> = {
  play_internal: "Google Play · Internal testing",
  play_alpha: "Google Play · Closed testing",
  play_beta: "Google Play · Open testing",
  play_production: "Google Play · Production",
  apkpure: "APKPure",
  landing: "Landing page (picketfinance.com)",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  submitted: "Đã nộp",
  in_review: "Đang duyệt",
  live: "Đang phát hành",
  halted: "Tạm dừng",
  superseded: "Đã thay thế",
};
const STATUS_TONES: Record<string, ChipTone> = {
  draft: "outline",
  submitted: "warning",
  in_review: "warning",
  live: "success",
  halted: "danger",
  superseded: "outline",
};
const VERIFIED_LABELS: Record<string, string> = {
  play_api: "Play API",
  landing_probe: "Kiểm tra landing",
  manual: "Nhập tay",
};
const CARD_TONES = ["is-lilac", "is-mint", "is-blue", "is-peach", "is-coral", "is-cream"];
const time = (iso: string | null) => (iso ? formatDateTime(iso) : "—");
const editable = (channel: string) => !channel.startsWith("play_");

/* Figma › Admin Web › 16 · Phiên bản (152:7753): channel cards, history table, editor side card. */
export async function ReleaseAdmin({ query }: { query: Query }) {
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  const data = await api.adminReleases<{
    live: Record<string, { versionName: string; versionCode: number; verifiedAt: string | null }>;
    releases: Release[];
    warnings: string[];
  }>(accessToken);
  const form = query.edit ? data.releases.find((r) => r.id === query.edit) : undefined;

  const columns: Column<Release>[] = [
    { key: "version", label: "Phiên bản", render: (r) => <b className="am-ver">{r.version_name} <small>({r.version_code})</small></b> },
    { key: "channel", label: "Kênh", render: (r) => RELEASE_CHANNEL_LABELS[r.channel] ?? r.channel },
    { key: "status", label: "Trạng thái", render: (r) => <Chip tone={STATUS_TONES[r.status] ?? "outline"}>{STATUS_LABELS[r.status] ?? r.status}</Chip> },
    { key: "rollout", label: "Rollout", align: "right", render: (r) => (r.rollout_percent === null ? "—" : `${r.rollout_percent}%`) },
    { key: "min", label: "Bắt buộc từ", align: "right", render: (r) => r.min_supported_code ?? "—" },
    { key: "verified", label: "Xác minh", muted: true, render: (r) => `${r.verified_by ? VERIFIED_LABELS[r.verified_by] ?? r.verified_by : "Chưa"} · ${relativeTime(r.verified_at)}` },
    { key: "edit", label: <span className="ap-sr">Thao tác</span>, render: (r) => <Link className="am-link" href={`/admin/releases?edit=${r.id}`}>{editable(r.channel) ? "Sửa" : "Ghi chú"}</Link> },
  ];

  return (
    <>
      {data.warnings.map((w) => <Banner key={w} tone="warning" icon="alert" title={w} />)}
      {query.saved && <Banner tone="success" icon="check" title="Đã lưu phiên bản" />}

      <p className="ap-card-note am-lead">
        Trạng thái Google Play được đọc tự động qua Play API (chỉ đọc, không bao giờ sửa Closed testing). Landing được đối chiếu với
        release.json công khai. APKPure cập nhật tay vì portal không có API.
      </p>

      <section className="am-chan-grid" aria-label="Đang phát hành theo kênh">
        {Object.keys(RELEASE_CHANNEL_LABELS).map((channel, i) => {
          const live = data.live[channel];
          return (
            <article key={channel} className={`am-chan ${CARD_TONES[i % CARD_TONES.length]}${live ? "" : " is-empty"}`}>
              <header>
                <b>{live ? `v${live.versionName}` : "—"}</b>
                {live ? <Chip tone="success">Đang phát hành</Chip> : <Chip tone="outline">Chưa có</Chip>}
              </header>
              <div className="am-chan-body">
                <span>{RELEASE_CHANNEL_LABELS[channel]}</span>
                <small>{live ? `Code ${live.versionCode} · xác minh ${relativeTime(live.verifiedAt)}` : "Chưa có bản nào được xác minh"}</small>
              </div>
            </article>
          );
        })}
      </section>

      <div className="ap-split am-split">
        <Card receipt eyebrow="Tất cả bản" title="Lịch sử phát hành">
          <Table columns={columns} rows={data.releases} caption="Lịch sử phát hành" selected={(r) => r.id === form?.id} empty="Chưa có bản phát hành nào." />
        </Card>

        <Card eyebrow={form ? "Biên tập" : "Ghi nhận mới"} title={form ? `${RELEASE_CHANNEL_LABELS[form.channel]} ${form.version_name}` : "Phiên bản APKPure / landing"}>
          {query.error && <p className="am-error" role="alert">Không lưu được. Kiểm tra MFA, lý do, checksum (bản landing đang phát hành cần SHA-256, dung lượng, tên file) hoặc có người vừa sửa.</p>}
          <form action={saveReleaseAction} className="ap-form">
            <fieldset disabled={!mfaVerified}>
              {form ? (
                <>
                  <input type="hidden" name="id" value={form.id} />
                  <input type="hidden" name="revision" value={form.revision} />
                </>
              ) : (
                <Field label="Kênh">
                  <select name="channel" defaultValue="apkpure">
                    <option value="apkpure">APKPure</option>
                    <option value="landing">Landing page</option>
                  </select>
                </Field>
              )}
              <div className="am-pair">
                <Field label="Version name"><input name="versionName" required pattern="\d+\.\d+\.\d+" defaultValue={form?.version_name} placeholder="1.0.10" /></Field>
                <Field label="Version code"><input name="versionCode" type="number" min={1} required defaultValue={form?.version_code} /></Field>
              </div>
              {(!form || editable(form.channel)) && (
                <Field label="Trạng thái">
                  <select name="status" defaultValue={form?.status ?? "draft"}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              )}
              <Field label="SHA-256"><input name="sha256" pattern="[a-f0-9]{64}" defaultValue={form?.sha256 ?? ""} /></Field>
              <div className="am-pair">
                <Field label="Dung lượng (byte)"><input name="bytes" type="number" min={1} defaultValue={form?.bytes ?? ""} /></Field>
                <Field label="Tên file APK"><input name="filename" pattern="[a-z0-9][a-z0-9.\-]*\.apk" defaultValue={form?.filename ?? ""} /></Field>
              </div>
              <div className="am-pair">
                <Field label="ABI">
                  <select name="abi" defaultValue={form?.abi ?? "arm64-v8a"}>
                    <option value="arm64-v8a">arm64-v8a</option>
                    <option value="universal">universal</option>
                  </select>
                </Field>
                <Field label="minSdk"><input name="minSdk" type="number" min={24} max={40} defaultValue={form?.min_sdk ?? 24} /></Field>
              </div>
              <Field label="Bắt buộc cập nhật nếu thấp hơn code"><input name="minSupportedCode" type="number" min={1} defaultValue={form?.min_supported_code ?? ""} /></Field>
              <Field label="Ghi chú phát hành (VI)"><textarea name="notesVi" maxLength={2000} defaultValue={form?.notes_vi ?? ""} /></Field>
              <Field label="Release notes (EN)"><textarea name="notesEn" maxLength={2000} defaultValue={form?.notes_en ?? ""} /></Field>
              <Field label="Lý do (lưu vào nhật ký)"><input name="reason" required minLength={5} maxLength={500} /></Field>
              <div className="am-actions">
                <SubmitButton className="ap-btn">Lưu (cần MFA)</SubmitButton>
                {form && <Link className="ap-btn is-secondary" href="/admin/releases">Hủy</Link>}
              </div>
            </fieldset>
          </form>
          {form && !!form.audit.length && (
            <>
              <hr className="ap-divider" />
              <span className="ap-eyebrow">Nhật ký</span>
              <ol className="am-log">
                {form.audit.map((a) => <li key={a.id}><b>{a.reason}</b><small>{time(a.created_at)} · {a.source}</small></li>)}
              </ol>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
