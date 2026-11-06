/* Development-only fixtures for DEV_MOCK_AUTH=1 so the admin UI can be built and
   reviewed without a staff account. Never used when NODE_ENV === "production". */
import { adminSections } from "@/features/admin/admin-permissions";

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();
const day = (offset: number) => new Date(now - offset * 86400000).toISOString().slice(0, 10);

export const mockAdminPermissions = [
  ...Object.keys(adminSections).map((s) => `${s}.read`),
  "permissions.manage", "promotions.manage", "announcements.manage", "revenue.adjust",
];

const users = [
  ["bao.nguyen@gmail.com", "7f3a9e1c-0000-4000-8000-000000000c21", 0, true, 5, "1.0.9", "pro"],
  ["minh.tran@outlook.com", "1b9e0000-0000-4000-8000-000000000a04", 1, true, 120, "1.0.9", "free"],
  ["thu.le@icloud.com", "88c10000-0000-4000-8000-000000000f7d", 1, false, null, "1.0.8", "free"],
  ["an.pham@gmail.com", "4d020000-0000-4000-8000-0000000009be", 2, true, 1440, "1.0.9", "plus"],
  ["khoa.do@yahoo.com", "c5a70000-0000-4000-8000-000000000113", 3, true, 4320, "1.0.7", "free"],
  ["ngoc.vu@gmail.com", "2e6f0000-0000-4000-8000-000000000d58", 6, true, 1440, "1.0.9", "pro"],
  ["huy.bui@fpt.edu.vn", "93b00000-0000-4000-8000-0000000007a2", 7, true, 10080, "1.0.8", "plus"],
  ["lan.hoang@gmail.com", "0aa40000-0000-4000-8000-000000000e19", 8, false, null, "1.0.6", "free"],
] as const;

const health = [
  { component: "api", status: "ok", latency_ms: 84, message: "Probe 200 OK", checked_at: ago(1) },
  { component: "database", status: "ok", latency_ms: 12, message: "Kết nối 38/200", checked_at: ago(1) },
  { component: "ocr_cloud", status: "degraded", latency_ms: 2340, message: "Nhà cung cấp chậm", checked_at: ago(2) },
  { component: "realtime", status: "ok", latency_ms: 140, message: "1.204 kết nối mở", checked_at: ago(1) },
  { component: "google_play", status: "stale", latency_ms: null, message: "Probe trễ 22 phút", checked_at: ago(22) },
  { component: "storage", status: "ok", latency_ms: 96, message: "Dùng 41% dung lượng", checked_at: ago(1) },
];

