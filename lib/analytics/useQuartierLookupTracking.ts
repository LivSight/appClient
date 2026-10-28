import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/events";

/**
 * Tracks quartier_recherche once per distinct quartier when the tariff lookup settles.
 * `trouve: false` surfaces quartiers users ask for that no delivery zone covers —
 * the service-expansion signal.
 */
export function useQuartierLookupTracking(terme: string, loading: boolean, trouve: boolean): void {
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const cleaned = terme.trim();
    if (!cleaned || loading) return;
    if (lastTrackedRef.current === cleaned) return;
    lastTrackedRef.current = cleaned;
    track("quartier_recherche", { terme: cleaned, trouve });
  }, [terme, loading, trouve]);
}
