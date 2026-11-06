export const vi = {
  title: "Giao diện và ngôn ngữ", preview: "Xem trước", theme: "Giao diện", language: "Ngôn ngữ",
  system: "Theo thiết bị", light: "Sáng", dark: "Tối", vi: "Tiếng Việt", en: "English",
  balance: "Tổng số dư", income: "Khoản thu", expense: "Khoản chi", save: "Lưu", back: "Quay lại",
  saving: "Đang lưu…", saved: "Đã lưu trên thiết bị", failed: "Chưa lưu được. Hãy thử lại.",
  loading: "Đang mở cài đặt…", loadError: "Không đọc được cài đặt đã lưu. Dữ liệu chưa bị thay đổi.", retry: "Thử lại",
  exampleName: "Ví minh họa", disabled: "Chưa khả dụng", exampleError: "Số tiền chưa hợp lệ", exampleSuccess: "Đã lưu giao dịch",
  items_one: "{{count}} giao dịch", items_other: "{{count}} giao dịch", greeting: "Xin chào, {{name}}",
  sectionLabel: "Tùy chọn {{section}}", amount: "Số tiền", date: "Ngày", caption: "Các số tiền và ví trên màn hình này là dữ liệu minh họa.",
} as const;
export const en: Record<keyof typeof vi, string> = {
  title: "Appearance and language", preview: "Preview", theme: "Appearance", language: "Language",
  system: "Follow device", light: "Light", dark: "Dark", vi: "Tiếng Việt", en: "English",
  balance: "Total balance", income: "Income", expense: "Expense", save: "Save", back: "Back",
  saving: "Saving…", saved: "Saved on this device", failed: "Could not save. Please try again.",
  loading: "Loading settings…", loadError: "Saved settings could not be read. Your data has not been changed.", retry: "Retry",
  exampleName: "Example wallet", disabled: "Unavailable", exampleError: "Invalid amount", exampleSuccess: "Transaction saved",
  items_one: "{{count}} transaction", items_other: "{{count}} transactions", greeting: "Hello, {{name}}",
  sectionLabel: "{{section}} options", amount: "Amount", date: "Date", caption: "The balances and wallet on this screen are examples.",
};
export const resources = { vi: { translation: vi }, en: { translation: en } };
