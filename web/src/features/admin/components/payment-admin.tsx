import Link from "next/link";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { saveUserPermission, savePermissionGroup } from "../payment-actions";

type Query = Record<string, string | undefined>;
type Order = {
  id: string;
  user_id: string | null;
  order_code: number;
  amount: number;
  status: string;
  created_at: string;
};
export async function PaymentAdmin({
  section,
  query,
}: {
  section: "revenue" | "payments" | "permissions";
  query: Query;
}) {
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  if (section === "revenue") {
    const filters: Record<string, string> = { view: "revenue" };
    for (const k of ["from", "to", "bucket", "period"])
      if (query[k]) filters[k] = query[k]!;
    const data = await api.adminPayments<{
      total: number;
      series: { period: string; amount: number; transactions: number }[];
      coverage: string;
    }>(accessToken, filters);
    return (
      <main className="admin-platform payment-admin">
        <h1>Doanh thu</h1>
        <p>
          Tiền thực nhận PayOS, VND. Khoản hoàn và Google Play chưa được nhập
          vào tổng này.
        </p>
        <form className="admin-filter">
          <label>
            Kỳ{" "}
            <select name="period" defaultValue={query.period ?? "month"}>
              <option value="day">Hôm nay</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
              <option value="custom">Tùy chọn</option>
            </select>
          </label>{" "}
          <label>
            Từ ngày giờ{" "}
            <input
              type="datetime-local"
              name="from"
              defaultValue={query.from}
            />
          </label>{" "}
          <label>
            Đến ngày giờ{" "}
            <input type="datetime-local" name="to" defaultValue={query.to} />
          </label>{" "}
          <label>
            Nhóm theo{" "}
            <select name="bucket" defaultValue={query.bucket ?? "day"}>
              <option value="day">Ngày</option>
              <option value="month">Tháng</option>
              <option value="year">Năm</option>
            </select>
          </label>
          <button className="button primary">Lọc</button>
        </form>
        <h2>{formatVnd(data.total)}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kỳ (giờ Việt Nam)</th>
              <th>Tiền nhận</th>
              <th>Giao dịch</th>
            </tr>
          </thead>
          <tbody>
            {data.series.map((row) => (
              <tr key={row.period}>
                <td>{row.period.replace("T", " ")}</td>
                <td>{formatVnd(row.amount)}</td>
                <td>{row.transactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.series.length && <p>Chưa có khoản nhận trong kỳ.</p>}
      </main>
    );
  }
  if (section === "payments") {
    const filters: Record<string, string> = {};
    for (const k of ["id", "status", "before", "beforeId"])
      if (query[k]) filters[k] = query[k]!;
    const data = await api.adminPayments<{
      orders: Order[];
      events: {
        id: number;
        event_type: string;
        created_at: string;
        details: Record<string, unknown>;
      }[];
    }>(accessToken, filters);
    return (
      <main className="admin-platform payment-admin">
        <h1>Giao dịch thanh toán</h1>
        <form className="admin-filter">
          <label>
            Trạng thái{" "}
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">Tất cả</option>
              {["pending", "paid", "review", "cancelled", "expired"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <button className="button primary">Lọc</button>
        </form>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/payments?id=${o.id}`}>
                    #{o.order_code}
                  </Link>
                </td>
                <td>{formatVnd(o.amount)}</td>
                <td>{o.status}</td>
                <td>
                  {new Date(o.created_at).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.orders.length && <p>Chưa có giao dịch.</p>}
        {data.orders.length === 50 && (
          <Link
            href={`/admin/payments?before=${encodeURIComponent(data.orders.at(-1)!.created_at)}&beforeId=${data.orders.at(-1)!.id}`}
          >
            Trang tiếp
          </Link>
        )}
        {!!data.events.length && (
          <>
            <h2>Nhật ký đơn</h2>
            <ol>
              {data.events.map((e) => (
                <li key={e.id}>
                  {e.created_at} · {e.event_type}
                  {typeof e.details.amount === "number"
                    ? ` · ${formatVnd(e.details.amount)}`
                    : ""}
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    );
  }
  const userId =
    query.userId && /^[a-f0-9-]{36}$/i.test(query.userId)
      ? query.userId
      : undefined;
  const data = await api.adminPermissions<{
    catalog: { code: string; description: string }[];
    rules: {
      permission: string;
      allowed: boolean;
      revision: number;
      expires_at: string | null;
    }[];
    groups: {
      id: string;
      name: string;
      revision: number;
      permissions: string[];
      member: boolean;
    }[];
  }>(accessToken, userId);
  return (
    <main className="admin-platform payment-admin">
      <h1>Phân quyền người dùng</h1>
      <p>
        Chọn user bất kỳ bằng UUID. Quyền từ chối riêng ghi đè quyền nhóm; không
        làm mất quyền dùng ứng dụng cá nhân.
      </p>
      <form className="admin-filter">
        <label>
          UUID người dùng{" "}
          <input
            name="userId"
            required
            defaultValue={userId}
            pattern="[a-fA-F0-9-]{36}"
          />
        </label>
        <button className="button secondary">Tra cứu</button>
      </form>
      {query.error && (
        <p role="alert">
          Không lưu được quyền. Kiểm tra MFA, dữ liệu hoặc tải lại phiên bản
          quyền mới nhất.
        </p>
      )}
      {query.saved && <p role="status">Đã lưu quyền.</p>}
      {!mfaVerified && (
        <p>
          Cần <Link href="/admin/security">xác minh MFA</Link> để thay đổi
          quyền.
        </p>
      )}
      <h2>Nhóm quyền tùy chỉnh</h2>
      {[
        ...data.groups,
        { id: "", name: "", revision: 0, permissions: [], member: false },
      ].map((group) => (
        <details key={group.id || "new"}>
          <summary>{group.name || "Tạo nhóm mới"}</summary>
          <form className="finance-form" action={savePermissionGroup}>
            <input type="hidden" name="action" value="save" />
            <input type="hidden" name="id" value={group.id} />
            <input type="hidden" name="revision" value={group.revision} />
            <input type="hidden" name="userId" value={userId ?? ""} />
            <label>
              Tên nhóm{" "}
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={group.name}
              />
            </label>
            <fieldset>
              <legend>Quyền trong nhóm</legend>
              {data.catalog.map((c) => (
                <label key={c.code} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={c.code}
                    defaultChecked={group.permissions.includes(c.code)}
                  />
                  {c.code}
                </label>
              ))}
            </fieldset>
            <label>
              Lý do{" "}
              <input name="reason" required minLength={5} maxLength={500} />
            </label>
            <button className="button primary" disabled={!mfaVerified}>
              Lưu nhóm
            </button>
          </form>
          {userId && group.id && (
            <form className="finance-form" action={savePermissionGroup}>
              <input type="hidden" name="action" value="member" />
              <input type="hidden" name="id" value={group.id} />
              <input type="hidden" name="userId" value={userId} />
              <input
                type="hidden"
                name="enabled"
                value={group.member ? "false" : "true"}
              />
              <label>
                Hết hạn thành viên{" "}
                <input type="datetime-local" name="expiresAt" />
              </label>
              <label>
                Lý do{" "}
                <input name="reason" required minLength={5} maxLength={500} />
              </label>
              <button className="button secondary" disabled={!mfaVerified}>
                {group.member ? "Gỡ user khỏi nhóm" : "Thêm user vào nhóm"}
              </button>
            </form>
          )}
        </details>
      ))}
      <h2>Quyền riêng của user</h2>
      {userId &&
        data.catalog.map((c) => {
          const rule = data.rules.find((r) => r.permission === c.code);
          return (
            <form
              className="admin-filter"
              action={saveUserPermission}
              key={c.code}
              style={{ borderTop: "1px solid var(--line)", padding: "1rem 0" }}
            >
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="permission" value={c.code} />
              <input
                type="hidden"
                name="revision"
                value={rule?.revision ?? 0}
              />
              <strong>{c.code}</strong>{" "}
              <label>
                Hiệu lực{" "}
                <select
                  name="allowed"
                  defaultValue={rule?.allowed === false ? "false" : "true"}
                >
                  <option value="true">Cho phép</option>
                  <option value="false">Từ chối</option>
                </select>
              </label>{" "}
              <label>
                Hết hạn <input type="datetime-local" name="expiresAt" />
              </label>{" "}
              <label>
                Lý do{" "}
                <input name="reason" required minLength={5} maxLength={500} />
              </label>{" "}
              <button className="button primary" disabled={!mfaVerified}>
                Lưu quyền
              </button>
            </form>
          );
        })}
    </main>
  );
}
