import assert from "node:assert/strict";
import test from "node:test";

import { keepsakeDeleteMessage } from "./delete-copy";

test("guest deletion explains that the item is removed from this device", () => {
  assert.equal(keepsakeDeleteMessage(true), "Ảnh và thông tin của món đồ sẽ bị xóa khỏi thiết bị này.");
});

test("account deletion explains that the synced item is archived", () => {
  assert.equal(keepsakeDeleteMessage(false), "Món đồ sẽ được lưu trữ và không còn xuất hiện trong bộ sưu tập đã đồng bộ.");
});
