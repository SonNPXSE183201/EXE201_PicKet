import { adminLabel } from "../admin-labels";
import { randomUUID } from "node:crypto";
import { SubmitButton } from "@/core/ui/submit-button";
import { mutateAdmin } from "../actions";

type Row = Record<string, unknown>;
const value = (r: Row | undefined, k: string) => String(r?.[k] ?? "");
export function AdminRecordForm({
  action,
  row,
  disabled = false,
}: {
  action: string;
  row?: Row;
  disabled?: boolean;
}) {
  const details =
    row?.details && typeof row.details === "object" ? (row.details as Row) : {};
  const states =
    action === "ticket"
      ? ["open", "in_progress", "resolved", "closed"]
      : action === "incident"
        ? ["open", "investigating", "resolved"]
        : ["draft", "review", "published", "archived"];
  return (
    <form action={mutateAdmin} className="finance-form admin-editor">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="requestId" value={randomUUID()} />
      {row && (
        <>
          <input type="hidden" name="id" value={value(row, "id")} />
          <input
            type="hidden"
            name="expectedVersion"
            value={value(row, "row_version")}
          />
        </>
      )}
      <fieldset disabled={disabled}>
        <legend>{row ? "Cập nhật bản ghi" : "Tạo mới"}</legend>
        <label>
          Tiêu đề
          <input
            name="title"
            maxLength={160}
            required
            defaultValue={value(row, "title")}
          />
        </label>
        <label>
          Nội dung
          <textarea
            name="body"
            rows={4}
            maxLength={action === "ticket" ? 4000 : 10000}
            defaultValue={value(row, "body")}
          />
        </label>
        {action !== "partner" && (
          <label>
            Trạng thái
            <select
              name="status"
              defaultValue={value(row, "status") || states[0]}
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {adminLabel(s)}
                </option>
              ))}
            </select>
          </label>
        )}
        {action === "ticket" ? (
          <>
            <label>
              Phân loại
              <select
                name="category"
                defaultValue={value(row, "category") || "support"}
              >
                <option value="support">Hỗ trợ sử dụng</option>
                <option value="bug">Báo lỗi</option>
                <option value="billing">Thanh toán</option>
                <option value="account_deletion">Yêu cầu xóa tài khoản</option>
              </select>
            </label>
            <p>
              Yêu cầu xóa tài khoản: ghi nhận xác minh chủ tài khoản và tiến
              trình bằng ghi chú nội bộ. Hướng dẫn chủ tài khoản dùng chức năng
              xóa trong Picket; nút lưu ticket chỉ cập nhật tiến trình hỗ trợ.
            </p>
            <label>
              Ưu tiên
              <select
                name="priority"
                defaultValue={value(row, "priority") || "normal"}
              >
                {["low", "normal", "high", "urgent"].map((s) => (
                  <option key={s} value={s}>
                    {adminLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              User ID liên quan (nếu có)
              <input
                name="targetUser"
                defaultValue={value(row, "target_user")}
              />
            </label>
            <label>
              User ID người xử lý (nếu có)
              <input name="assignee" defaultValue={value(row, "assignee")} />
            </label>
          </>
        ) : action === "release" ? (
          <>
            <label>
              Phiên bản
              <input
                name="version"
                required
                defaultValue={value(details, "version")}
                placeholder="1.0.9"
              />
            </label>
            <label>
              Mã phiên bản
              <input
                name="versionCode"
                type="number"
                min="1"
                required
                defaultValue={value(details, "versionCode")}
              />
            </label>
            <label>
              Link APK chính thức
              <input
                name="releaseUrl"
                type="url"
                required
                defaultValue={value(details, "url")}
              />
            </label>
            <label>
              SHA-256
              <input
                name="sha256"
                pattern="[a-f0-9]{64}"
                required
                defaultValue={value(details, "sha256")}
              />
            </label>
          </>
        ) : action === "incident" ? (
          <>
            <label>
              Thành phần
              <input
                name="component"
                maxLength={80}
                defaultValue={value(details, "component")}
              />
            </label>
            <label>
              Mức độ
              <select
                name="severity"
                defaultValue={value(details, "severity") || "medium"}
              >
                {["low", "medium", "high", "critical"].map((s) => (
                  <option key={s} value={s}>
                    {adminLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : action === "content" ? (
          <>
            <label>
              Mã bài học (nếu liên kết bài học)
              <input
                name="lessonId"
                maxLength={80}
                defaultValue={value(details, "lessonId")}
              />
            </label>
            <label>
              Ngôn ngữ
              <select
                name="locale"
                defaultValue={value(details, "locale") || "vi"}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              Phiên bản nội dung
              <input
                name="contentVersion"
                type="number"
                min="1"
                defaultValue={value(details, "contentVersion") || "1"}
              />
            </label>
          </>
        ) : action === "partner" ? (
          <>
            <label>
              Liên kết HTTPS
              <input
                name="url"
                type="url"
                required
                defaultValue={value(row, "url")}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={row?.active === true}
              />
              Hiển thị chiến dịch
            </label>
            <label>
              Bắt đầu (UTC, để trống nếu không giới hạn)
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={value(row, "starts_at").slice(0, 16)}
              />
            </label>
            <label>
              Kết thúc (UTC, để trống nếu không giới hạn)
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={value(row, "ends_at").slice(0, 16)}
              />
            </label>
          </>
        ) : null}
        {action === "release" && (
          <p className="admin-note">
            Ghi lại bản phát hành đã kiểm tra chữ ký và checksum. Thao tác này
            không tự build, deploy hoặc publish Google Play.
          </p>
        )}
        {action === "content" && (
          <p className="admin-note">
            Cần review độc lập trước khi công bố. Với bài học được liên kết,
            công bố cho phép chấm bài cloud của phiên bản đã duyệt; không tự
            thay nội dung đã đóng gói trong ứng dụng.
          </p>
        )}
        <label>
          Lý do
          <textarea name="reason" minLength={5} maxLength={500} required />
        </label>
        <label>
          Nhập SAVE để xác nhận
          <input
            name="confirmation"
            pattern="SAVE"
            required
            autoComplete="off"
          />
        </label>
        <SubmitButton className="button primary">Lưu thay đổi</SubmitButton>
      </fieldset>
    </form>
  );
}
