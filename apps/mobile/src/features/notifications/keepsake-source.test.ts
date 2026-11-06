import assert from "node:assert/strict";
import test from "node:test";

import { loadReminderKeepsakes } from "./keepsake-source";

test("signed-in reminders load the merged cloud collection", async () => {
  const calls: string[] = [];
  const result = await loadReminderKeepsakes({
    localMode: false,
    token: "token",
    userId: "user-1",
    loadLocal: async () => { calls.push("local"); return ["local"] as never[]; },
    loadCloud: async () => { calls.push("cloud"); return ["cloud"] as never[]; },
  });

  assert.deepEqual(calls, ["cloud"]);
  assert.deepEqual(result, ["cloud"]);
});

test("guest reminders only load the device collection", async () => {
  const calls: string[] = [];
  const result = await loadReminderKeepsakes({
    localMode: true,
    token: null,
    userId: "guest",
    loadLocal: async () => { calls.push("local"); return ["local"] as never[]; },
    loadCloud: async () => { calls.push("cloud"); return ["cloud"] as never[]; },
  });

  assert.deepEqual(calls, ["local"]);
  assert.deepEqual(result, ["local"]);
});
