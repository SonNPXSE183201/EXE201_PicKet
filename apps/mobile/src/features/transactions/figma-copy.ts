import { useAppTheme } from "@/features/settings/appearance-provider";

const vi = {
  monthTitle: "Tháng {{month}}, {{year}}", allTime: "Tất cả thời gian", prevMonth: "Tháng trước", nextMonth: "Tháng sau",
  search: "Tìm giao dịch", closeSearch: "Đóng tìm kiếm", tools: "Công cụ giao dịch", listView: "Xem danh sách", calendarView: "Xem lịch tháng",
  monthSpent: "Tháng này đã chi", income: "Thu", all: "Tất cả", expense: "Chi tiêu", incomeKind: "Thu nhập", transfer: "Chuyển ví", refund: "Hoàn tiền",
  emptyMonthTitle: "Tháng {{month}} còn trống", emptyMonthBody: "Bấm Chụp để quét hoá đơn, hoặc nút + để ghi tay.\nMọi khoản trong tháng sẽ hiện ở đây theo ngày.",
  emptyExpense: "Chưa có khoản chi nào", emptyIncome: "Chưa có khoản thu nào", emptyTransfer: "Chưa có khoản chuyển ví nào", emptyRefund: "Chưa có khoản hoàn tiền nào", emptyFiltered: "Chưa có giao dịch phù hợp",
  emptyFilteredBody: "Thử bộ lọc khác, hoặc xem tất cả giao dịch tháng này.", clearFilters: "Xoá bộ lọc", loadingTransactions: "Đang tải giao dịch",
  legendExpense: "Có chi", legendIncome: "Có thu", legendReceipt: "Có ảnh hoá đơn", viewing: "Đang xem",
  weekdayShort: "T2,T3,T4,T5,T6,T7,CN", weekdayLong: "Chủ Nhật,Thứ Hai,Thứ Ba,Thứ Tư,Thứ Năm,Thứ Sáu,Thứ Bảy", today: "Hôm nay", uncategorized: "Chưa phân loại", account: "Tài khoản",
  // C3
  addTitle: "Thêm giao dịch", save: "Lưu giao dịch", amountOverline: "Số tiền", categoryOverline: "Danh mục", categoryTitle: "Khoản này cho việc gì?",
  stubToday: "Hôm nay · {{date}}", rowWallet: "Ví", rowDate: "Ngày", rowNote: "Ghi chú", noWallet: "Chưa có ví", createWalletFirst: "Tạo ví trước",
  dupTitle: "Có thể bạn đã ghi khoản này", dupView: "Xem", more: "Tất cả", notePlaceholder: "Thêm ghi chú",
  // C4
  detailTitle: "Chi tiết giao dịch", matchedReceipt: "Đã khớp hoá đơn", rowCategory: "Danh mục", rowPocket: "Túi", pocketLeft: "{{name}} · còn {{amount}}", seeMore: "Xem",
  edit: "Sửa", archiveTx: "Lưu trữ giao dịch", archiveTitle: "Lưu trữ khoản này?", archiveBody: "Khoản {{amount}} sẽ không tính vào chi tiêu{{pocket}}. Bạn có thể khôi phục trong 30 ngày.",
  archivePocket: " và túi {{name}} nữa", later: "Để sau", archiveConfirm: "Lưu trữ", editTitle: "Sửa giao dịch", saveChanges: "Lưu thay đổi", cancel: "Hủy", splitByCategory: "Chia theo danh mục", viewReceipt: "Xem hoá đơn đính kèm",
  // C5
  walletCash: "Tiền mặt", walletBank: "Ngân hàng", transferTitle: "Chuyển giữa ví", from: "Từ", to: "Sang", transferAmount: "Số tiền chuyển", transferNote: "Ghi chú chuyển tiền", transferHint: "Chuyển tiền không làm thay đổi tổng thu chi của bạn.", transferDo: "Chuyển tiền",
  overTitle: "Vượt số dư ví nguồn", overBody: "{{name}} chỉ còn {{amount}}. Giảm số tiền hoặc chọn ví khác.", transferAll: "Chuyển hết", swap: "Đổi chiều chuyển", pickWallet: "Chọn ví",
  // C6
  selectedN: "Đã chọn {{count}}", selectAll: "Chọn tất cả", clearSelect: "Bỏ chọn", changeCategory: "Đổi danh mục", changeWallet: "Đổi ví", archiveShort: "Lưu trữ", closeBulk: "Thoát chọn nhiều",
  // C7
  reviewTitle: "Cần kiểm tra", reviewHeadline: "{{count}} khoản cần bạn xem lại", reviewBody: "Chạm một danh mục gợi ý để xếp nhanh.", dupWith: "Có thể trùng với khoản lúc {{time}}", keepBoth: "Giữ cả hai", mergeOne: "Gộp làm một",
  reviewEmptyTitle: "Mọi thứ đã gọn gàng", reviewEmptyBody: "Không còn khoản nào cần phân loại hay nghi trùng.", backToSpending: "Về Chi tiêu", receiptsToCheck: "Hóa đơn cần kiểm tra",
  // C8
  refundTitle: "Tạo khoản hoàn", originalOverline: "Khoản gốc", maxRefund: "Có thể hoàn tối đa", refundAmount: "Số tiền được hoàn", refundNotePh: "Lý do hoặc ghi chú", toWallet: "Về ví", refundCreate: "Tạo khoản hoàn",
  refundHint: "Khoản hoàn sẽ trừ vào chi tiêu {{category}} tháng này, túi {{category}} được cộng lại {{amount}}.", refundHintShort: "Khoản hoàn sẽ trừ vào chi tiêu tháng này.",
  // C9
  splitTitle: "Chia theo danh mục", billTotal: "Tổng hoá đơn", splitDone: "Đã chia {{amount}}", splitLeft: "còn {{amount}}", splitOver: "vượt {{amount}}", partsOverline: "Các phần",
  addPart: "Thêm phần", addPartLeft: "Thêm phần · {{amount}} còn lại", splitOverTitle: "Tổng các phần lớn hơn hoá đơn", splitOverBody: "Bớt {{amount}} ở một phần để khớp {{total}}.", splitSave: "Lưu phân bổ", removePart: "Xoá phần",
  categoryPickTitle: "Chọn danh mục", categorySearch: "Tìm danh mục", close: "Đóng", walletPickTitle: "Chọn ví",
  clearAll: "Bỏ toàn bộ phân bổ", pickCategory: "Chọn danh mục cho phần mới", categoryLabel: "Danh mục",
};
type Key = keyof typeof vi;
const en: Record<Key, string> = {
  monthTitle: "{{month}}/{{year}}", allTime: "All time", prevMonth: "Previous month", nextMonth: "Next month",
  search: "Search transactions", closeSearch: "Close search", tools: "Transaction tools", listView: "List view", calendarView: "Month calendar",
  monthSpent: "Spent this month", income: "Income", all: "All", expense: "Spending", incomeKind: "Income", transfer: "Transfers", refund: "Refunds",
  emptyMonthTitle: "Month {{month}} is empty", emptyMonthBody: "Tap Capture to scan a receipt, or + to add by hand.\nEvery entry this month shows up here by day.",
  emptyExpense: "No spending yet", emptyIncome: "No income yet", emptyTransfer: "No transfers yet", emptyRefund: "No refunds yet", emptyFiltered: "No matching transactions",
  emptyFilteredBody: "Try another filter, or view all transactions this month.", clearFilters: "Clear filters", loadingTransactions: "Loading transactions",
  legendExpense: "Spending", legendIncome: "Income", legendReceipt: "Has receipt photo", viewing: "Viewing",
  weekdayShort: "Mo,Tu,We,Th,Fr,Sa,Su", weekdayLong: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday", today: "Today", uncategorized: "Uncategorized", account: "Account",
  addTitle: "Add transaction", save: "Save transaction", amountOverline: "Amount", categoryOverline: "Category", categoryTitle: "What is this for?",
  stubToday: "Today · {{date}}", rowWallet: "Wallet", rowDate: "Date", rowNote: "Note", noWallet: "No wallet yet", createWalletFirst: "Create a wallet first",
  dupTitle: "You may have logged this already", dupView: "View", more: "All", notePlaceholder: "Add a note",
  detailTitle: "Transaction details", matchedReceipt: "Matched to receipt", rowCategory: "Category", rowPocket: "Pocket", pocketLeft: "{{name}} · {{amount}} left", seeMore: "View",
  edit: "Edit", archiveTx: "Archive transaction", archiveTitle: "Archive this entry?", archiveBody: "The {{amount}} entry will no longer count toward spending{{pocket}}. You can restore it within 30 days.",
  archivePocket: " or the {{name}} pocket", later: "Not now", archiveConfirm: "Archive", editTitle: "Edit transaction", saveChanges: "Save changes", cancel: "Cancel", splitByCategory: "Split by category", viewReceipt: "View attached receipt",
  walletCash: "Cash", walletBank: "Bank", transferTitle: "Transfer between wallets", from: "From", to: "To", transferAmount: "Transfer amount", transferNote: "Transfer note", transferHint: "Transfers do not change your total income and spending.", transferDo: "Transfer",
  overTitle: "Exceeds source balance", overBody: "{{name}} only has {{amount}} left. Lower the amount or pick another wallet.", transferAll: "Transfer all", swap: "Swap direction", pickWallet: "Choose wallet",
  selectedN: "{{count}} selected", selectAll: "Select all", clearSelect: "Clear", changeCategory: "Change category", changeWallet: "Change wallet", archiveShort: "Archive", closeBulk: "Exit selection",
  reviewTitle: "Needs review", reviewHeadline: "{{count}} entries need a look", reviewBody: "Tap a suggested category to sort quickly.", dupWith: "May duplicate the entry at {{time}}", keepBoth: "Keep both", mergeOne: "Merge into one",
  reviewEmptyTitle: "All tidy", reviewEmptyBody: "Nothing left to categorize or de-duplicate.", backToSpending: "Back to Spending", receiptsToCheck: "Receipts to check",
  refundTitle: "Create refund", originalOverline: "Original entry", maxRefund: "Max refundable", refundAmount: "Refund amount", refundNotePh: "Reason or note", toWallet: "To wallet", refundCreate: "Create refund",
  refundHint: "The refund lowers this month's {{category}} spending and adds {{amount}} back to the pocket.", refundHintShort: "The refund lowers this month's spending.",
  splitTitle: "Split by category", billTotal: "Bill total", splitDone: "Split {{amount}}", splitLeft: "{{amount}} left", splitOver: "over by {{amount}}", partsOverline: "Parts",
  addPart: "Add part", addPartLeft: "Add part · {{amount}} left", splitOverTitle: "Parts exceed the bill", splitOverBody: "Remove {{amount}} from one part to match {{total}}.", splitSave: "Save split", removePart: "Remove part",
  categoryPickTitle: "Choose category", categorySearch: "Search categories", close: "Close", walletPickTitle: "Choose wallet",
  clearAll: "Clear whole split", pickCategory: "Choose a category for the new part", categoryLabel: "Category",
};
export type FigmaCopyKey = Key;
export function figmaCopy(language: string, key: Key, values: Record<string, string | number> = {}) {
  const text = (language === "en" ? en : vi)[key];
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ""));
}
/** Feature-owned strings for the Figma spending screens (shared i18n resources stay untouched). */
export function useFigmaCopy() {
  const { language } = useAppTheme();
  return (key: Key, values?: Record<string, string | number>) => figmaCopy(language, key, values);
}
