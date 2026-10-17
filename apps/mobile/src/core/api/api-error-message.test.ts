import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "@picket/api-client";

import { apiErrorMessage } from "./api-error-message";

test("maps API failures without exposing response details", () => {
  assert.equal(
    apiErrorMessage(new ApiError("secret", 0), "fallback"),
    "Chưa có kết nối. Dữ liệu đã lưu vẫn có thể sử dụng.",
  );
  assert.equal(
    apiErrorMessage(new ApiError("secret", 401), "fallback"),
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  );
  assert.equal(
    apiErrorMessage(new ApiError("secret", 503), "fallback"),
    "Chưa thể hoàn tất lúc này. Vui lòng thử lại sau.",
  );
  assert.equal(apiErrorMessage(new Error("secret"), "fallback"), "fallback");
});
