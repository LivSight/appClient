import { API_BASE_URL } from "@/lib/config/api";

/** Production gateway host — dev builds must never register push tokens there. */
const PROD_GATEWAY_HOST = "gateway.livsight.com";

function isProdGateway(url: string | undefined): boolean {
  if (!url) return false;
  const host = url.match(/^https?:\/\/([^/:?#]+)/i)?.[1];
  return host?.toLowerCase() === PROD_GATEWAY_HOST;
}

/**
 * Push token registration is off in __DEV__ by default (avoids Expo network errors in local dev).
 * Set EXPO_PUBLIC_ENABLE_PUSH=true in .env to test push on a physical device.
 *
 * Safety guard: a dev build pointed at the PROD gateway never registers, even with the
 * flag on — otherwise logging into a prod account would bind this device's token to it
 * and hijack that account's notifications.
 */
export function shouldRegisterPushNotifications(options?: {
  dev?: boolean;
  enablePushEnv?: string | undefined;
  gatewayUrl?: string;
}): boolean {
  const dev = options?.dev ?? __DEV__;
  if (!dev) return true;

  if (isProdGateway(options?.gatewayUrl ?? API_BASE_URL)) return false;

  const flag = (options?.enablePushEnv ?? process.env.EXPO_PUBLIC_ENABLE_PUSH)?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}
