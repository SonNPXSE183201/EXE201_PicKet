export function shouldUseNativeGoogle({ platform, clientId }: {
  platform: string;
  clientId?: string;
}): boolean {
  return platform === "android" && Boolean(clientId?.trim());
}

export function nativeGoogleOutcome(value: unknown): "cancelled" | "fallback" | "token" | "rethrow" {
  if (!value || typeof value !== "object") return "rethrow";
  const result = value as { type?: string; data?: { idToken?: unknown }; code?: unknown };
  const code = String(result.code ?? "");
  if (result.type === "cancelled" || ["SIGN_IN_CANCELLED", "12501"].includes(code)) return "cancelled";
  if (["NATIVE_MODULE_UNAVAILABLE", "PLAY_SERVICES_NOT_AVAILABLE", "DEVELOPER_ERROR", "10"].includes(code)) return "fallback";
  if (result.type === "success") {
    return typeof result.data?.idToken === "string" && result.data.idToken.trim() ? "token" : "fallback";
  }
  return "rethrow";
}
