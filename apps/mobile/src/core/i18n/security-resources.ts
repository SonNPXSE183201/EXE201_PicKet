export const securityVi = {
  unlock:"Mở khóa PicKet",description:"Xác thực để xem dữ liệu tài chính.",cancel:"Hủy",locked:"PicKet đã khóa",lockedBody:"Xác thực trên thiết bị để xem thông tin tài chính của bạn.",
  lockReadError:"Không đọc được cài đặt khóa. Hãy xác thực để tiếp tục.",authFailed:"Chưa xác thực được. Kiểm tra khóa thiết bị và thử lại.",authUnavailable:"Không mở được trình xác thực trên thiết bị này.",authenticating:"Đang xác thực…",
};
export const securityEn:Record<keyof typeof securityVi,string> = {
  unlock:"Unlock PicKet",description:"Authenticate to view financial data.",cancel:"Cancel",locked:"PicKet is locked",lockedBody:"Authenticate on this device to view your financial information.",
  lockReadError:"Lock settings could not be read. Authenticate to continue.",authFailed:"Authentication was not completed. Check your device lock and try again.",authUnavailable:"Could not open authentication on this device.",authenticating:"Authenticating…",
};
