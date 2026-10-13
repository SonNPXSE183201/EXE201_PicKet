import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "@picket/api-client";

import { apiErrorMessage } from "./api-error-message";

test("maps API failures without exposing response details", () => {
  assert.equal(
    apiErrorMessage(new ApiError("secret", 0), "fallback"),
    "Không thể kết nối đến Picket API.",
  );
  assert.equal(
    apiErrorMessage(new ApiError("secret", 401), "fallback"),
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  );
  assert.equal(
    apiErrorMessage(new ApiError("secret", 503), "fallback"),
    "Máy chủ đang gặp sự cố. Vui lòng thử lại.",
  );
  assert.equal(apiErrorMessage(new Error("secret"), "fallback"), "fallback");
});
