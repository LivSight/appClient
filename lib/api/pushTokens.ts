import { API_BASE_URL } from "@/lib/config/api";
import { apiFetch } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import { Platform } from "react-native";

export type PushPlatform = "ios" | "android";

/** Identifies this app to the backend — required by POST /api/push-tokens. */
const PUSH_APP = "client";

export async function registerPushToken(expoPushToken: string): Promise<void> {
  const platform: PushPlatform = Platform.OS === "ios" ? "ios" : "android";
  const url = `${API_BASE_URL}/api/push-tokens`;

  const payload = { expoPushToken, platform, app: PUSH_APP };
  logger.info("push", "POST /api/push-tokens", payload);

  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.warn("push", "POST /api/push-tokens failed", { status: res.status, body: text });
    throw new Error(`Push token registration failed (${res.status})`);
  }
}

export async function deletePushToken(expoPushToken?: string): Promise<void> {
  const url = `${API_BASE_URL}/api/push-tokens`;
  const body = expoPushToken ? JSON.stringify({ expoPushToken }) : undefined;

  logger.info("push", "DELETE /api/push-tokens", { hasToken: Boolean(expoPushToken) });

  const res = await apiFetch(url, {
    method: "DELETE",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    logger.warn("push", "DELETE /api/push-tokens failed", { status: res.status, body: text });
  }
}
