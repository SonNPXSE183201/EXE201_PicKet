/** Strings for the Figma profile hub, kept beside the feature (vi + en). */
const vi = {
  plan: "Gói hiện tại", viewPlans: "Xem các gói", manage: "Quản lý", settings: "Cài đặt", data: "Dữ liệu",
  wallets: "Ví & tài khoản", walletsMeta: "Tiền mặt, ngân hàng, ví điện tử",
  categories: "Danh mục & icon", categoriesMeta: "Nhóm chi tiêu của bạn",
  recurring: "Chi phí định kỳ", recurringMeta: "Netflix, Spotify, phòng tập",
  bills: "Hoá đơn", billsMeta: "Hạn nộp điện, nước, internet",
  keepsakes: "Bộ sưu tập kỷ vật", keepsakesMeta: "Hoá đơn đáng nhớ",
  insights: "Thống kê & phân tích", insightsMeta: "Cơ cấu chi tiêu, xu hướng",
  notifications: "Thông báo & lịch nhắc", notificationsMeta: "Ngân sách và hạn thanh toán",
  appearance: "Giao diện", language: "Ngôn ngữ", hideBalance: "Ẩn số dư", hideBalanceMeta: "Ẩn tổng số dư trên Nhà",
  lock: "Khoá ứng dụng", lockMeta: "Vân tay hoặc mã PIN",
  backup: "Sao lưu & khôi phục", backupMeta: "Bản sao .picket, JSON, CSV",
  sync: "Kiểm tra đồng bộ", syncMeta: "Xem trạng thái xung đột dữ liệu",
  signOut: "Đăng xuất", leaveLocal: "Thoát chế độ trên máy", deleteAccount: "Xoá tài khoản",
  localTitle: "Dữ liệu chỉ lưu trên máy này", localBody: "Đăng nhập để sao lưu và đồng bộ giữa các thiết bị.", localCta: "Đăng nhập để đồng bộ",
  onDevice: "Trên máy", free: "Free", plus: "Plus", pro: "Pro",
  editTitle: "Hồ sơ", avatar: "Ảnh đại diện", displayName: "Tên hiển thị", currency: "Tiền tệ chính",
  persona: "Nhịp sống", goal: "Mục tiêu", save: "Lưu thay đổi", editProfile: "Chỉnh sửa hồ sơ",
  privacy: "Chính sách quyền riêng tư", support: "Hỗ trợ tài khoản", on: "Bật", off: "Tắt", vietnamese: "Tiếng Việt",
};
type Copy = typeof vi;
const en: Copy = {
  plan: "Current plan", viewPlans: "See plans", manage: "Manage", settings: "Settings", data: "Data",
  wallets: "Wallets & accounts", walletsMeta: "Cash, bank, e-wallets",
  categories: "Categories & icons", categoriesMeta: "Your spending groups",
  recurring: "Recurring costs", recurringMeta: "Netflix, Spotify, gym",
  bills: "Bills", billsMeta: "Electricity, water, internet due dates",
  keepsakes: "Keepsake collection", keepsakesMeta: "Memorable receipts",
  insights: "Statistics & analysis", insightsMeta: "Spending mix and trends",
  notifications: "Notifications & reminders", notificationsMeta: "Budget and payment alerts",
  appearance: "Appearance", language: "Language", hideBalance: "Hide balance", hideBalanceMeta: "Hide the total balance on Home",
  lock: "App lock", lockMeta: "Fingerprint or PIN",
  backup: "Backup & restore", backupMeta: ".picket backup, JSON, CSV",
  sync: "Sync check", syncMeta: "See data conflict status",
  signOut: "Sign out", leaveLocal: "Leave on-device mode", deleteAccount: "Delete account",
  localTitle: "Data is stored on this device only", localBody: "Sign in to back up and sync across devices.", localCta: "Sign in to sync",
  onDevice: "On device", free: "Free", plus: "Plus", pro: "Pro",
  editTitle: "Profile", avatar: "Profile photo", displayName: "Display name", currency: "Main currency",
  persona: "Lifestyle", goal: "Goal", save: "Save changes", editProfile: "Edit profile",
  privacy: "Privacy policy", support: "Account support", on: "On", off: "Off", vietnamese: "Vietnamese",
};
export function profileHubCopy(language: string): Copy { return language === "vi" ? vi : en; }
export function profileThemeMeta(language: string, mode: string | undefined): string {
  const vi = language === "vi";
  return `Paper · ${mode === "dark" ? (vi ? "Tối" : "Dark") : mode === "light" ? (vi ? "Sáng" : "Light") : (vi ? "Theo máy" : "System")}`;
}
