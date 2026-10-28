import React, { type ReactNode } from "react";
import { PostHogProvider } from "posthog-react-native";
import { getAnalyticsClient } from "@/lib/analytics/client";

/**
 * Wraps the app in PostHog when a key is configured; renders children untouched otherwise
 * so local dev without a key and Jest stay analytics-free. The client is the shared
 * singleton from lib/analytics/client so non-React code (track()) sends to the same queue.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const client = getAnalyticsClient();
  if (!client) return <>{children}</>;

  return (
    <PostHogProvider client={client} autocapture={{ captureScreens: true, captureTouches: false }}>
      {children}
    </PostHogProvider>
  );
}
