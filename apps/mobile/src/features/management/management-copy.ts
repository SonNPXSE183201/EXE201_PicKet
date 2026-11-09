import { useAppTheme } from "@/features/settings/appearance-provider";

/** Copy introduced by the Figma "Quản lý" redesign. Lives with the feature (not in shared i18n resources). */
const vi = {
  walletNew: "Thêm ví", walletType: "Loại ví", walletName: "Tên ví", createWallet: "Tạo ví",
  currentBalance: "số dư hiện tại", txCount: "giao dịch", transfer: "Chuyển tiền", reconcile: "Đối soát", editWallet: "Sửa ví", close: "Đóng",
  categories: "Danh mục", expense: "Chi tiêu", income: "Thu nhập", popular: "Dùng nhiều", other: "Khác", items: "khoản", item: "khoản", mine: "Danh mục của bạn", defaultCat: "Danh mục mặc định",
  billsTitle: "Hoá đơn", addBill: "Thêm hóa đơn", remaining: (month: number) => `Còn phải trả tháng ${month}`, paid: "Đã trả", upcoming: "Sắp đến hạn", paidSection: "Đã thanh toán",
  due: (date: string, days: number) => `Hạn ${date} · còn ${days} ngày`, late: (date: string) => `Quá hạn ${date}`, billHint: "Chạm để xem và ghi khi trả", paidOn: (date: string) => `Trả ngày ${date}`,
  subsTitle: "Chi phí định kỳ", addSub: "Thêm thuê bao", perMonth: "Mỗi tháng", perYear: (n: string) => `≈ ${n} triệu/năm`, running: "Đang chạy", paused: "Tạm dừng", pausedShort: "Tạm dừng",
  everyMonth: (day: number) => `Ngày ${day} hằng tháng`, stoppedSince: (date: string) => `Dừng từ ${date}`, nextUp: (title: string, date: string) => `Khoản tiếp theo: ${title}, ngày ${date}. Picket tự ghi khi tới ngày.`,
};

const en: typeof vi = {
  walletNew: "Add wallet", walletType: "Wallet type", walletName: "Wallet name", createWallet: "Create wallet",
  currentBalance: "current balance", txCount: "transactions", transfer: "Transfer", reconcile: "Reconcile", editWallet: "Edit wallet", close: "Close",
  categories: "Categories", expense: "Expenses", income: "Income", popular: "Most used", other: "Other", items: "items", item: "item", mine: "Your category", defaultCat: "Default category",
  billsTitle: "Bills", addBill: "Add bill", remaining: (month: number) => `Left to pay in month ${month}`, paid: "Paid", upcoming: "Due soon", paidSection: "Paid",
  due: (date: string, days: number) => `Due ${date} · ${days} days left`, late: (date: string) => `Overdue since ${date}`, billHint: "Tap to open and record when paid", paidOn: (date: string) => `Paid on ${date}`,
  subsTitle: "Recurring costs", addSub: "Add subscription", perMonth: "Per month", perYear: (n: string) => `≈ ${n}M/year`, running: "Active", paused: "Paused", pausedShort: "Paused",
  everyMonth: (day: number) => `Day ${day} every month`, stoppedSince: (date: string) => `Paused since ${date}`, nextUp: (title: string, date: string) => `Next: ${title} on ${date}. Picket logs it automatically.`,
};

export function managementCopy(language: string) { return language === "en" ? en : vi; }
export function useMgmtCopy() { return managementCopy(useAppTheme().language); }
