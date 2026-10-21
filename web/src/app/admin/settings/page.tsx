import { requireApiSession } from "@/core/auth/require-api-session";
import { saveSettings } from "../settings-actions";
import { SubmitButton } from "@/core/ui/submit-button";
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { api, accessToken } = await requireApiSession("admin");
  const { settings } = await api.adminOverview(accessToken, 0);
  const query = await searchParams;
  return (
    <main className="admin-shell shell">
      <header className="admin-header">
        <div>
          <h1 className="finance-title">Cấu hình ứng dụng</h1>
          <p>Thay đổi tại đây áp dụng cho toàn bộ người dùng.</p>
        </div>
      </header>
      {query.done && (
        <p role="status" className="admin-success">
          Đã lưu cấu hình.
        </p>
      )}
      {query.error && (
        <p role="alert" className="mutation-error">
          Chưa lưu được. Kiểm tra nội dung và chuỗi xác nhận.
        </p>
      )}
      <section className="finance-panel settings-panel">
        <h2>Bảo trì và thông báo</h2>
        <form action={saveSettings} className="finance-form">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="maintenance"
              defaultChecked={settings.maintenance}
            />
            Bật chế độ bảo trì
          </label>
          <label>
            Thông báo hệ thống
            <textarea
              name="notice"
              maxLength={1000}
              rows={5}
              defaultValue={settings.notice}
            />
          </label>
          <p id="settings-warning">
            Bảo trì sẽ chặn thao tác ghi của người dùng. Chỉ thực hiện trong
            lịch bảo trì đã thống nhất. Nhập SAVE để xác nhận.
          </p>
          <label>
            Xác nhận
            <input
              name="confirmation"
              required
              pattern="SAVE"
              autoComplete="off"
              aria-describedby="settings-warning"
            />
          </label>
          <SubmitButton className="button primary">Lưu cấu hình</SubmitButton>
        </form>
      </section>
    </main>
  );
}
