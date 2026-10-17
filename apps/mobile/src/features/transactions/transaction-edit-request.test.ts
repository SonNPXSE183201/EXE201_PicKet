import assert from "node:assert/strict";
import test from "node:test";

import { buildTransactionEditRequest } from "./transaction-edit-request";

test("includes the selected category so Review Inbox can resolve uncategorized rows", () => {
  assert.deepEqual(buildTransactionEditRequest({
    title: "Điều chỉnh đối soát",
    amount: "23456",
    note: "kiểm tra",
    categoryId: "category-food",
    expectedVersion: 2,
  }), {
    title: "Điều chỉnh đối soát",
    amount: 23456,
    note: "kiểm tra",
    categoryId: "category-food",
    expectedVersion: 2,
  });
});

test("rejects an invalid amount before issuing a mutation", () => {
  assert.throws(() => buildTransactionEditRequest({
    title: "x",
    amount: "12.5",
    note: "",
    categoryId: null,
    expectedVersion: 1,
  }), /amount/i);
});
