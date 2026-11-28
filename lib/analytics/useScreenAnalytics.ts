import { useEffect, useRef } from "react";
import { getAnalyticsClient } from "@/lib/analytics/client";
import { captureScreenTransition } from "@/lib/analytics/screenNames";
import { logger } from "@/lib/logger";

/**
 * Emits PostHog `$screen` with stable names on real Expo Router navigations.
 * No-op when analytics are disabled; never throws. Dedupes re-renders of the same path.
 */
export function useScreenAnalytics(pathname: string): void {
  const lastScreenRef = useRef<string | null>(null);

  useEffect(() => {
    const client = getAnalyticsClient();
    try {
      lastScreenRef.current = captureScreenTransition(
        lastScreenRef.current,
        pathname,
        (name) => {
          if (!client) return;
          void client.screen(name);
        },
      );
    } catch (e) {
      logger.warn("analytics", `screen capture failed for ${pathname}`, e);
    }
  }, [pathname]);
}
