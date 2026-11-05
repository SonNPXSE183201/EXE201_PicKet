export const adminSections = {
  revenue: { title: 'Doanh thu', href: '/admin/revenue', icon: 'chart' },
  payments: { title: 'Giao dịch thanh toán', href: '/admin/payments', icon: 'wallet' },
  permissions: { title: 'Phân quyền', href: '/admin/permissions', icon: 'shield' },
  promotions: { title: 'Ưu đãi', href: '/admin/promotions', icon: 'wallet' },
  overview: { title: "Tổng quan", href: "/admin", icon: "chart" },
  users: { title: "Người dùng", href: "/admin/users", icon: "person" },
  acquisition: {
    title: "Truy cập & lượt tải",
    href: "/admin/acquisition",
    icon: "chart",
  },
  engagement: {
    title: "Hoạt động ứng dụng",
    href: "/admin/engagement",
    icon: "calendar",
  },
  billing: {
    title: "Gói & thanh toán",
    href: "/admin/billing",
    icon: "wallet",
  },
  ocr: { title: "Nhận diện hóa đơn", href: "/admin/ocr", icon: "receipt" },
  health: { title: "Sức khỏe hệ thống", href: "/admin/health", icon: "shield" },
  incidents: { title: "Sự cố", href: "/admin/incidents", icon: "bell" },
  releases: { title: "Phiên bản", href: "/admin/releases", icon: "grid" },
  content: { title: "Nội dung", href: "/admin/content", icon: "receipt" },
  tickets: { title: "Hỗ trợ", href: "/admin/tickets", icon: "person" },
  partners: { title: "Đối tác", href: "/admin/partners", icon: "grid" },
  integrations: {
    title: "Nguồn dữ liệu",
    href: "/admin/integrations",
    icon: "grid",
  },
  audit: { title: "Nhật ký hoạt động", href: "/admin/audit", icon: "calendar" },
  staff: { title: "Nhân sự & quyền", href: "/admin/staff", icon: "shield" },
  settings: {
    title: "Cấu hình ứng dụng",
    href: "/admin/settings",
    icon: "shield",
  },
  security: { title: "Bảo mật & MFA", href: "/admin/security", icon: "shield" },
  exports: { title: "Xuất báo cáo", href: "/admin/exports", icon: "receipt" },
} as const;
export type AdminSection = keyof typeof adminSections;
export function canViewAdminSection(
  role: string | null,
  section: AdminSection,
  permissions?: readonly string[],
) {
  // This page manages only the signed-in user's MFA, not security admin data.
  if (permissions && section === 'security') return permissions.length > 0;
  const managed: Partial<Record<AdminSection, string>> = { permissions: 'permissions.manage', promotions: 'promotions.manage' };
  if (permissions) return permissions.includes(managed[section] ?? `${section}.read`);
  return role === 'owner'; // Bootstrap compatibility only; normal calls pass database permissions.
}
