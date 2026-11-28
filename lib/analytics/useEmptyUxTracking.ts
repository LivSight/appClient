import { useEffect, useRef } from "react";
import {
  classifyEmptyUx,
  emptyUxDedupeKey,
  type EmptyUxEcran,
} from "@/lib/analytics/emptyUx";
import { track } from "@/lib/analytics/events";

/**
 * Fires `recherche_sans_resultat` or `etat_vide_affiche` once per distinct
 * empty/search state while it is shown; resets when the list is no longer empty.
 */
export function useEmptyUxTracking(input: {
  ecran: EmptyUxEcran;
  ready: boolean;
  isEmpty: boolean;
  hasActiveSearch?: boolean;
  hasActiveFilters?: boolean;
}): void {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const decision = classifyEmptyUx(input);
    if (!decision) {
      lastKeyRef.current = null;
      return;
    }
    const key = emptyUxDedupeKey(decision);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    if (decision.event === "recherche_sans_resultat") {
      track("recherche_sans_resultat", decision.props);
    } else {
      track("etat_vide_affiche", decision.props);
    }
  }, [
    input.ecran,
    input.ready,
    input.isEmpty,
    input.hasActiveSearch,
    input.hasActiveFilters,
  ]);
}
