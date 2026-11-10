import { DateField } from "../ui/date-field";
import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import { saveAnnouncementAction } from "../payment-actions";
import { AdminPager } from "../ui/admin-pager";
import { Banner, Button, Card, Chip, Field, Table, formatDateTime, type ChipTone, type Column } from "../ui/paper";
import "./modules.css";

type Query = Record<string, string | undefined>;
const PAGE_SIZE = 25;
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
const KIND_TONES: Record<string, ChipTone> = { promotion: "coral", incident: "danger", maintenance: "warning", info: "outline", update: "lilac" };
const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã đăng",
  archived: "Đã lưu trữ",
};
const STATUS_TONES: Record<string, ChipTone> = { draft: "warning", published: "success", archived: "outline" };
const SEVERITY_LABELS: Record<string, string> = { info: "Thông tin", warning: "Cảnh báo", critical: "Nghiêm trọng" };
const SEVERITY_TONES: Record<string, ChipTone> = { info: "outline", warning: "warning", critical: "danger" };
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
const time = (iso: string) => formatDateTime(iso);

/* No Figma screen: list in the language of Sự cố (15), banner preview and a grouped editor. */
export async function AnnouncementAdmin({ query }: { query: Query }) {
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  const data = await api.adminAnnouncements<{
    announcements: Item[];
    promotions: { id: string; name: string }[];
    incidents: { id: string; title: string; status: string }[];
  }>(accessToken);
  const form = query.edit ? data.announcements.find((a) => a.id === query.edit) : undefined;
  const total = data.announcements.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = /^\d{1,5}$/.test(query.page ?? "") ? Number(query.page) : 0;
  const page = Math.min(requestedPage, pageCount - 1);
  const visibleAnnouncements = data.announcements.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const columns: Column<Item>[] = [
    { key: "title", label: "Tiêu đề", render: (a) => <span className="am-title"><b>{a.title_vi}</b><small>{a.pinned ? "Ghim · " : ""}{time(a.starts_at)} → {a.ends_at ? time(a.ends_at) : "không hạn"}</small></span> },
    { key: "kind", label: "Loại", render: (a) => <span className="ap-row" style={{ gap: 6 }}><Chip tone={KIND_TONES[a.kind] ?? "outline"}>{ANNOUNCEMENT_KIND_LABELS[a.kind] ?? a.kind}</Chip>{a.blocking && <Chip tone="danger">Chặn app</Chip>}</span> },
    { key: "severity", label: "Mức", render: (a) => <Chip tone={SEVERITY_TONES[a.severity] ?? "outline"}>{SEVERITY_LABELS[a.severity] ?? a.severity}</Chip> },
    { key: "channels", label: "Kênh", muted: true, render: (a) => a.channels.join(", ") },
    { key: "status", label: "Trạng thái", render: (a) => <Chip tone={STATUS_TONES[a.status] ?? "outline"}>{STATUS_LABELS[a.status] ?? a.status}</Chip> },
    { key: "edit", label: <span className="ap-sr">Thao tác</span>, render: (a) => <Link className="am-link" href={`/admin/announcements?edit=${a.id}`} aria-label={`Sửa thông báo ${a.title_vi}`}>Sửa</Link> },
  ];

  const preview = {
    kind: form?.kind ?? "info",
    severity: form?.severity ?? "info",
    title: form?.title_vi || "Tiêu đề thông báo",
    body: form?.body_vi || "Nội dung thông báo hiển thị cho người dùng sẽ xuất hiện ở đây.",
    cta: form?.cta_label_vi,
  };

  return (
    <>
      <p className="ap-card-note am-lead">
        Gửi thông báo ưu đãi, sự cố, bảo trì hoặc cập nhật tới app Android (bản Google Play và APK) và web. Có thể nhắm theo gói, phiên bản
        app và thời gian. “Chặn khi bảo trì” khóa app bằng màn bảo trì trong thời gian hiệu lực; dữ liệu trên máy người dùng không bị ảnh hưởng.
      </p>
      {query.saved && <Banner tone="success" icon="check" title="Đã lưu thông báo" />}
      {query.error && (
        <Banner tone="danger" icon="alert" title="Không lưu được thông báo"
          text="Kiểm tra MFA, lý do, liên kết (chỉ trang trong app hoặc picketfinance.com) và xem có người vừa sửa không." />
      )}

      <Card receipt eyebrow={`${total} thông báo`} title="Tất cả thông báo"
        actions={<Button href="/admin/announcements" icon="plus" size="sm">Tạo thông báo</Button>}>
        <Table columns={columns} rows={visibleAnnouncements} caption="Danh sách thông báo hệ thống" selected={(a) => a.id === form?.id} empty="Chưa có thông báo." />
        <AdminPager base="/admin/announcements" query={query} page={page} total={total} pageSize={PAGE_SIZE} clear={[]} />
      </Card>

      <div className="ap-split-wide am-ann-layout">
        <Card eyebrow={form ? "Biên tập" : "Thông báo mới"} title={form ? `Sửa: ${form.title_vi}` : "Tạo thông báo"}>
          <form action={saveAnnouncementAction} className="ap-form" key={form?.id ?? "new"}>
            <fieldset disabled={!mfaVerified}>
              {form && (
                <>
                  <input type="hidden" name="id" value={form.id} />
                  <input type="hidden" name="revision" value={form.revision} />
                </>
              )}
              <span className="ap-eyebrow">Nội dung</span>
              <div className="am-pair">
                <Field label="Loại">
                  <select name="kind" defaultValue={form?.kind ?? "info"}>
                    {Object.entries(ANNOUNCEMENT_KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Mức độ">
                  <select name="severity" defaultValue={form?.severity ?? "info"}>
                    <option value="info">Thông tin</option>
                    <option value="warning">Cảnh báo</option>
                    <option value="critical">Nghiêm trọng</option>
                  </select>
                </Field>
              </div>
              <div className="am-pair">
                <Field label="Tiêu đề (VI)"><input name="titleVi" required minLength={3} maxLength={120} defaultValue={form?.title_vi} /></Field>
                <Field label="Tiêu đề (EN)"><input name="titleEn" maxLength={120} defaultValue={form?.title_en ?? ""} /></Field>
              </div>
              <div className="am-pair">
                <Field label="Nội dung (VI)"><textarea name="bodyVi" maxLength={1000} defaultValue={form?.body_vi} /></Field>
                <Field label="Nội dung (EN)"><textarea name="bodyEn" maxLength={1000} defaultValue={form?.body_en ?? ""} /></Field>
              </div>
              <div className="am-pair">
                <Field label="Nút (VI)"><input name="ctaLabelVi" maxLength={40} defaultValue={form?.cta_label_vi ?? ""} /></Field>
                <Field label="Nút (EN)"><input name="ctaLabelEn" maxLength={40} defaultValue={form?.cta_label_en ?? ""} /></Field>
              </div>
              <div className="am-pair">
                <Field label="Mở trang trong app (ví dụ /billing)"><input name="ctaRoute" pattern="/[a-z0-9/_\-]{0,80}" defaultValue={form?.cta_route ?? ""} /></Field>
                <Field label="Hoặc liên kết picketfinance.com"><input name="ctaUrl" type="url" defaultValue={form?.cta_url ?? ""} /></Field>
              </div>
              <div className="am-pair">
                <Field label="Gắn ưu đãi">
                  <select name="promotionId" defaultValue={form?.promotion_id ?? ""}>
                    <option value="">Không</option>
                    {data.promotions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Gắn sự cố">
                  <select name="incidentId" defaultValue={form?.incident_id ?? ""}>
                    <option value="">Không</option>
                    {data.incidents.map((i) => <option key={i.id} value={i.id}>{i.title} ({i.status})</option>)}
                  </select>
                </Field>
              </div>

              <hr className="ap-divider" />
              <span className="ap-eyebrow">Nhắm đối tượng</span>
              <div className="am-pair">
                <fieldset className="am-checks">
                  <legend className="ap-eyebrow">Kênh</legend>
                  {CHANNELS.map(([v, l]) => (
                    <label key={v} className="ap-check"><input type="checkbox" name="channels" value={v} defaultChecked={form ? form.channels.includes(v) : true} /><span>{l}</span></label>
                  ))}
                </fieldset>
                <fieldset className="am-checks">
                  <legend className="ap-eyebrow">Đối tượng</legend>
                  {TIERS.map(([v, l]) => (
                    <label key={v} className="ap-check"><input type="checkbox" name="tiers" value={v} defaultChecked={form ? form.tiers.includes(v) : true} /><span>{l}</span></label>
                  ))}
                </fieldset>
              </div>
              <div className="am-pair">
                <Field label="Từ versionCode"><input name="minVersionCode" type="number" min={1} defaultValue={form?.min_version_code ?? ""} /></Field>
                <Field label="Đến versionCode"><input name="maxVersionCode" type="number" min={1} defaultValue={form?.max_version_code ?? ""} /></Field>
              </div>
              <div className="am-pair">
                <Field label="Bắt đầu (giờ VN)"><DateField type="datetime-local" name="startsAt" defaultValue={vnLocal(form?.starts_at ?? null)} /></Field>
                <Field label="Kết thúc (giờ VN)"><DateField type="datetime-local" name="endsAt" defaultValue={vnLocal(form?.ends_at ?? null)} /></Field>
              </div>

              <hr className="ap-divider" />
              <span className="ap-eyebrow">Hiển thị</span>
              <div className="am-checks">
                <label className="ap-check"><input type="checkbox" name="blocking" value="true" defaultChecked={form?.blocking} /><span>Chặn app khi bảo trì (chỉ loại Bảo trì)</span></label>
                <label className="ap-check"><input type="checkbox" name="notify" value="true" defaultChecked={form?.notify} /><span>Gửi thông báo trên điện thoại (mức Cảnh báo/Nghiêm trọng)</span></label>
                <label className="ap-check"><input type="checkbox" name="pinned" value="true" defaultChecked={form?.pinned} /><span>Ghim lên đầu</span></label>
              </div>
              <div className="am-pair">
                <Field label="Trạng thái">
                  <select name="status" defaultValue={form?.status ?? "draft"}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Lý do (lưu vào nhật ký)"><input name="reason" required minLength={5} maxLength={500} /></Field>
              </div>
              <div className="am-actions">
                <SubmitButton className="ap-btn">Lưu (cần MFA)</SubmitButton>
                {form && <Link className="ap-btn is-secondary" href="/admin/announcements">Hủy sửa</Link>}
              </div>
            </fieldset>
          </form>
        </Card>

        <div className="am-col am-sticky">
          <Card eyebrow="Xem trước" title="Banner trong app" note="Bản xem trước theo thông báo đang sửa (nội dung VI).">
            <div className={`am-preview is-${preview.severity}`}>
              <div className="am-preview-top"><Chip tone={KIND_TONES[preview.kind] ?? "outline"}>{ANNOUNCEMENT_KIND_LABELS[preview.kind] ?? preview.kind}</Chip></div>
              <b>{preview.title}</b>
              <p>{preview.body}</p>
              {preview.cta && <span className="am-preview-cta">{preview.cta}</span>}
            </div>
          </Card>
          {form && !!form.audit.length && (
            <Card eyebrow="Nhật ký thay đổi" compact>
              <ol className="am-log">
                {form.audit.map((a) => <li key={a.id}><b>{a.reason}</b><small>{time(a.created_at)}</small></li>)}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
