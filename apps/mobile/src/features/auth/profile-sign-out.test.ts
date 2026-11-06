import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const profileSource = readFileSync(
  path.resolve(import.meta.dirname, "../../app/profile.tsx"),
  "utf8",
);

test("profile offers a confirmed sign-out action", () => {
  assert.match(profileSource, /const \{ session, localMode, leaveLocalMode, signOut \} = useAuth\(\)/);
  assert.match(profileSource, /<ActionSheet/);
  assert.doesNotMatch(profileSource, /Alert\.alert/);
  assert.match(profileSource, /setSignOutPrompt/);
  assert.match(profileSource, /await signOut\(\)/);
  assert.match(profileSource, /leaveLocalMode\(\)/);
  assert.match(profileSource, /localMode \? t\("Thoát chế độ trên máy"\) : t\("Đăng xuất"\)/);
});
