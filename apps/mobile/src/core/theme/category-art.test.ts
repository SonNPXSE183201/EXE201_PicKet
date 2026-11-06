import assert from "node:assert/strict";
import test from "node:test";
import { categoryArt } from "./category-art";

test("category illustrations preserve Vietnamese labels and support existing icon names", () => {
  for (const [icon, name, expected] of [
    ["bus", "Đi làm", "transport"],
    [null, "Ăn uống", "food"],
    [null, "Sức khỏe", "health"],
    ["gift", "Sinh nhật", "gift"],
    ["wallet", "Lương", "salary"],
    [null, "Thưởng", "bonus"],
    [null, "Đầu tư", "investment"],
    [null, "Danh mục riêng", "shopping"],
  ] as const) {
    assert.equal(categoryArt(icon, name), expected);
  }
});
