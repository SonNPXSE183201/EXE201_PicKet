import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { saveReleaseAction } from "../payment-actions";

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
const VERIFIED_LABELS: Record<string, string> = {
  play_api: "Play API",
  landing_probe: "Kiểm tra landing",
  manual: "Nhập tay",
};
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const editable = (channel: string) => !channel.startsWith("play_");

export async function ReleaseAdmin({ query }: { query: Query }) {
  const { api, accessToken } = await requireApiSession("admin");
  const data = await api.adminReleases<{
    live: Record<string, { versionName: string; versionCode: number; verifiedAt: string | null }>;
    releases: Release[];
    warnings: string[];
  }>(accessToken);
  const form = query.edit ? data.releases.find((r) => r.id === query.edit) : undefined;
  return (
    <main className="admin-platform payment-admin">
      <h1>Phiên bản phát hành</h1>
      <p>
        Theo dõi phiên bản trên từng kênh. Trạng thái Google Play được đọc tự
        động qua Play API (chỉ đọc, không bao giờ sửa Closed testing). Landing
        được đối chiếu với release.json công khai. APKPure cập nhật tay vì
        portal không có API.
      </p>
      {data.warnings.map((w) => (
        <p key={w} role="alert">
          {w}
        </p>
      ))}
      {query.saved && <p role="status">Đã lưu phiên bản.</p>}
      {query.error && (
        <p role="alert">
          Không lưu được. Kiểm tra MFA, lý do, checksum (bản landing đang phát
          hành cần SHA-256, dung lượng, tên file) hoặc có người vừa sửa.
        </p>
      )}
      <h2>Đang phát hành theo kênh</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Kênh</th>
            <th>Phiên bản</th>
            <th>Xác minh</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(RELEASE_CHANNEL_LABELS).map((channel) => {
            const live = data.live[channel];
            return (
              <tr key={channel}>
                <td>{RELEASE_CHANNEL_LABELS[channel]}</td>
                <td>{live ? `${live.versionName} (${live.versionCode})` : "Chưa có"}</td>
                <td>{live ? time(live.verifiedAt) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Lịch sử</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Kênh</th>
            <th>Phiên bản</th>
            <th>Trạng thái</th>
            <th>Rollout</th>
            <th>Bắt buộc từ</th>
            <th>Xác minh</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.releases.map((r) => (
            <tr key={r.id}>
              <td>{RELEASE_CHANNEL_LABELS[r.channel] ?? r.channel}</td>
              <td>
                {r.version_name} ({r.version_code})
              </td>
              <td>{STATUS_LABELS[r.status] ?? r.status}</td>
              <td>{r.rollout_percent === null ? "—" : `${r.rollout_percent}%`}</td>
              <td>{r.min_supported_code ?? "—"}</td>
              <td>
                {r.verified_by ? VERIFIED_LABELS[r.verified_by] : "Chưa"} · {time(r.verified_at)}
              </td>
              <td>
                <Link href={`/admin/releases?edit=${r.id}`}>{editable(r.channel) ? "Sửa" : "Ghi chú"}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{form ? `Cập nhật ${RELEASE_CHANNEL_LABELS[form.channel]} ${form.version_name}` : "Ghi nhận phiên bản APKPure / landing"}</h2>
      <form action={saveReleaseAction} className="admin-filter promotion-form">
        {form ? (
          <>
            <input type="hidden" name="id" value={form.id} />
            <input type="hidden" name="revision" value={form.revision} />
          </>
        ) : (
          <label>
            Kênh{" "}
            <select name="channel" defaultValue="apkpure">
              <option value="apkpure">APKPure</option>
              <option value="landing">Landing page</option>
            </select>
          </label>
        )}
        <label>
          Version name <input name="versionName" required pattern="\d+\.\d+\.\d+" defaultValue={form?.version_name} />
        </label>
        <label>
          Version code <input name="versionCode" type="number" min={1} required defaultValue={form?.version_code} />
        </label>
        {(!form || editable(form.channel)) && (
          <label>
            Trạng thái{" "}
            <select name="status" defaultValue={form?.status ?? "draft"}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          SHA-256 <input name="sha256" pattern="[a-f0-9]{64}" defaultValue={form?.sha256 ?? ""} />
        </label>
        <label>
          Dung lượng (byte) <input name="bytes" type="number" min={1} defaultValue={form?.bytes ?? ""} />
        </label>
        <label>
          Tên file APK <input name="filename" pattern="[a-z0-9][a-z0-9.\-]*\.apk" defaultValue={form?.filename ?? ""} />
        </label>
        <label>
          ABI{" "}
          <select name="abi" defaultValue={form?.abi ?? "arm64-v8a"}>
            <option value="arm64-v8a">arm64-v8a</option>
            <option value="universal">universal</option>
          </select>
        </label>
        <label>
          minSdk <input name="minSdk" type="number" min={24} max={40} defaultValue={form?.min_sdk ?? 24} />
        </label>
        <label>
          Bắt buộc cập nhật nếu thấp hơn code{" "}
          <input name="minSupportedCode" type="number" min={1} defaultValue={form?.min_supported_code ?? ""} />
        </label>
        <label>
          Ghi chú phát hành (VI) <textarea name="notesVi" maxLength={2000} defaultValue={form?.notes_vi ?? ""} />
        </label>
        <label>
          Release notes (EN) <textarea name="notesEn" maxLength={2000} defaultValue={form?.notes_en ?? ""} />
        </label>
        <label>
          Lý do (lưu vào nhật ký) <input name="reason" required minLength={5} maxLength={500} />
        </label>
        <button className="button primary">Lưu (cần MFA)</button>
        {form && <Link href="/admin/releases">Hủy</Link>}
      </form>
      {form && !!form.audit.length && (
        <>
          <h3>Nhật ký</h3>
          <ol>
            {form.audit.map((a) => (
              <li key={a.id}>
                {time(a.created_at)} · {a.source} · {a.reason}
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
