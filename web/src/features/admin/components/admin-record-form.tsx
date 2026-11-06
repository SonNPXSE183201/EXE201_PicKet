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
    <form action={mutateAdmin} className="ap-form">
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
        <legend className="ap-eyebrow">{row ? "Cập nhật bản ghi" : "Tạo mới"}</legend>
        <label className="ap-field">
          <span>Tiêu đề</span>
          <input
            name="title"
            maxLength={160}
            required
            defaultValue={value(row, "title")}
          />
        </label>
        <label className="ap-field">
          <span>Nội dung</span>
          <textarea
            name="body"
            rows={4}
            maxLength={action === "ticket" ? 4000 : 10000}
            defaultValue={value(row, "body")}
          />
        </label>
        {action !== "partner" && (
          <label className="ap-field">
            <span>Trạng thái</span>
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
            <label className="ap-field">
              <span>Phân loại</span>
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
            <p className="ap-card-note">
              Yêu cầu xóa tài khoản: ghi nhận xác minh chủ tài khoản và tiến
              trình bằng ghi chú nội bộ. Hướng dẫn chủ tài khoản dùng chức năng
              xóa trong Picket; nút lưu ticket chỉ cập nhật tiến trình hỗ trợ.
            </p>
            <label className="ap-field">
              <span>Ưu tiên</span>
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
            <label className="ap-field">
              <span>User ID liên quan (nếu có)</span>
              <input
                name="targetUser"
                defaultValue={value(row, "target_user")}
              />
            </label>
            <label className="ap-field">
              <span>User ID người xử lý (nếu có)</span>
              <input name="assignee" defaultValue={value(row, "assignee")} />
            </label>
          </>
        ) : action === "release" ? (
          <>
            <label className="ap-field">
              <span>Phiên bản</span>
              <input
                name="version"
                required
                defaultValue={value(details, "version")}
                placeholder="1.0.9"
              />
            </label>
            <label className="ap-field">
              <span>Mã phiên bản</span>
              <input
                name="versionCode"
                type="number"
                min="1"
                required
                defaultValue={value(details, "versionCode")}
              />
            </label>
            <label className="ap-field">
              <span>Link APK chính thức</span>
              <input
                name="releaseUrl"
                type="url"
                required
                defaultValue={value(details, "url")}
              />
            </label>
            <label className="ap-field">
              <span>SHA-256</span>
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
            <label className="ap-field">
              <span>Thành phần</span>
              <input
                name="component"
                maxLength={80}
                defaultValue={value(details, "component")}
              />
            </label>
            <label className="ap-field">
              <span>Mức độ</span>
              <select
                name="severity"
                defaultValue={value(details, "severity") || "medium"}
              >
                {["low", "medium", "high", "critical"].map((s) => (
                  <option key={s} value={s}>
                    {{ medium: "Trung bình", critical: "Nghiêm trọng" }[s] ?? adminLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : action === "content" ? (
          <>
            <label className="ap-field">
              <span>Mã bài học (nếu liên kết bài học)</span>
              <input
                name="lessonId"
                maxLength={80}
                defaultValue={value(details, "lessonId")}
              />
            </label>
            <label className="ap-field">
              <span>Ngôn ngữ</span>
              <select
                name="locale"
                defaultValue={value(details, "locale") || "vi"}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="ap-field">
              <span>Phiên bản nội dung</span>
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
            <label className="ap-field">
              <span>Liên kết HTTPS</span>
              <input
                name="url"
                type="url"
                required
                defaultValue={value(row, "url")}
              />
            </label>
            <label className="ap-check">
              <span className="ap-switch">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={row?.active === true}
                />
                <span />
              </span>
              Hiển thị chiến dịch
            </label>
            <label className="ap-field">
              <span>Bắt đầu (UTC, để trống nếu không giới hạn)</span>
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={value(row, "starts_at").slice(0, 16)}
              />
            </label>
            <label className="ap-field">
              <span>Kết thúc (UTC, để trống nếu không giới hạn)</span>
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={value(row, "ends_at").slice(0, 16)}
              />
            </label>
          </>
        ) : null}
        {action === "release" && (
          <p className="ap-card-note">
            Ghi lại bản phát hành đã kiểm tra chữ ký và checksum. Thao tác này
            không tự build, deploy hoặc publish Google Play.
          </p>
        )}
        {action === "content" && (
          <p className="ap-card-note">
            Cần review độc lập trước khi công bố. Với bài học được liên kết,
            công bố cho phép chấm bài cloud của phiên bản đã duyệt; không tự
            thay nội dung đã đóng gói trong ứng dụng.
          </p>
        )}
        <label className="ap-field">
          <span>Lý do</span>
          <textarea name="reason" minLength={5} maxLength={500} required />
        </label>
        <label className="ap-field">
          <span>Nhập SAVE để xác nhận</span>
          <input
            name="confirmation"
            pattern="SAVE"
            required
            autoComplete="off"
          />
        </label>
        <SubmitButton className="ap-btn is-block">Lưu thay đổi</SubmitButton>
      </fieldset>
    </form>
  );
}
