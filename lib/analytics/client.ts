import type PostHog from "posthog-react-native";
import { getPostHogConfig } from "@/lib/analytics/posthogConfig";

let client: PostHog | null | undefined;

/**
 * The LivSight Development/Production PostHog projects are shared by several
 * apps — this super property tags every event (manual and autocapture) with
 * the emitting app so insights can filter on app_source.
 */
const APP_SOURCE = "app_client";

/**
 * Shared PostHog client — single instance for React (via PostHogProvider) and
 * non-React code (apiFetch, notification routing). Null when analytics are
 * disabled (no API key). The require is lazy so Jest and keyless environments
 * never load the native SDK.
 */
export function getAnalyticsClient(): PostHog | null {
  if (client === undefined) {
    const config = getPostHogConfig();
    if (config) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("posthog-react-native");
      const PostHogClass = mod.PostHog ?? mod.default;
      client = new PostHogClass(config.apiKey, { host: config.host }) as PostHog;
      void client!.register({ app_source: APP_SOURCE });
    } else {
      client = null;
    }
  }
  return client;
}

export function resetAnalyticsClientForTesting(): void {
  client = undefined;
}
