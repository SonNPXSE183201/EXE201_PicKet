import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { categoryArt } from "../theme/category-art";

test("categoryArt maps typical transaction categories to valid 3D PaperArt asset ids", () => {
  assert.equal(categoryArt(null, "Ăn uống & Cà phê"), "food");
  assert.equal(categoryArt(null, "Highlands Coffee"), "cafe");
  assert.equal(categoryArt(null, "Đi lại & Xăng xe"), "transport");
  assert.equal(categoryArt(null, "GrabBike Nguyễn Huệ"), "transport");
  assert.equal(categoryArt(null, "Khám bệnh & Thuốc men"), "health");
  assert.equal(categoryArt(null, "Quà tặng sinh nhật"), "gift");
  assert.equal(categoryArt(null, "Tiền thuê nhà"), "home");
  assert.equal(categoryArt(null, "Xem phim CGV"), "leisure");
  assert.equal(categoryArt(null, "Lương tháng 10"), "salary");
  assert.equal(categoryArt(null, "GEARVN Gaming"), "leisure");
  assert.equal(categoryArt(null, "Shopee Mua sắm"), "shopping");
});

test("HomeScreen renders PaperArt in recent transactions list", () => {
  const homeSource = readFileSync(new URL("../../app/index.tsx", import.meta.url), "utf8");
  assert.match(homeSource, /categoryArt/);
  assert.match(homeSource, /<PaperArt id=\{artId\}/);
});

test("TransactionsScreen renders PaperArt in transaction rows", () => {
  const txSource = readFileSync(new URL("../../app/transactions/index.tsx", import.meta.url), "utf8");
  assert.match(txSource, /categoryArt/);
  assert.match(txSource, /<PaperArt id=\{artId\}/);
});

test("NavigationShell has canonical destination label Picket", () => {
  const navSource = readFileSync(new URL("./navigation-shell.tsx", import.meta.url), "utf8");
  assert.match(navSource, /path: "\/profile", label: "Picket"/);
});
