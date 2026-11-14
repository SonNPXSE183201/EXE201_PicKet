import { ApiError } from "@picket/api-client";
import { requireApiSession } from "@/core/auth/require-api-session";
import { adminSections, canViewAdminSection, type AdminSection } from "../admin-permissions";
import { MfaPanel } from "./mfa-panel";
import { PaymentAdmin } from "./payment-admin";
import { FinanceAdmin } from "./finance-admin";
import { RevenueAdmin } from "./revenue-admin";
import { PromotionAdmin } from "./promotion-admin";
import { AnnouncementAdmin } from "./announcement-admin";
import { ReleaseAdmin } from "./release-admin";
import { Banner, Button, EmptyState } from "../ui/paper";
import { billingWindow, firstName, type Document, type Query, type ViewProps } from "../views/shared";
import { renderSection } from "../views";

/* Loads one admin section and renders it in the Paper design (Figma › Admin Web).
   Data access, permissions and server actions are unchanged; only presentation moved
   into features/admin/views. */
export async function AdminModule({ section, searchParams }: { section: AdminSection; searchParams?: Promise<Query> }) {
  const query = (await searchParams) ?? {};
  const { api, accessToken, role, mfaVerified, permissions, claims } = await requireApiSession("admin");

  if (!canViewAdminSection(role, section, permissions)) return <ForbiddenState title={adminSections[section].title} />;

  const notices = <Notices query={query} mfaVerified={mfaVerified} />;
  if (section === "security") return <>{notices}<MfaPanel /></>;
  if (section === "finance") return <>{notices}<FinanceAdmin query={query} /></>;
  if (section === "revenue") return <>{notices}<RevenueAdmin query={query} /></>;
  if (section === "promotions") return <>{notices}<PromotionAdmin query={query} /></>;
  if (section === "announcements") return <>{notices}<AnnouncementAdmin query={query} /></>;
  if (section === "releases") return <>{notices}<ReleaseAdmin query={query} /></>;
  if (section === "payments" || section === "permissions") return <>{notices}<PaymentAdmin section={section} query={query} /></>;

  const days = ["7", "30", "90"].includes(query.days ?? "") ? Number(query.days) : 30;
  const page = /^\d{1,5}$/.test(query.page ?? "") ? Math.min(Number(query.page), 10000) : 0;
  let data: Document;
  try {
    data = await api.adminPortal(accessToken, section, {
      days,
      page,
      ...(query.search ? { search: query.search.slice(0, 160) } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...Object.fromEntries(["tier", "version", "createdFrom", "createdTo", "sort"].filter((key) => query[key]).map((key) => [key, query[key]])),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return <ForbiddenState title={adminSections[section].title} />;
    return <LoadErrorState href={adminSections[section].href} canSeeIncidents={canViewAdminSection(role, "incidents", permissions)} />;
  }

  let billingFinance: ViewProps["billingFinance"];
  if (section === "billing" && (permissions?.includes("revenue.read") ?? role === "owner")) {
    const { from, to, today } = billingWindow(days);
    const [revenue, plans] = await Promise.allSettled([
      api.adminRevenue<NonNullable<ViewProps["billingFinance"]>["revenue"]>(accessToken, { from, to, bucket: "day" }),
      api.adminRevenue<NonNullable<ViewProps["billingFinance"]>["plans"]>(accessToken, { view: "plans" }),
    ]);
    billingFinance = {
      today,
      revenue: revenue.status === "fulfilled" ? revenue.value : undefined,
      plans: plans.status === "fulfilled" && typeof plans.value?.plus === "number" ? plans.value : undefined,
    };
  }
  let planLimits: ViewProps["planLimits"];
  if (section === "billing") {
    const canManage = permissions?.includes("plans.manage") ?? role === "owner";
    try {
      const limits = await api.adminPlanLimits<{ limits: NonNullable<ViewProps["planLimits"]>["limits"]; history: NonNullable<ViewProps["planLimits"]>["history"] }>(accessToken);
      if (Array.isArray(limits?.limits)) planLimits = { limits: limits.limits, history: limits.history ?? [], canManage };
    } catch {
      planLimits = undefined; // Older API/database: the card is simply not shown.
    }
  }
  const props: ViewProps = { section, data, query, billingFinance, planLimits, role, permissions, mfaVerified, days, page, greetingName: firstName(claims.email) };
  return <>{notices}{renderSection(props)}</>;
}

function Notices({ query, mfaVerified }: { query: Query; mfaVerified: boolean }) {
  return (
    <>
      {!mfaVerified && (
        <Banner icon="list" title="Bạn đang ở chế độ đọc" text="Xác minh MFA để thay đổi dữ liệu hoặc xuất báo cáo. Các nút thao tác tạm bị khoá."
          action={<Button href="/admin/security" variant="ghost">Xác minh MFA</Button>} />
      )}
      {query.done && <Banner tone="success" icon="check" title="Đã lưu thay đổi" text="Thao tác đã được ghi vào nhật ký quản trị." />}
      {query.error && <Banner tone="danger" icon="alert" title="Chưa lưu được" text="Kiểm tra quyền/MFA, thông tin nhập và lý do. Nếu bản ghi đã thay đổi, tải lại trước khi lưu." />}
    </>
  );
}

export function ForbiddenState({ title }: { title: string }) {
  return (
    <EmptyState art="/admin-paper/month-close-scene-v1.webp" code="Mã lỗi 403" title="Không đủ quyền truy cập"
      text={`Vai trò hiện tại không xem được mục ${title}. Nhờ chủ sở hữu cấp quyền nếu bạn cần.`}
      actions={<><Button href="/admin">Về Tổng quan</Button><Button href="/admin/staff" variant="secondary">Yêu cầu quyền</Button></>} />
  );
}

export function LoadErrorState({ href, canSeeIncidents = true }: { href: string; canSeeIncidents?: boolean }) {
  return (
    <EmptyState art="/admin-paper/receipt-scene-v2.webp" code="Không kết nối được API" title="Chưa tải được dữ liệu"
      text="Hãy kiểm tra kết nối API và migration, rồi thử lại. Dữ liệu của người dùng không bị ảnh hưởng."
      actions={<><Button href={href}>Thử lại</Button>{canSeeIncidents && <Button href="/admin/incidents" variant="secondary">Xem Sự cố</Button>}</>} />
  );
}
