/** PostHog EU cloud — this account lives in the EU region. */
export const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

export type PostHogConfig = {
  apiKey: string;
  host: string;
};

/**
 * Analytics are opt-in via env: no EXPO_PUBLIC_POSTHOG_API_KEY → PostHog fully disabled
 * (local dev without a key, Jest). Dev builds read .env (dev project key); EAS production
 * builds get the prod project key from eas.json, so dev and prod data never mix.
 */
export function getPostHogConfig(options?: {
  apiKey?: string | undefined;
  host?: string | undefined;
}): PostHogConfig | null {
  // IMPORTANT: Expo only inlines EXPO_PUBLIC_* vars when accessed statically.
  const apiKey = (options?.apiKey ?? process.env.EXPO_PUBLIC_POSTHOG_API_KEY)?.trim();
  if (!apiKey) return null;

  const host = (options?.host ?? process.env.EXPO_PUBLIC_POSTHOG_HOST)?.trim() || DEFAULT_POSTHOG_HOST;
  return { apiKey, host };
}
