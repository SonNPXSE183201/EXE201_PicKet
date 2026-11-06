import { PicketApiClient } from "@picket/api-client";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/core/supabase/server";
import { workspaceRedirect } from "./workspace-policy";
import { mockAdminPermissions, mockAdminPortal } from "./mock-admin-data";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/* Dev-only sample data for the admin payment/revenue/promotion/announcement/release/permission screens.
   Shapes follow the real API responses; never used outside DEV_MOCK_AUTH. */
const mockAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();
const mockDay = (daysAgo: number) => mockAgo(daysAgo * 24).slice(0, 10);
const MOCK_CATALOG = [
  { sku: "picket_plus_monthly", tier: "plus", months: 1, amount: 19000 },
  { sku: "picket_pro_monthly", tier: "pro", months: 1, amount: 39000 },
  { sku: "picket_plus_yearly", tier: "plus", months: 12, amount: 199000 },
  { sku: "picket_pro_yearly", tier: "pro", months: 12, amount: 499000 },
];
function mockPayments(filters: Record<string, string> = {}) {
  const base = [
    ["paid", 39000, 2], ["paid", 199000, 5], ["pending", 19000, 0.1], ["expired", 39000, 9], ["paid", 499000, 20],
    ["cancelled", 19000, 26], ["review", 39000, 31], ["paid", 19000, 48], ["expired", 199000, 60], ["paid", 39000, 75],
  ] as const;
  const all = base.map(([status, amount, h], i) => ({
    id: `00000000-0000-4000-8000-0000000000${String(i + 10)}`,
    user_id: `a1b2c3d4-0000-4000-8000-0000000000${String(i + 10)}`,
    order_code: 240100 + i * 7, amount, status,
    created_at: mockAgo(h), expires_at: new Date(Date.parse(mockAgo(h)) + 15 * 60_000).toISOString(),
  }));
  const orders = filters.status ? all.filter((o) => o.status === filters.status) : all;
  const events = filters.id ? [
    { id: 3, event_type: "payment.paid", created_at: mockAgo(1.9), details: { amount: 39000 } },
    { id: 2, event_type: "link.created", created_at: mockAgo(2), details: {} },
    { id: 1, event_type: "order.created", created_at: mockAgo(2.01), details: { amount: 39000 } },
  ] : [];
  if (filters.view === "revenue") return { total: 1_240_000, reviewTotal: 39000, coverage: "payos", series: [{ period: `${mockDay(1)}T00:00`, amount: 520000, transactions: 6 }, { period: `${mockDay(0)}T00:00`, amount: 720000, transactions: 9 }] };
  return { total: orders.length, series: [], orders, events };
}
function mockRevenue(filters: Record<string, string> = {}) {
  const all = [
    [1, "payos", "charge", "confirmed", 39000, 1, "240100"], [2, "google_play", "charge", "estimated", 39000, 2, "GPA.3301-1142"],
    [3, "payos", "charge", "confirmed", 199000, 6, "240107"], [4, "payos", "refund", "confirmed", -39000, 8, "RF-240100"],
    [5, "google_play", "charge", "confirmed", 499000, 12, "GPA.3301-1090"], [6, "payos", "charge", "review", 39000, 20, "240121"],
    [7, "payos", "charge", "confirmed", 19000, 30, "240128"], [8, "google_play", "charge", "estimated", 19000, 40, "GPA.3301-1031"],
  ] as const;
  let entries = all.map(([id, source, kind, status, amount, h, ref]) => ({
    id, source, kind, status, external_ref: ref, order_code: source === "payos" ? Number(ref.replace(/\D/g, "")) || null : null,
    payment_order_id: source === "payos" ? "00000000-0000-4000-8000-000000000010" : null, user_id: id % 2 ? "a1b2c3d4-0000-4000-8000-000000000010" : null,
    sku: "picket_pro_monthly", currency: "VND", amount_original: amount, amount_vnd: amount, is_test: false, occurred_at: mockAgo(h), revisions: 0,
    note: kind === "refund" ? "Khách bị trừ tiền hai lần" : null, evidence: { provider: source, ref },
  }));
  for (const k of ["source", "status", "kind"]) if (filters[k]) entries = entries.filter((e) => String((e as Record<string, unknown>)[k]) === filters[k]);
  if (filters.view === "entries") {
    return { entries, history: filters.id && entries[0] ? [{ id: 1, changed_at: mockAgo(4), previous: { ...entries[0], status: "estimated" } }] : [] };
  }
  const series: { period: string; source: string; amount: number; entries: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    series.push({ period: mockDay(d), source: "payos", amount: 80000 + ((d * 37) % 7) * 41000, entries: 2 + (d % 4) });
    series.push({ period: mockDay(d), source: "google_play", amount: 40000 + ((d * 53) % 5) * 38000, entries: 1 + (d % 3) });
  }
  return {
    confirmedVnd: 4_872_000, estimatedVnd: 1_136_000, reviewVnd: 39000, unconverted: [{ currency: "USD", amount: 4 }],
    bySource: [
      { source: "payos", name: "PayOS", enabled: true, confirmed: 3_210_000, estimated: 0, charges: 58, refunded: 78000 },
      { source: "google_play", name: "Google Play", enabled: true, confirmed: 1_662_000, estimated: 1_136_000, charges: 41, refunded: 0 },
    ],
    series, entries: [], history: [],
  };
}
const MOCK_PERMISSION_CATALOG = [
  ["users.read", "Xem người dùng"], ["users.manage", "Khoá/mở khoá tài khoản"], ["revenue.read", "Xem doanh thu"], ["revenue.adjust", "Điều chỉnh doanh thu"],
  ["payments.read", "Xem giao dịch PayOS"], ["exports.create", "Xuất báo cáo"], ["releases.manage", "Quản lý phiên bản"], ["announcements.manage", "Gửi thông báo"],
].map(([code, description]) => ({ code, description }));
const mockRelease = (id: string, channel: string, name: string, code: number, status: string, rollout: number | null, by: string | null, h: number) => {
  const file = channel === "landing" || channel === "apkpure";
  return {
    id, channel, version_name: name, version_code: code, status, rollout_percent: rollout, sha256: file ? "a".repeat(64) : null,
    bytes: file ? 48_300_000 : null, filename: file ? `picket-${name}.apk` : null, abi: "arm64-v8a", min_sdk: 24, min_supported_code: code > 108 ? 108 : null,
    notes_vi: "Sửa lỗi đồng bộ, OCR nhanh hơn 20%", notes_en: "Sync fixes, OCR 20% faster",
    released_at: mockAgo(h), verified_at: by ? mockAgo(h) : null, verified_by: by, revision: 1,
    audit: [{ id: 1, source: "admin", reason: "Đồng bộ từ Play API", created_at: mockAgo(h) }],
  };
};