export function mockAdminPortal(section: string, filters: Record<string, string | number> = {}): Record<string, unknown> {
  const days = Number(filters.days ?? 30);
  const base = { timezone: "Asia/Ho_Chi_Minh", asOf: ago(0), days };
  switch (section) {
    case "overview":
      return { ...base, totalUsers: 12480, newUsers: 842, newUsersPrevious: 751, verifiedUsers: 10214, paidUsers: 1126, testUsers: 14, unknownPurchaseUsers: 3, openTickets: 18, urgentTickets: 3, openIncidents: 2,
        health, dailyUsers: Array.from({ length: days }, (_, i) => ({ day: day(days - 1 - i), value: 14 + ((i * 7) % 23) + (i === days - 1 ? 10 : 0) })) };
    case "users": {
      const rows = users.map(([email, id, d, verified, active, version, tier], i) => ({
        id, email, phone: i === 2 ? "+84912345678" : null, created_at: ago(d * 1440 + 30), email_confirmed_at: verified ? ago(d * 1440) : null,
        last_sign_in_at: active === null ? null : ago(active), last_activity_at: active === null ? null : ago(active), app_version: version,
        banned_until: i === 4 ? new Date(now + 30 * 86400000).toISOString() : null, role: null, play_tier: tier, payos_tier: null, grant: null,
      }));
      const detail = filters.userId ? {
        timeline: [
          { id: 1, created_at: ago(60 * 9), action: "purchase", reason: "Mua gói Pro (tháng) · Google Play", details: null },
          { id: 2, created_at: ago(60 * 9 + 14), action: "verify_email", reason: "Xác minh email", details: null },
          { id: 3, created_at: ago(60 * 9 + 15), action: "first_open", reason: "Đăng nhập lần đầu trên Android · 1.0.9", details: null },
          { id: 4, created_at: ago(60 * 9 + 17), action: "signup", reason: "Tạo tài khoản", details: null },
        ],
        tickets: [{ id: "t1", title: "Bị trừ tiền 2 lần khi mua Pro", status: "in_progress", priority: "urgent", updated_at: ago(5) }],
        quota: [{ day: day(0), attempts: 6, successful: 6 }, { day: day(1), attempts: 3, successful: 2 }],
      } : {};
      return { ...base, rows, total: 12480, ...detail };
    }
    case "acquisition":
    case "engagement": {
      const events = Array.from({ length: 7 }, (_, i) => [
        { day: day(i), event: "landing_view", channel: "landing", events: 520 + i * 13, sessions: 310 + i * 7, users: 0 },
        { day: day(i), event: "apk_click", channel: "landing", events: 120 + i * 3, sessions: 110, users: 0 },
        { day: day(i), event: "first_open", channel: "android", events: 70 - i, sessions: 70, users: 66 },
      ]).flat();
      return { ...base, firstObservedAt: ago(60 * 24 * 40), events,
        metrics: [{ day: day(3), source: "google_play_installs", metric: "Daily Device Installs", value: 86, source_timezone: "America/Los_Angeles", observed_at: ago(300) },
                  { day: day(3), source: "apk_access", metric: "served_requests", value: 142, source_timezone: "UTC", observed_at: ago(5) }],
        integrations: [{ source: "google_play", status: "ok", message: "Nhập 3 báo cáo", updated_at: ago(300), last_success_at: ago(300) }],
        activity: { dau: 1842, wau: 5930, mau: 9412 }, funnel: { registered: 842, verified: 690, observedActive: 512 },
        retention: [{ day: 1, eligible: 612, retained: 355 }, { day: 7, eligible: 612, retained: 208 }, { day: 30, eligible: 612, retained: 128 }],
        versions: [{ version: "1.0.9", users: 6024 }, { version: "1.0.8", users: 2070 }, { version: "1.0.7", users: 847 }, { version: "1.0.6", users: 471 }] };
    }
    case "billing":
      return { ...base, financialAccess: true, total: 4,
        rows: users.slice(0, 4).map(([email, id], i) => ({ id, user_id: email, product_id: i % 2 ? "picket_plus_monthly" : "picket_pro_monthly", tier: i % 2 ? "plus" : "pro", active: true, expires_at: ago(-30 * 1440), verified_at: ago(5 + i), is_test: i === 3 ? true : false, subscription_state: "SUBSCRIPTION_STATE_ACTIVE", acknowledgement_state: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED" })),
        grants: [{ user_id: "bao.nguyen@gmail.com", tier: "pro", expires_at: ago(-25 * 1440), granted_by: "linh.tran@picket.vn" }, { user_id: "huy.bui@fpt.edu.vn", tier: "plus", expires_at: ago(-10 * 1440), granted_by: "ha.pham@picket.vn" }],
        sales: Array.from({ length: 6 }, (_, i) => ({ day: day(i * 30), metric: "charged", currency: "VND", value: 9_000_000 + i * 1_800_000, observed_at: ago(600) })) };
    case "ocr":
      return { ...base, total: 5, rows: Array.from({ length: 5 }, (_, i) => ({ day: day(i), scans: 312 - i * 9, successful: 290 - i * 10, average_ms: 1740 + i * 30, p95_ms: 3620 + i * 40 })),
        diagnostics: [{ metric: "ocr_low_quality", day: day(0), value: 214, observed_at: ago(10) }, { metric: "ocr_not_receipt", day: day(0), value: 132, observed_at: ago(10) }, { metric: "ocr_timeout", day: day(0), value: 41, observed_at: ago(10) }] };
    case "health":
      return { ...base, staleMinutes: 15, total: health.length, rows: health,
        queue: [{ queue: "ocr_cloud", status: "degraded", jobs: 42 }, { queue: "push", status: "ok", jobs: 0 }, { queue: "exports", status: "ok", jobs: 1 }],
        vitals: [{ day: day(2), metric: "crash_rate", value: 0.42, source_timezone: "UTC", observed_at: ago(600) }, { day: day(2), metric: "anr_rate", value: 0.18, source_timezone: "UTC", observed_at: ago(600) }],
        probeSuccess: health.map((h) => ({ component: h.component, samples: 288, successful: h.status === "ok" ? 288 : 260 })), diagnostics: [] };
    case "tickets":
      return { ...base, total: 5, rows: [
        { id: "t2481", title: "Bị trừ tiền 2 lần khi mua Pro", status: "in_progress", priority: "urgent", target_user: "bao.nguyen@gmail.com", assignee: "Linh Trần", updated_at: ago(5), row_version: 3 },
        { id: "t2480", title: "Không quét được hoá đơn siêu thị", status: "open", priority: "high", target_user: "minh.tran@outlook.com", assignee: "Hà Phạm", updated_at: ago(60), row_version: 1 },
        { id: "t2479", title: "Mất đồng bộ giữa 2 điện thoại", status: "open", priority: "high", target_user: "an.pham@gmail.com", assignee: null, updated_at: ago(120), row_version: 1 },
        { id: "t2478", title: "Muốn xuất dữ liệu sang Excel", status: "in_progress", priority: "normal", target_user: "ngoc.vu@gmail.com", assignee: "Hà Phạm", updated_at: ago(800), row_version: 2 },
        { id: "t2477", title: "Quên mật khẩu, không nhận email", status: "open", priority: "low", target_user: "lan.hoang@gmail.com", assignee: null, updated_at: ago(900), row_version: 1 },
      ], comments: [{ id: "c1", ticket_id: "t2481", author: "Hà Phạm", body: "Đã kiểm tra Google Play: 2 giao dịch, 1 đang chờ hoàn tiền.", created_at: ago(30) }, { id: "c2", ticket_id: "t2481", author: "Linh Trần", body: "Cấp tạm Pro 30 ngày trong lúc chờ Google hoàn tiền.", created_at: ago(26) }] };
    case "incidents":
      return { ...base, total: 4, rows: [
        { id: "i1", title: "OCR cloud phản hồi chậm", status: "investigating", updated_at: ago(5), details: { impact: "Chụp hoá đơn trên Android", owner: "Hà Phạm" }, row_version: 2 },
        { id: "i2", title: "Google Play API lỗi 503", status: "open", updated_at: ago(22), row_version: 1 },
        { id: "i3", title: "Đồng bộ realtime mất kết nối", status: "resolved", updated_at: ago(60 * 24 * 8), row_version: 4 },
        { id: "i4", title: "Email xác minh gửi trễ", status: "resolved", updated_at: ago(60 * 24 * 13), row_version: 3 },
      ] };
    case "releases":
      return { ...base, total: 4, rows: [
        { id: "r10", title: "1.0.10", status: "review", details: "Sửa lỗi đồng bộ, OCR nhanh hơn 20%", updated_at: ago(60), row_version: 1 },
        { id: "r9", title: "1.0.9", status: "published", details: "Túi ngân sách mới, chốt tháng", updated_at: ago(60 * 24 * 9), row_version: 3 },
        { id: "r8", title: "1.0.8", status: "archived", details: "Giao diện Ví giấy", updated_at: ago(60 * 24 * 25), row_version: 2 },
        { id: "r7", title: "1.0.7", status: "archived", details: "Nhận diện hoá đơn trên máy", updated_at: ago(60 * 24 * 36), row_version: 2 },
      ] };
    case "content":
      return { ...base, total: 4, rows: [
        { id: "l1", title: "Tiền đi đâu mỗi tuần?", status: "published", body: "lessons/where-money-goes.md", updated_at: ago(600), row_version: 2 },
        { id: "l2", title: "Chia túi theo cách nào?", status: "published", body: "lessons/pockets.md", updated_at: ago(900), row_version: 2 },
        { id: "l3", title: "Quỹ khẩn cấp: bao nhiêu là đủ?", status: "review", body: "lessons/emergency-fund.md", updated_at: ago(120), row_version: 4 },
        { id: "l4", title: "Hoá đơn định kỳ không bị quên", status: "draft", body: "lessons/bills.md", updated_at: ago(60), row_version: 1 },
      ], lessons: [{ lesson_id: "L01", content_version: 2, published: true }, { lesson_id: "L02", content_version: 2, published: true }, { lesson_id: "L03", content_version: 1, published: false }] };
    case "partners":
      return { ...base, total: 4, rows: [
        { id: "p1", title: "Giảm 10% khi thanh toán bằng ví", url: "https://choxanh.vn/picket", active: true, starts_at: ago(-0), ends_at: ago(-25 * 1440), partner: "Chợ Xanh", row_version: 1 },
        { id: "p2", title: "Tặng size L cho hoá đơn từ 59.000 ₫", url: "https://caphesuong.vn/uu-dai", active: true, starts_at: ago(20 * 1440), ends_at: ago(-9 * 1440), partner: "Cà phê Sương", row_version: 1 },
        { id: "p3", title: "Hoàn 30.000 ₫ đơn đầu tiên", url: "https://sachgio.vn/picket", active: false, starts_at: ago(-25 * 1440), ends_at: ago(-55 * 1440), partner: "Sách Gió", row_version: 1 },
        { id: "p4", title: "Giảm 15.000 ₫ chuyến đi sáng", url: "https://xenhanh.vn/picket", active: false, starts_at: ago(40 * 1440), ends_at: ago(6 * 1440), partner: "Xe Nhanh", row_version: 1 },
      ] };
    case "integrations":
      return { ...base, total: 4, rows: [
        { source: "google_play", status: "ok", message: "Nhập 3 báo cáo, 86 dòng", updated_at: ago(300), last_success_at: ago(300) },
        { source: "apk_access", status: "ok", message: "142 lượt phục vụ", updated_at: ago(5), last_success_at: ago(5) },
        { source: "landing_analytics", status: "error", message: "Token hết hạn — cần cấp lại", updated_at: ago(60 * 20), last_success_at: ago(60 * 44) },
        { source: "ocr_provider", status: "not_configured", message: "Chưa có khoá báo cáo usage", updated_at: null, last_success_at: null },
      ] };
    case "audit":
      return { ...base, total: 1204, rows: [
        { id: 1, created_at: ago(26), actor: "linh.tran@picket.vn", action: "grant", target: "bao.nguyen@gmail.com", reason: "Bị trừ tiền 2 lần", request_id: "req_8f2a", details: { tier: "pro", days: 30 } },
        { id: 2, created_at: ago(40), actor: "ha.pham@picket.vn", action: "comment", target: "Yêu cầu #2481", reason: null, request_id: "req_8e91", details: null },
        { id: 3, created_at: ago(68), actor: "system", action: "incident", target: "OCR cloud phản hồi chậm", reason: "p95 > 2.000 ms", request_id: "req_8d07", details: null },
        { id: 4, created_at: ago(60 * 17), actor: "linh.tran@picket.vn", action: "suspend", target: "khoa.do@yahoo.com", reason: "Gian lận hoàn tiền", request_id: "req_8b55", details: null },
        { id: 5, created_at: ago(60 * 26), actor: "minh.do@picket.vn", action: "settings", target: "Cấu hình ứng dụng", reason: "Giảm báo động giả", request_id: "req_8a10", details: { staleMinutes: [10, 15] } },
      ] };
    case "staff":
      return { ...base, total: 4, rows: [
        { email: "linh.tran@picket.vn", user_id: "7a1c0000-0000-4000-8000-0000000000e2", role: "owner", mfa: true },
        { email: "minh.do@picket.vn", user_id: "3b8f0000-0000-4000-8000-0000000000a7", role: "operations", mfa: true },
        { email: "ha.pham@picket.vn", user_id: "9c200000-0000-4000-8000-0000000004d1", role: "support", mfa: true },
        { email: "quan.le@picket.vn", user_id: "1e7d0000-0000-4000-8000-0000000000b0", role: "analyst", mfa: false },
      ] };
    case "settings":
      return { ...base, settings: { row_version: 14, maintenance: false, notice: "Picket bảo trì 23:00–23:30 tối nay, dữ liệu vẫn an toàn.", analytics_retention_days: 90, aggregate_retention_months: 13, disk_warning_percent: 85, probe_timeout_seconds: 10, stale_minutes: 15 } };
    default:
      return { ...base, rows: [], total: 0 };
  }
}
