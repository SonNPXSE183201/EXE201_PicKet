import assert from "node:assert/strict";
import { test } from "node:test";
import { commonEn, commonVi } from "./common-resources";
import { createAppI18n } from "./instance";
import { ApiError } from "@picket/api-client";
import { apiErrorMessage } from "../api/api-error-message";

test("common locale keys and interpolation variables match", () => {
  assert.deepEqual(Object.keys(commonEn).sort(), Object.keys(commonVi).sort());
  for (const key of Object.keys(commonVi) as (keyof typeof commonVi)[]) {
    assert.equal(commonVi[key], key);
    assert.ok(commonEn[key].trim(), `Missing English translation: ${key}`);
    const placeholders = (text: string) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort();
    assert.deepEqual(placeholders(commonEn[key]), placeholders(commonVi[key]), key);
  }
});

test("API errors use the active language and preserve caller fallbacks", () => {
  for (const language of ["vi", "en"] as const) {
    createAppI18n(language);
    const copy = language === "vi" ? commonVi : commonEn;
    for (const [status, key] of [
      [0, "Chưa có kết nối. Dữ liệu đã lưu vẫn có thể sử dụng."],
      [401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."],
      [403, "Bạn không có quyền thực hiện thao tác này."],
      [503, "Chưa thể hoàn tất lúc này. Vui lòng thử lại sau."],
    ] as const) {
      assert.equal(apiErrorMessage(new ApiError("private detail", status), "fallback"), copy[key]);
    }
    assert.equal(apiErrorMessage(new ApiError("private detail", 422), "fallback"), "fallback");
    assert.equal(apiErrorMessage(new Error("private detail"), "fallback"), "fallback");
  }
});

test("screen labels interpolate user values in both languages", () => {
  const cases = [
    ["Ảnh {{title}}", { title: "Camera" }, "Ảnh Camera", "Photo of Camera"],
    ["Bảo hành đến {{date}}", { date: "2027-01-01" }, "Bảo hành đến 2027-01-01", "Warranty until 2027-01-01"],
    ["Xóa sản phẩm {{index}}", { index: 2 }, "Xóa sản phẩm 2", "Delete item 2"],
    ["Số lượng {{quantity}}", { quantity: 3 }, "Số lượng 3", "Quantity 3"],
    ["Tiến độ thiết lập {{step}} trên 8", { step: 4 }, "Tiến độ thiết lập 4 trên 8", "Setup progress 4 of 8"],
    ["{{name}}, bạn sẽ bắt đầu với ví “{{wallet}}”.", { name: "An", wallet: "Travel" }, "An, bạn sẽ bắt đầu với ví “Travel”.", "An, you'll start with the “Travel” wallet."],
    ["OCR: {{provider}} · Độ tin cậy: {{confidence}}", { provider: "ML Kit", confidence: "90%" }, "OCR: ML Kit · Độ tin cậy: 90%", "OCR: ML Kit · Confidence: 90%"],
  ] as const;
  for (const language of ["vi", "en"] as const) {
    const i18n = createAppI18n(language);
    for (const [key, values, vi, en] of cases) {
      assert.equal(i18n.t(key, { ns: "common", ...values }), language === "vi" ? vi : en);
    }
  }
});