function createMockApiClient(): PicketApiClient {
  return {
    async currentProfile() {
      return {
        profile: {
          id: "mock-user-123",
          displayName: "Nguyễn Sơn",
          locale: "vi-VN",
          timezone: "Asia/Ho_Chi_Minh",
          currencyCode: "VND",
          persona: "Đi làm",
          goal: "Hiểu chi tiêu",
          onboardingCompleted: true,
          hideBalance: false,
        },
      };
    },
    async listAccounts() {
      return {
        accounts: [
          { id: "acc-1", name: "Ví Tiền mặt", kind: "cash", currencyCode: "VND", openingBalance: 500000, archived: false, version: 1 },
          { id: "acc-2", name: "MB Bank", kind: "bank", currencyCode: "VND", openingBalance: 12000000, archived: false, version: 1 },
        ],
      };
    },
    async listTransactions() {
      const now = new Date();
      return {
        transactions: [
          { id: "tx-1", accountId: "acc-1", categoryId: "c2", kind: "expense", amount: 45000, title: "Cà phê sáng", occurredAt: new Date(now.getTime() - 2 * 3600000).toISOString(), version: 1 },
          { id: "tx-2", accountId: "acc-1", categoryId: "c3", kind: "expense", amount: 185000, title: "Siêu thị WinMart", occurredAt: new Date(now.getTime() - 8 * 3600000).toISOString(), version: 1 },
          { id: "tx-3", accountId: "acc-2", categoryId: "c1", kind: "income", amount: 18500000, title: "Lương tháng 10", occurredAt: new Date(now.getTime() - 24 * 3600000).toISOString(), version: 1 },
          { id: "tx-4", accountId: "acc-2", categoryId: "c4", kind: "expense", amount: 420000, title: "Mua sắm đồ dùng gia đình", occurredAt: new Date(now.getTime() - 48 * 3600000).toISOString(), version: 1 },
        ],
        totalCount: 4,
        hasMore: false,
      };
    },
    async listCategories() {
      return {
        categories: [
          { id: "c1", name: "Lương", kind: "income", color: "#793268", custom: false, version: 1 },
          { id: "c2", name: "Ăn uống & Cà phê", kind: "expense", color: "#BD3152", custom: false, version: 1 },
          { id: "c3", name: "Đi chợ & Thực phẩm", kind: "expense", color: "#1B7A5A", custom: false, version: 1 },
          { id: "c4", name: "Mua sắm", kind: "expense", color: "#6A5ACD", custom: false, version: 1 },
          { id: "c5", name: "Thưởng", kind: "income", color: "#FF9800", custom: false, version: 1 },
          { id: "c6", name: "Đầu tư", kind: "income", color: "#2196F3", custom: false, version: 1 },
          { id: "c7", name: "Quà tặng", kind: "both", color: "#E91E63", custom: false, version: 1 },
          { id: "c8", name: "Di chuyển", kind: "expense", color: "#009688", custom: false, version: 1 },
        ],
      };
    },
    async listBudgets() {
      return {
        budgets: [
          { id: "b1", categoryId: "c2", defaultLimit: 3000000, currencyCode: "VND", warningThreshold: 0.8, archived: false, version: 1 },
          { id: "b2", categoryId: "c3", defaultLimit: 4000000, currencyCode: "VND", warningThreshold: 0.85, archived: false, version: 1 },
        ],
      };
    },
    async getPlanning() {
      return { planning: { periods: [] }, periods: [], allocations: [] } as unknown as { periods: Array<{ budgetId: string; limit: number }>; allocations: unknown[] };
    },
    async listReceipts() {
      return { receipts: [] };
    },
    async currentEntitlements() {
      return { tier: "free", ocrFallbackRemaining: 5, ocrFallbackDailyLimit: 5, ocrFallbackUsed:0 };
    },
    async paymentCustomer() {return {catalog:[
      {sku:'picket_plus_monthly',tier:'plus',months:1,amount:19000},
      {sku:'picket_pro_monthly',tier:'pro',months:1,amount:39000},
      {sku:'picket_plus_yearly',tier:'plus',months:12,amount:199000},
      {sku:'picket_pro_yearly',tier:'pro',months:12,amount:499000},
    ],orders:[]};},
    async adminPortal(_token: string, section: string, filters: Record<string, string | number> = {}) { return mockAdminPortal(section, filters); },
    async adminMutate() { return { updated: true, id: 'mock' }; },
    async adminAccountAction() { return { updated: true }; },
    async requestAdminExport() { return { id: 'mock-export', status: 'queued' }; },
    async adminPayments(_t: string, filters: Record<string, string> = {}) { return mockPayments(filters); },
    async adminRevenue(_t: string, filters: Record<string, string> = {}) { return mockRevenue(filters); },
    async adminExports() {
      return { rows: [
        { id: "e1", section: "users", status: "ready", created_at: mockAgo(1), expires_at: mockAgo(-23) },
        { id: "e2", section: "audit", status: "running", created_at: mockAgo(1.1), expires_at: null },
        { id: "e3", section: "ocr", status: "queued", created_at: mockAgo(1.2), expires_at: null },
        { id: "e4", section: "billing", status: "failed", created_at: mockAgo(20), expires_at: null },
        { id: "e5", section: "tickets", status: "expired", created_at: mockAgo(120), expires_at: mockAgo(96) },
      ] };
    },
    async adminRevenueAdjust() {return {};},
    async adminPromotions() {
      const base = { description: null, channels: ["payos"], per_user_limit: 1, priority: 0, play_offer_id: null, revision: 1, audit: [{ id: 1, reason: "Tạo chiến dịch", created_at: mockAgo(72) }] };
      return { catalog: MOCK_CATALOG, promotions: [
        { ...base, id: "p1", name: "Gói sáng lập 100 người đầu", description: "Giảm 30% cho 100 người dùng đầu tiên", code: null, discount_percent: 30, skus: ["picket_pro_yearly", "picket_plus_yearly"], starts_at: mockAgo(240), ends_at: mockAgo(-480), max_redemptions: 100, enabled: true, used: 62, consumed: 58 },
        { ...base, id: "p2", name: "Chào tháng mới", code: "THANGMOI", discount_percent: 15, skus: ["picket_plus_monthly", "picket_pro_monthly"], channels: ["payos", "google_play"], play_offer_id: "thang-moi-15", starts_at: mockAgo(24), ends_at: mockAgo(-240), max_redemptions: null, enabled: true, used: 9, consumed: 9 },
        { ...base, id: "p3", name: "Black Friday", code: null, discount_percent: 40, skus: ["picket_pro_yearly"], starts_at: mockAgo(-1200), ends_at: mockAgo(-1100), max_redemptions: 200, enabled: false, used: 0, consumed: 0 },
        { ...base, id: "p4", name: "Học sinh sinh viên", code: "SINHVIEN", discount_percent: 20, skus: ["picket_plus_monthly"], starts_at: mockAgo(2000), ends_at: mockAgo(100), max_redemptions: 50, enabled: true, used: 50, consumed: 47 },
      ] };
    },
    async savePromotion() {return {};},
    async announcements() {return {maintenance:{active:false,notice:''},items:[]};},
    async adminAnnouncements() {
      const base = { severity: "info", body_vi: "", title_en: null, body_en: null, cta_label_vi: null, cta_label_en: null, cta_route: null, cta_url: null, promotion_id: null, incident_id: null, channels: ["play", "apk", "web"], tiers: ["guest", "free", "plus", "pro"], min_version_code: null, max_version_code: null, ends_at: null, blocking: false, dismissible: true, notify: false, pinned: false, revision: 1, audit: [{ id: 1, reason: "Tạo thông báo", created_at: mockAgo(30) }] };
      return {
        announcements: [
          { ...base, id: "n1", kind: "promotion", title_vi: "Giảm 30% gói năm cho 100 người đầu", body_vi: "Nâng cấp Pro 1 năm với giá ưu đãi, số suất có hạn.", cta_label_vi: "Xem ưu đãi", cta_route: "/billing", promotion_id: "p1", tiers: ["free", "plus"], starts_at: mockAgo(48), ends_at: mockAgo(-240), status: "published", pinned: true },
          { ...base, id: "n2", kind: "incident", severity: "warning", title_vi: "OCR hoá đơn phản hồi chậm", body_vi: "Chụp hoá đơn có thể chậm vài giây. Chúng tôi đang xử lý.", incident_id: "i1", starts_at: mockAgo(1), status: "published", notify: true },
          { ...base, id: "n3", kind: "maintenance", severity: "critical", title_vi: "Bảo trì hệ thống 02:00 – 03:00", body_vi: "Ứng dụng tạm ngưng trong lúc nâng cấp máy chủ.", channels: ["play", "apk"], starts_at: mockAgo(-72), ends_at: mockAgo(-71), status: "draft", blocking: true, min_version_code: 108 },
          { ...base, id: "n4", kind: "update", title_vi: "Phiên bản 1.0.9 đã sẵn sàng", body_vi: "Túi ngân sách mới, chốt tháng nhanh hơn.", channels: ["play", "apk"], starts_at: mockAgo(200), ends_at: mockAgo(20), status: "archived", max_version_code: 108 },
        ],
        promotions: [{ id: "p1", name: "Gói sáng lập 100 người đầu" }, { id: "p2", name: "Chào tháng mới" }],
        incidents: [{ id: "i1", title: "OCR cloud phản hồi chậm", status: "investigating" }],
      };
    },
    async saveAnnouncement() {return {};},
    async adminReleases() {
      return {
        live: {
          play_internal: { versionName: "1.0.10", versionCode: 110, verifiedAt: mockAgo(2) },
          play_production: { versionName: "1.0.9", versionCode: 109, verifiedAt: mockAgo(3) },
          apkpure: { versionName: "1.0.9", versionCode: 109, verifiedAt: mockAgo(30) },
          landing: { versionName: "1.0.9", versionCode: 109, verifiedAt: mockAgo(5) },
        },
        releases: [
          mockRelease("r1", "play_internal", "1.0.10", 110, "in_review", 0, "play_api", 2), mockRelease("r2", "play_production", "1.0.9", 109, "live", 100, "play_api", 3),
          mockRelease("r3", "landing", "1.0.9", 109, "live", null, "landing_probe", 5), mockRelease("r4", "apkpure", "1.0.9", 109, "live", null, "manual", 30),
          mockRelease("r5", "play_production", "1.0.8", 108, "superseded", 100, "play_api", 300), mockRelease("r6", "apkpure", "1.0.8", 108, "superseded", null, "manual", 320),
        ],
        warnings: [],
      };
    },
    async saveRelease() {return {};},
    async adminPermissions(_t: string, userId?: string) {
      return {
        catalog: MOCK_PERMISSION_CATALOG,
        rules: userId ? [{ permission: "revenue.adjust", allowed: false, revision: 2, expires_at: null }, { permission: "exports.create", allowed: true, revision: 1, expires_at: mockAgo(-240) }] : [],
        groups: [
          { id: "g1", name: "Kế toán", revision: 2, permissions: ["revenue.read", "revenue.adjust", "payments.read", "exports.create"], member: Boolean(userId) },
          { id: "g2", name: "Hỗ trợ khách hàng", revision: 1, permissions: ["users.read", "users.manage", "payments.read"], member: false },
        ],
      };
    },
    async listBills() {
      return { bills: [] };
    },
    async listSubscriptions() {
      return { subscriptions: [] };
    },
    async listKeepsakes() {
      return { keepsakes: [] };
    },
    async accountAccess() {
      return { staff: false, role: "user", mfaVerified: true };
    },
    async listSpendingSplits() {
      return { splits: [] };
    },
    async listTransactionSplitsByIds() {
      return { splits: [] };
    },
  } as unknown as PicketApiClient;
}

