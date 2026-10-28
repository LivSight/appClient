import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-react-native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveIdentityAction } from "@/lib/analytics/identity";

/**
 * Keeps PostHog's identity in sync with the auth session: identify(keycloakId) on login,
 * reset() on logout. No-op when PostHog is disabled (no provider → no client).
 */
export function useAnalyticsIdentity(): void {
  const posthog = usePostHog();
  const { user } = useAuth();
  const keycloakId = user?.keycloakId ?? null;
  const previousRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) return;
    const action = resolveIdentityAction(keycloakId, previousRef.current);
    if (action === "identify" && keycloakId) posthog.identify(keycloakId);
    if (action === "reset") posthog.reset();
    previousRef.current = keycloakId;
  }, [posthog, keycloakId]);
}
