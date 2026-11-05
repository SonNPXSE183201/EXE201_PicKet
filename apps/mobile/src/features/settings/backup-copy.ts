/** Strings for the Figma backup & restore screen (vi + en), beside the feature. */
const vi = {
  title: "Sao lưu & khôi phục",
  synced: "Đã đồng bộ lên cloud", syncedMeta: "Tự động đồng bộ khi có mạng", localState: "Dữ liệu lưu trên máy này", localStateMeta: "Tạo bản sao để không mất dữ liệu",
  createLabel: "Tạo bản sao trên máy",
  wallets: "Ví", entries: "Giao dịch", photos: "Ảnh", pockets: "Túi",
  encryptedNote: "File .picket được mã hoá bằng mật khẩu bạn đặt. Picket không giữ mật khẩu này.",
  create: "Tạo bản sao .picket", creating: "Đang tạo bản sao…",
  exportJson: "Xuất dữ liệu JSON", exportCsv: "Xuất giao dịch CSV",
  restoreLabel: "Khôi phục", pickFile: "Chọn tệp sao lưu", pickMeta: "Tệp .picket hoặc JSON", open: "Mở",
  filePassword: "Mật khẩu file", restoreNote: "Khôi phục sẽ thay dữ liệu hiện tại. Bạn cần gõ RESTORE để xác nhận.",
  sheetTitle: "Tạo bản sao .picket", sheetWarning: "File chứa toàn bộ thu chi của bạn. Đặt mật khẩu để không ai khác mở được.",
  password: "Mật khẩu file", confirmPassword: "Nhập lại", show: "Hiện mật khẩu", hide: "Ẩn mật khẩu",
  forgetNote: "Quên mật khẩu này thì không khôi phục được file.", minNote: "Ít nhất 12 ký tự, hai lần nhập phải khớp.", save: "Lưu an toàn",
  madeFile: "Đã tạo file. Hãy chọn nơi lưu an toàn.", madeLocal: "Đã tạo bản sao trên máy. Hãy lưu file và mật khẩu ở nơi an toàn.",
  failed: "Không tạo được bản sao.",
};
type Copy = typeof vi;
const en: Copy = {
  title: "Backup & restore",
  synced: "Synced to cloud", syncedMeta: "Syncs automatically when online", localState: "Data is stored on this device", localStateMeta: "Create a backup so you never lose it",
  createLabel: "Create backup on device",
  wallets: "Accounts", entries: "Transactions", photos: "Photos", pockets: "Pockets",
  encryptedNote: "The .picket file is encrypted with a password you set. Picket does not keep this password.",
  create: "Create .picket backup", creating: "Creating backup…",
  exportJson: "Export JSON data", exportCsv: "Export transactions CSV",
  restoreLabel: "Restore", pickFile: "Choose a backup file", pickMeta: ".picket or JSON file", open: "Open",
  filePassword: "File password", restoreNote: "Restoring replaces your current data. You must type RESTORE to confirm.",
  sheetTitle: "Create .picket backup", sheetWarning: "The file contains all your finances. Set a password so nobody else can open it.",
  password: "File password", confirmPassword: "Repeat password", show: "Show password", hide: "Hide password",
  forgetNote: "If you forget this password the file cannot be restored.", minNote: "At least 12 characters, both entries must match.", save: "Save securely",
  madeFile: "File created. Choose a safe place to keep it.", madeLocal: "Device backup created. Keep the file and password somewhere safe.",
  failed: "Could not create the backup.",
};
export function backupCopy(language: string): Copy { return language === "vi" ? vi : en; }
