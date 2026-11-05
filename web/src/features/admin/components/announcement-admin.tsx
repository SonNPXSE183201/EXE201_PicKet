import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { saveAnnouncementAction } from "../payment-actions";

type Query = Record<string, string | undefined>;
type Item = {
  id: string;
  kind: string;
  severity: string;
  title_vi: string;
  body_vi: string;
  title_en: string | null;
  body_en: string | null;
  cta_label_vi: string | null;
  cta_label_en: string | null;
  cta_route: string | null;
  cta_url: string | null;
  promotion_id: string | null;
  incident_id: string | null;
  channels: string[];
  tiers: string[];
  min_version_code: number | null;
  max_version_code: number | null;
  starts_at: string;
  ends_at: string | null;
  blocking: boolean;
  dismissible: boolean;
  notify: boolean;
  pinned: boolean;
  status: string;
  revision: number;
  audit: { id: number; reason: string; created_at: string }[];
};

export const ANNOUNCEMENT_KIND_LABELS: Record<string, string> = {
  promotion: "Ưu đãi",
  incident: "Sự cố",
  maintenance: "Bảo trì",
  info: "Tin tức",
  update: "Cập nhật ứng dụng",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã đăng",
  archived: "Đã lưu trữ",
};
const CHANNELS = [
  ["play", "Android (Google Play)"],
  ["apk", "Android (APK/landing/APKPure)"],
  ["web", "Web"],
] as const;
const TIERS = [
  ["guest", "Khách chưa đăng nhập"],
  ["free", "Free"],
  ["plus", "Plus"],
  ["pro", "Pro"],
] as const;
const vnLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16) : "";
const time = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export async function AnnouncementAdmin({ query }: { query: Query }) {
  const { api, accessToken } = await requireApiSession("admin");
  const data = await api.adminAnnouncements<{
    announcements: Item[];
    promotions: { id: string; name: string }[];
    incidents: { id: string; title: string; status: string }[];
  }>(accessToken);
  const form = query.edit ? data.announcements.find((a) => a.id === query.edit) : undefined;
  return (
    <main className="admin-platform payment-admin">
      <h1>Thông báo hệ thống</h1>
      <p>
        Gửi thông báo ưu đãi, sự cố, bảo trì hoặc cập nhật tới app Android (bản
        Google Play và APK) và web. Có thể nhắm theo gói, phiên bản app và thời
        gian. “Chặn khi bảo trì” khóa app bằng màn bảo trì trong thời gian hiệu
        lực; dữ liệu trên máy người dùng không bị ảnh hưởng.
      </p>
      {query.saved && <p role="status">Đã lưu thông báo.</p>}
      {query.error && (
        <p role="alert">
          Không lưu được. Kiểm tra MFA, lý do, liên kết (chỉ trang trong app hoặc
          picketfinance.com) và xem có người vừa sửa không.
        </p>
      )}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tiêu đề</th>
            <th>Loại</th>
            <th>Mức</th>
            <th>Kênh</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.announcements.map((a) => (
            <tr key={a.id}>
              <td>{a.title_vi}</td>
              <td>
                {ANNOUNCEMENT_KIND_LABELS[a.kind] ?? a.kind}
                {a.blocking ? " · chặn app" : ""}
              </td>
              <td>{a.severity}</td>
              <td>{a.channels.join(", ")}</td>
              <td>
                {time(a.starts_at)} → {a.ends_at ? time(a.ends_at) : "không hạn"}
              </td>
              <td>{STATUS_LABELS[a.status] ?? a.status}</td>
              <td>
                <Link href={`/admin/announcements?edit=${a.id}`}>Sửa</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.announcements.length && <p>Chưa có thông báo.</p>}

      <h2>{form ? `Sửa: ${form.title_vi}` : "Tạo thông báo"}</h2>
      <form action={saveAnnouncementAction} className="admin-filter promotion-form">
        {form && (
          <>
            <input type="hidden" name="id" value={form.id} />
            <input type="hidden" name="revision" value={form.revision} />
          </>
        )}
        <label>
          Loại{" "}
          <select name="kind" defaultValue={form?.kind ?? "info"}>
            {Object.entries(ANNOUNCEMENT_KIND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Mức độ{" "}
          <select name="severity" defaultValue={form?.severity ?? "info"}>
            <option value="info">Thông tin</option>
            <option value="warning">Cảnh báo</option>
            <option value="critical">Nghiêm trọng</option>
          </select>
        </label>
        <label>
          Tiêu đề (VI) <input name="titleVi" required minLength={3} maxLength={120} defaultValue={form?.title_vi} />
        </label>
        <label>
          Nội dung (VI) <textarea name="bodyVi" maxLength={1000} defaultValue={form?.body_vi} />
        </label>
        <label>
          Tiêu đề (EN) <input name="titleEn" maxLength={120} defaultValue={form?.title_en ?? ""} />
        </label>
        <label>
          Nội dung (EN) <textarea name="bodyEn" maxLength={1000} defaultValue={form?.body_en ?? ""} />
        </label>
        <label>
          Nút (VI) <input name="ctaLabelVi" maxLength={40} defaultValue={form?.cta_label_vi ?? ""} />
        </label>
        <label>
          Nút (EN) <input name="ctaLabelEn" maxLength={40} defaultValue={form?.cta_label_en ?? ""} />
        </label>
        <label>
          Mở trang trong app (ví dụ /billing){" "}
          <input name="ctaRoute" pattern="/[a-z0-9/_-]{0,80}" defaultValue={form?.cta_route ?? ""} />
        </label>
        <label>
          Hoặc liên kết picketfinance.com{" "}
          <input name="ctaUrl" type="url" defaultValue={form?.cta_url ?? ""} />
        </label>
        <label>
          Gắn ưu đãi{" "}
          <select name="promotionId" defaultValue={form?.promotion_id ?? ""}>
            <option value="">Không</option>
            {data.promotions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Gắn sự cố{" "}
          <select name="incidentId" defaultValue={form?.incident_id ?? ""}>
            <option value="">Không</option>
            {data.incidents.map((i) => (
              <option key={i.id} value={i.id}>{i.title} ({i.status})</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Kênh</legend>
          {CHANNELS.map(([v, l]) => (
            <label key={v}>
              <input type="checkbox" name="channels" value={v} defaultChecked={form ? form.channels.includes(v) : true} /> {l}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Đối tượng</legend>
          {TIERS.map(([v, l]) => (
            <label key={v}>
              <input type="checkbox" name="tiers" value={v} defaultChecked={form ? form.tiers.includes(v) : true} /> {l}
            </label>
          ))}
        </fieldset>
        <label>
          Từ versionCode <input name="minVersionCode" type="number" min={1} defaultValue={form?.min_version_code ?? ""} />
        </label>
        <label>
          Đến versionCode <input name="maxVersionCode" type="number" min={1} defaultValue={form?.max_version_code ?? ""} />
        </label>
        <label>
          Bắt đầu (giờ VN) <input type="datetime-local" name="startsAt" defaultValue={vnLocal(form?.starts_at ?? null)} />
        </label>
        <label>
          Kết thúc (giờ VN) <input type="datetime-local" name="endsAt" defaultValue={vnLocal(form?.ends_at ?? null)} />
        </label>
        <label>
          <input type="checkbox" name="blocking" value="true" defaultChecked={form?.blocking} /> Chặn app khi bảo trì (chỉ loại Bảo trì)
        </label>
        <label>
          <input type="checkbox" name="notify" value="true" defaultChecked={form?.notify} /> Gửi thông báo trên điện thoại (mức Cảnh báo/Nghiêm trọng)
        </label>
        <label>
          <input type="checkbox" name="pinned" value="true" defaultChecked={form?.pinned} /> Ghim lên đầu
        </label>
        <label>
          Trạng thái{" "}
          <select name="status" defaultValue={form?.status ?? "draft"}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Lý do (lưu vào nhật ký) <input name="reason" required minLength={5} maxLength={500} />
        </label>
        <button className="button primary">Lưu (cần MFA)</button>
        {form && <Link href="/admin/announcements">Hủy sửa</Link>}
      </form>
      {form && !!form.audit.length && (
        <>
          <h3>Nhật ký thay đổi</h3>
          <ol>
            {form.audit.map((a) => (
              <li key={a.id}>{time(a.created_at)} · {a.reason}</li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
