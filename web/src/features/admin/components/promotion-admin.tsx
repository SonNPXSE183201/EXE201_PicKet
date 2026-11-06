import { DateField } from "../ui/date-field";
import Link from "next/link";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import { savePromotionAction } from "../payment-actions";
import { AdminIcon } from "../ui/admin-icon";
import { Banner, Button, Card, Chip, EmptyState, Field, Progress, formatDateTime, type ChipTone } from "../ui/paper";
import "./modules.css";

type Query = Record<string, string | undefined>;
type Plan = { sku: string; tier: string; months: number; amount: number };
type Promotion = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  discount_percent: number;
  skus: string[];
  channels: string[];
  starts_at: string;
  ends_at: string | null;
  max_redemptions: number | null;
  per_user_limit: number;
  enabled: boolean;
  priority: number;
  play_offer_id: string | null;
  revision: number;
  used: number;
  consumed: number;
  audit: { id: number; reason: string; created_at: string }[];
};

const vnLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16)
    : "";
const time = (iso: string) => formatDateTime(iso);
const planName = (p: Plan) =>
  `${p.tier.toUpperCase()} ${p.months === 12 ? "1 năm" : "1 tháng"}`;

export function promotionState(p: Promotion, now: number) {
  if (!p.enabled) return "Tạm dừng";
  if (Date.parse(p.starts_at) > now) return "Chưa bắt đầu";
  if (p.ends_at && Date.parse(p.ends_at) <= now) return "Đã kết thúc";
  if (p.max_redemptions !== null && p.used >= p.max_redemptions) return "Hết suất";
  return "Đang chạy";
}
const STATE_TONES: Record<string, { tone: ChipTone; panel: string }> = {
  "Đang chạy": { tone: "success", panel: "is-coral" },
  "Chưa bắt đầu": { tone: "warning", panel: "is-lilac" },
  "Hết suất": { tone: "warning", panel: "is-blue" },
  "Đã kết thúc": { tone: "outline", panel: "is-cream" },
  "Tạm dừng": { tone: "outline", panel: "is-cream" },
};
const requestTime = () => Date.now();

