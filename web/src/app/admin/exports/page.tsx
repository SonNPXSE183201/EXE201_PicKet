import { adminLabel } from "@/features/admin/admin-labels";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import { Banner, Button, Card, Chip, Field, Tile, formatDateTime, type ChipTone } from "@/features/admin/ui/paper";
import "@/features/admin/components/modules.css";

async function create(form: FormData) {
  "use server";
  const { api, accessToken } = await requireApiSession("admin");
  try {
    if (form.get("confirmation") !== "SAVE") throw new Error();
    await api.requestAdminExport(accessToken, {
      section: String(form.get("section")),
      filters: {
        search: String(form.get("search") ?? ""),
        days: Number(form.get("days") ?? 30),
      },
      reason: String(form.get("reason")),
      requestId: String(form.get("requestId")),
    });
  } catch {
    redirect("/admin/exports?error=1");
  }
  revalidatePath("/admin/exports");
  redirect("/admin/exports?done=1");
}
const SECTIONS = ["users", "billing", "ocr", "audit", "tickets", "acquisition", "engagement"];
const STATUS_TONES: Record<string, ChipTone> = { ready: "success", queued: "outline", running: "warning", failed: "warning", expired: "outline" };

/* Figma › Admin Web › 23 · Xuất báo cáo (156:8109): create form left, recent exports right. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const query = await searchParams;
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  const data = await api.adminExports<{
    rows: {
      id: string;
      section: string;
      status: string;
      created_at: string;
      expires_at: string | null;
    }[];
  }>(accessToken);
  return (
    <div className="am-exports">
      {query.error && <Banner tone="danger" icon="alert" title="Chưa tạo được báo cáo" text="Kiểm tra quyền, MFA và lý do." />}
      {query.done && <Banner tone="success" icon="check" title="Đã xếp hàng tạo báo cáo" />}
      {!mfaVerified && (
        <Banner icon="list" title="Bạn đang ở chế độ đọc" text="Xác minh MFA trước khi xuất dữ liệu."
          action={<Button href="/admin/security" variant="ghost">Xác minh MFA</Button>} />
      )}
      <div className="am-export-grid">
        <Card eyebrow="File CSV · link tải hết hạn sau một giờ" title="Tạo báo cáo CSV">
          <form className="ap-form" action={create}>
            <input type="hidden" name="requestId" value={randomUUID()} />
            <fieldset disabled={!mfaVerified}>
              <legend className="ap-eyebrow">Loại dữ liệu</legend>
              <div className="am-pills">
                {SECTIONS.map((s, i) => (
                  <label key={s} className="am-pill">
                    <input type="radio" name="section" value={s} defaultChecked={i === 0} />
                    <span>{adminLabel(s)}</span>
                  </label>
                ))}
              </div>
              <Field label="Tìm kiếm"><input name="search" maxLength={160} /></Field>
              <div className="am-seg-wrap">
                <span className="ap-eyebrow" id="export-range">Khoảng thời gian</span>
                <div className="am-seg" role="radiogroup" aria-labelledby="export-range">
                  {[["7", "7 ngày"], ["30", "30 ngày"], ["90", "90 ngày"]].map(([v, l]) => (
                    <label key={v}><input type="radio" name="days" value={v} defaultChecked={v === "30"} /><span>{l}</span></label>
                  ))}
                </div>
              </div>
              <Field label="Lý do xuất (ghi vào nhật ký)"><input name="reason" minLength={5} maxLength={500} required /></Field>
              <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
              <p className="am-note"><AdminIcon name="lock" size={16} />
                <span>Tối đa 25.000 dòng cho báo cáo chi tiết; báo cáo tổng hợp theo khoảng thời gian đã chọn. Không xuất ảnh hóa đơn, token mua hàng hoặc mật khẩu.</span>
              </p>
              <SubmitButton className="ap-btn is-block">Tạo báo cáo</SubmitButton>
            </fieldset>
          </form>
        </Card>

        <section className="am-col" aria-labelledby="export-list">
          <header className="am-head">
            <div><span className="ap-eyebrow">Báo cáo của bạn</span><h2 id="export-list" className="ap-card-title">Báo cáo gần nhất</h2></div>
            <Button href="/admin/exports" variant="secondary">Làm mới trạng thái</Button>
          </header>
          {data.rows.length ? (
            <ul className="am-export-list">
              {data.rows.map((r) => {
                const downloadable = r.status === "ready" && r.expires_at;
                return (
                  <li key={r.id} className={r.status === "expired" ? "is-dim" : undefined}>
                    <Tile icon="receipt" tone={r.status === "ready" ? "mint" : r.status === "failed" ? "coral" : r.status === "running" ? "blue" : "cream"} large />
                    <span className="am-grow">
                      <b>{adminLabel(r.section)}</b>
                      <small>{formatDateTime(r.created_at)}</small>
                    </span>
                    <Chip tone={STATUS_TONES[r.status] ?? "outline"}>{r.status === "running" ? "Đang xử lý" : adminLabel(r.status)}</Chip>
                    {downloadable && <a className="ap-btn is-coral" href={`/api/admin/exports/${r.id}`} download>Tải CSV</a>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ap-card-note">Chưa có báo cáo.</p>
          )}
        </section>
      </div>
    </div>
  );
}
