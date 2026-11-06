import { parseProjectEnv } from "@expo/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const parsed = parseProjectEnv(projectRoot, {
  mode: "production",
  silent: true,
  systemEnv: process.env,
});
const env = { ...parsed.env, ...process.env };

const errors = [];

function requirePublicHttpsUrl(name, { allowSupabaseLocal = false } = {}) {
  const raw = env[name]?.trim();
  if (!raw || /YOUR_|example\.com|<.+>/i.test(raw)) {
    errors.push(`${name} chưa được cấu hình bằng URL thật.`);
    return;
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    errors.push(`${name} không phải URL hợp lệ.`);
    return;
  }

  if (url.protocol !== "https:") {
    errors.push(`${name} phải dùng HTTPS trong bản release.`);
  }

  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "10.0.2.2" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (privateHost && !allowSupabaseLocal) {
    errors.push(`${name} phải là hostname public, không phải địa chỉ local/LAN.`);
  }
}

function decodeJwtPayload(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function requirePublishableKey() {
  const name = "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  const value = env[name]?.trim();
  if (!value || /YOUR_|<.+>/i.test(value)) {
    errors.push(`${name} chưa được cấu hình.`);
    return;
  }

  const payload = decodeJwtPayload(value);
  if (
    value.startsWith("sb_secret_") ||
    /service[_-]?role/i.test(value) ||
    payload?.role === "service_role"
  ) {
    errors.push(`${name} đang chứa secret/service-role key; tuyệt đối không đóng gói vào app.`);
  }
}

requirePublicHttpsUrl("EXPO_PUBLIC_API_URL");
requirePublicHttpsUrl("EXPO_PUBLIC_SUPABASE_URL");
requirePublishableKey();

if (errors.length > 0) {
  console.error("Release preflight thất bại:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Release preflight đạt: API/Supabase dùng cấu hình public HTTPS và không có server secret.");
}
