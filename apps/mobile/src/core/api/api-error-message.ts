import { ApiError } from "@picket/api-client";
import { getI18n } from "react-i18next";

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const t = getI18n()?.getFixedT(null, "common") ?? ((key: string) => key);
  if (error.status === 0) return t("Chưa có kết nối. Dữ liệu đã lưu vẫn có thể sử dụng.");
  if (error.status === 401) {
    return t("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  if (error.status === 403) return t("Bạn không có quyền thực hiện thao tác này.");
  if (error.status >= 500) return t("Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.");
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