/** One session check per request: layouts, pages and components share it via React cache(). */
export const requireApiSession = cache(async function requireApiSession(
  workspace: "user" | "admin" | "either" = "user",
) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_MOCK_AUTH === "1"
  ) {
    return {
      accessToken: "mock-token",
      api: createMockApiClient(),
      claims: { sub: "mock-user-123", email: workspace==='admin' ? "linh.tran@picket.vn" : "son.nguyen@picket.vn" },
      staff: workspace==='admin',
      role: workspace==='admin'?'owner':"user",
      mfaVerified: process.env.DEV_MOCK_MFA !== "0", permissions: workspace==='admin' ? mockAdminPermissions : [],
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const loginPath = workspace === "admin" ? "/login?next=/admin" : "/login";
  if (!claimsData?.claims) redirect(loginPath);

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect(loginPath);

  const api = new PicketApiClient(apiBaseUrl);
  const access = await api.accountAccess(accessToken);
  const staff = access.staff;
  const destination =
    workspace === "either"
      ? null
      : workspaceRedirect(
          staff,
          workspace === "admin" ? "/admin" : "/dashboard",
        );
  if (destination) redirect(destination);

  return {
    accessToken,
    api,
    claims: claimsData.claims,
    staff,
    role: access.role,
    mfaVerified: access.mfaVerified, permissions: access.permissions,
  };
});
