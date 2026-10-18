import React, { type ReactNode } from "react";
import { PostHogProvider } from "posthog-react-native";
import { getPostHogConfig } from "@/lib/analytics/posthogConfig";

/**
 * Wraps the app in PostHog when a key is configured; renders children untouched otherwise
 * so local dev without a key and Jest stay analytics-free.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const config = getPostHogConfig();
  if (!config) return <>{children}</>;

  return (
    <PostHogProvider
      apiKey={config.apiKey}
      options={{ host: config.host }}
      autocapture={{ captureScreens: true, captureTouches: false }}
    >
      {children}
    </PostHogProvider>
  );
}