/* No Figma screen: offer cards in the language of Đối tác (18) plus an editor side card. */
export async function PromotionAdmin({ query }: { query: Query }) {
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  const data = await api.adminPromotions<{ catalog: Plan[]; promotions: Promotion[] }>(
    accessToken,
  );
  const now = requestTime();
  const editing = query.edit
    ? data.promotions.find((p) => p.id === query.edit)
    : undefined;
  const form = editing;
  return (
    <>
      <p className="ap-card-note am-lead">
        Giữ nguyên 4 gói; ưu đãi giảm % theo chiến dịch (ví dụ gói sáng lập cho 100 người đầu). Giá được khóa vào đơn lúc khách bấm mua,
        đơn chờ giữ suất 15 phút. Ưu đãi áp cho thanh toán PayOS; trên Google Play cần tạo offer tương ứng trong Play Console rồi ghi mã
        offer để đối chiếu.
      </p>
      {query.saved && <Banner tone="success" icon="check" title="Đã lưu ưu đãi" />}
      {query.error && (
        <Banner tone="danger" icon="alert" title="Không lưu được ưu đãi"
          text="Kiểm tra MFA, lý do, số suất (không thấp hơn số đã dùng) hoặc có người vừa sửa." />
      )}

      <div className="ap-split-wide am-offer-layout">
        <section className="am-col" aria-labelledby="offer-list">
          <header className="am-head">
            <div><span className="ap-eyebrow">Chiến dịch giảm giá</span><h2 id="offer-list" className="ap-card-title">Ưu đãi</h2></div>
            <Button href="/admin/promotions" icon="plus">Tạo ưu đãi mới</Button>
          </header>
          {data.promotions.length ? (
            <ul className="am-offers">
              {data.promotions.map((p) => {
                const state = promotionState(p, now);
                const meta = STATE_TONES[state];
                const skuNames = p.skus.map((sku) => data.catalog.find((c) => c.sku === sku)).map((plan, i) => (plan ? planName(plan) : p.skus[i]));
                return (
                  <li key={p.id} className={`am-offer${p.id === form?.id ? " is-selected" : ""}${state === "Đang chạy" ? "" : " is-dim"}`}>
                    <div className={`am-offer-art ${meta.panel}`}>
                      <b>-{p.discount_percent}%</b>
                      <span>{p.code ? <>Mã <code>{p.code}</code></> : "Tự áp"}</span>
                    </div>
                    <div className="am-offer-body">
                      <div className="am-offer-top"><Chip tone={meta.tone}>{state}</Chip><span className="ap-sr">Kênh:</span>{p.channels.map((c) => <Chip key={c} tone="outline">{c === "google_play" ? "Google Play" : "PayOS"}</Chip>)}</div>
                      <h3>{p.name}</h3>
                      {p.description && <p className="am-desc">{p.description}</p>}
                      <p className="am-meta"><AdminIcon name="bag" size={14} />{skuNames.join(", ") || "Chưa chọn gói"}</p>
                      <p className="am-meta"><AdminIcon name="calendar" size={14} />{time(p.starts_at)} → {p.ends_at ? time(p.ends_at) : "không hạn"}</p>
                      <div className="am-quota">
                        {p.max_redemptions === null
                          ? <small>{p.consumed} đã dùng · không giới hạn suất</small>
                          : <><Progress value={p.used} max={p.max_redemptions} color="var(--ap-mauve)" /><small>{p.used}/{p.max_redemptions} suất (đã trả {p.consumed})</small></>}
                      </div>
                      <Link className="am-link" href={`/admin/promotions?edit=${p.id}`} aria-label={`Sửa ưu đãi ${p.name}`}>Sửa</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Chưa có ưu đãi nào" text="Tạo ưu đãi đầu tiên ở khung bên phải." />
          )}
        </section>

        <Card eyebrow={form ? "Biên tập" : "Ưu đãi mới"} title={form ? `Sửa: ${form.name}` : "Tạo ưu đãi mới"} className="am-editor">
          <form action={savePromotionAction} className="ap-form" key={form?.id ?? "new"}>
            <fieldset disabled={!mfaVerified}>
              {form && (
                <>
                  <input type="hidden" name="id" value={form.id} />
                  <input type="hidden" name="revision" value={form.revision} />
                </>
              )}
              <Field label="Tên"><input name="name" required minLength={3} maxLength={80} defaultValue={form?.name} /></Field>
              <Field label="Mô tả hiển thị"><input name="description" maxLength={300} defaultValue={form?.description ?? ""} /></Field>
              <div className="am-pair">
                <Field label="% giảm"><input name="discountPercent" type="number" min={1} max={90} required defaultValue={form?.discount_percent ?? 10} /></Field>
                <label className="am-switch-row">
                  <span>Bật ưu đãi</span>
                  <span className="ap-switch"><input type="checkbox" name="enabled" value="true" defaultChecked={form?.enabled ?? false} /><span /></span>
                </label>
              </div>
              <fieldset className="am-checks">
                <legend className="ap-eyebrow">Áp cho gói</legend>
                {data.catalog.map((plan) => (
                  <label key={plan.sku} className="ap-check">
                    <input type="checkbox" name="skus" value={plan.sku} defaultChecked={form ? form.skus.includes(plan.sku) : true} />
                    <span>{planName(plan)} ({formatVnd(plan.amount)})</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="am-checks">
                <legend className="ap-eyebrow">Kênh</legend>
                <label className="ap-check">
                  <input type="checkbox" name="channels" value="payos" defaultChecked={form ? form.channels.includes("payos") : true} />
                  <span>PayOS (APK)</span>
                </label>
                <label className="ap-check">
                  <input type="checkbox" name="channels" value="google_play" defaultChecked={form?.channels.includes("google_play")} />
                  <span>Google Play (chỉ ánh xạ offer)</span>
                </label>
              </fieldset>
              <Field label="Mã offer Google Play"><input name="playOfferId" pattern="[a-z0-9\-]{1,63}" defaultValue={form?.play_offer_id ?? ""} /></Field>
              <Field label="Mã khuyến mãi (để trống = tự áp)"><input name="code" pattern="[A-Za-z0-9_\-]{3,32}" defaultValue={form?.code ?? ""} /></Field>
              <Field label="Bắt đầu (giờ VN)"><DateField type="datetime-local" name="startsAt" defaultValue={vnLocal(form?.starts_at ?? null)} /></Field>
              <Field label="Kết thúc (giờ VN)"><DateField type="datetime-local" name="endsAt" defaultValue={vnLocal(form?.ends_at ?? null)} /></Field>
              <Field label="Tổng số suất (để trống = không giới hạn)"><input name="maxRedemptions" type="number" min={1} defaultValue={form?.max_redemptions ?? ""} /></Field>
              <div className="am-pair">
                <Field label="Mỗi người tối đa"><input name="perUserLimit" type="number" min={1} max={100} defaultValue={form?.per_user_limit ?? 1} /></Field>
                <Field label="Độ ưu tiên"><input name="priority" type="number" defaultValue={form?.priority ?? 0} /></Field>
              </div>
              <Field label="Lý do thay đổi (lưu vào nhật ký)"><input name="reason" required minLength={5} maxLength={500} /></Field>
              <div className="am-actions">
                <SubmitButton className="ap-btn">Lưu (cần MFA)</SubmitButton>
                {form && <Link className="ap-btn is-secondary" href="/admin/promotions">Hủy sửa</Link>}
              </div>
            </fieldset>
          </form>
          {form && !!form.audit.length && (
            <>
              <hr className="ap-divider" />
              <span className="ap-eyebrow">Nhật ký thay đổi</span>
              <ol className="am-log">
                {form.audit.map((a) => <li key={a.id}><b>{a.reason}</b><small>{time(a.created_at)}</small></li>)}
              </ol>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
