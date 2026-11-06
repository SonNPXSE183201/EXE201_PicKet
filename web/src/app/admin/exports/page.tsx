import { adminLabel } from "@/features/admin/admin-labels";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import "@/features/admin/admin-platform.css";

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
    <main className="admin-platform">
      <h1>Xuất báo cáo</h1>
      <p>
        Báo cáo chạy nền. Chỉ người yêu cầu có quyền và MFA còn hợp lệ mới tải
        được. Link hết hạn sau một giờ.
      </p>
      {query.error && (
        <p role="alert">Chưa tạo được báo cáo. Kiểm tra quyền, MFA và lý do.</p>
      )}
      {query.done && <p role="status">Đã xếp hàng tạo báo cáo.</p>}
      {!mfaVerified && (
        <p className="admin-notice">
          <Link href="/admin/security">Xác minh MFA</Link> trước khi xuất dữ
          liệu.
        </p>
      )}
      <form className="finance-form admin-panel" action={create}>
        <input type="hidden" name="requestId" value={randomUUID()} />
        <fieldset disabled={!mfaVerified}>
          <legend>Tạo báo cáo CSV</legend>
          <label>
            Loại báo cáo
            <select name="section">
              {[
                "users",
                "billing",
                "ocr",
                "audit",
                "tickets",
                "acquisition",
                "engagement",
              ].map((s) => (
                <option key={s} value={s}>
                  {adminLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tìm kiếm
            <input name="search" maxLength={160} />
          </label>
          <label>
            Khoảng thời gian
            <select name="days">
              <option value="7">7 ngày</option>
              <option value="30">30 ngày</option>
              <option value="90">90 ngày</option>
            </select>
          </label>
          <label>
            Lý do
            <input name="reason" minLength={5} maxLength={500} required />
          </label>
          <label>
            Nhập SAVE để xác nhận
            <input name="confirmation" pattern="SAVE" required />
          </label>
          <SubmitButton className="button primary">Tạo báo cáo</SubmitButton>
        </fieldset>
        <p className="admin-note">
          Tối đa 25.000 dòng cho báo cáo chi tiết; báo cáo tổng hợp theo khoảng
          thời gian đã chọn. Không xuất ảnh hóa đơn, token mua hàng hoặc mật
          khẩu.
        </p>
      </form>
      <section className="admin-panel">
        <h2>Báo cáo của bạn</h2>
        <Link href="/admin/exports">Làm mới trạng thái</Link>
        {data.rows.length ? (
          <ul>
            {data.rows.map((r) => (
              <li key={r.id}>
                {adminLabel(r.section)} · {adminLabel(r.status)} ·{" "}
                {new Date(r.created_at).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
                {r.status === "ready" && r.expires_at && (
                  <a
                    className="back-link"
                    href={`/api/admin/exports/${r.id}`}
                    download
                  >
                    Tải CSV
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>Chưa có báo cáo.</p>
        )}
      </section>
    </main>
  );
}
