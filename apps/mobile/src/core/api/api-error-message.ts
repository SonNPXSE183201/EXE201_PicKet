import { ApiError } from "@picket/api-client";

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 0) return "Chưa có kết nối. Dữ liệu đã lưu vẫn có thể sử dụng.";
  if (error.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (error.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (error.status >= 500) return "Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.";
  return fallback;
}

export function reportApiError(scope: string, error: unknown) {
  if (!__DEV__) return;
  if (error instanceof ApiError) {
    console.warn(`${scope}: ${error.message} (HTTP ${error.status})`);
    return;
  }
  console.warn(`${scope}: unexpected error`);
}
