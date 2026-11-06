import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { readPublicConfig } from "@/core/config/public-config";

let current: { token: string; sessionId: string; at: number } | null = null;
let lastMeaningful = 0;
export function configureTelemetry(token: string | null) {
  current = token
    ? { token, sessionId: Crypto.randomUUID(), at: Date.now() }
    : null;
  lastMeaningful = 0;
}
export async function sendTelemetry(
  event: "first_open" | "app_open" | "meaningful_action",
  token?: string,
) {
  const config = readPublicConfig();
  if (!current || !config || (token && token !== current.token)) return;
  if (Date.now() - current.at > 30 * 60 * 1000)
    current.sessionId = Crypto.randomUUID();
  current.at = Date.now();
  const auth = current.token;
  try {
    await fetch(`${config.apiUrl}/v1/telemetry`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: Crypto.randomUUID(),
        sessionId: current.sessionId,
        event,
        version: Constants.expoConfig?.version ?? "",
        channel: "unknown",
        environment: __DEV__ ? "test" : "production",
      }),
    });
  } catch {
    /* Telemetry never changes business outcomes. */
  }
}
export const instrumentedFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const path = String(input);
  if (
    response.ok &&
    current &&
    init?.method &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(init.method) &&
    /\/v1\/(transactions|accounts|budgets|receipts|bills|keepsakes|subscriptions)(\/|$|\?)/.test(
      path,
    ) &&
    Date.now() - lastMeaningful > 60000
  ) {
    lastMeaningful = Date.now();
    const token = new Headers(init.headers)
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (token) void sendTelemetry("meaningful_action", token);
  }
  return response;
};
