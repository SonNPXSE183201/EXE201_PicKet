import assert from "node:assert/strict";
import test from "node:test";
import { fetchReleasePolicy, parseReleasePolicy } from "./release-policy";

const reply = (body: unknown, status = 200) => (async () => ({ ok: status < 400, text: async () => JSON.stringify(body) })) as unknown as typeof fetch;

test("parses a strict policy", () => {
  assert.deepEqual(parseReleasePolicy({ channel: "play", latestVersionCode: 35, minSupportedVersionCode: null }, "play"), { channel: "play", latestVersionCode: 35, minSupportedVersionCode: null });
  assert.equal(parseReleasePolicy({ latestVersionCode: "35", minSupportedVersionCode: null }, "apk"), null);
  assert.equal(parseReleasePolicy({ latestVersionCode: 0, minSupportedVersionCode: null }, "apk"), null);
  assert.equal(parseReleasePolicy({ channel: "apk", latestVersionCode: 3, minSupportedVersionCode: 1 }, "play"), null);
  assert.equal(parseReleasePolicy([], "apk"), null);
  assert.equal(parseReleasePolicy(null, "apk"), null);
});
test("fetch builds the query and returns null on any failure", async () => {
  let seen = "";
  const spy = (async (url: string) => { seen = url; return { ok: true, text: async () => JSON.stringify({ latestVersionCode: 40, minSupportedVersionCode: 34 }) }; }) as unknown as typeof fetch;
  const policy = await fetchReleasePolicy("https://api.example.com/", "play", 34, spy);
  assert.equal(seen, "https://api.example.com/v1/releases/policy?channel=play&versionCode=34");
  assert.equal(policy?.minSupportedVersionCode, 34);
  assert.equal(await fetchReleasePolicy("https://x", "apk", 1, reply({}, 500)), null);
  assert.equal(await fetchReleasePolicy("https://x", "apk", 1, (async () => { throw new Error("offline"); }) as unknown as typeof fetch), null);
  assert.equal(await fetchReleasePolicy("https://x", "apk", 1, reply({ latestVersionCode: "x", minSupportedVersionCode: null })), null);
  assert.equal(await fetchReleasePolicy("https://x", "apk", 0, reply({})), null);
});
