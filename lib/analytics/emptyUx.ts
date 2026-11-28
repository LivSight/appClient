export type EmptyUxEcran =
  | "stock"
  | "tarifs"
  | "courses"
  | "conversations"
  | "notifications"
  | "tarifs_zone"
  | "rapports";

export type RechercheContexte = "stock" | "tarifs" | "conversations";

export type EmptyUxDecision =
  | { event: "recherche_sans_resultat"; props: { contexte: RechercheContexte } }
  | { event: "etat_vide_affiche"; props: { ecran: EmptyUxEcran; motif: "liste_vide" | "filtre" } }
  | null;

const SEARCH_CONTEXTS: ReadonlySet<EmptyUxEcran> = new Set(["stock", "tarifs", "conversations"]);

/**
 * Decides which empty/search UX event to fire (if any).
 * Active free-text search on search-capable screens wins over empty-state
 * (never both). No raw query in properties.
 */
export function classifyEmptyUx(input: {
  ecran: EmptyUxEcran;
  ready: boolean;
  isEmpty: boolean;
  hasActiveSearch?: boolean;
  hasActiveFilters?: boolean;
}): EmptyUxDecision {
  if (!input.ready || !input.isEmpty) return null;

  if (input.hasActiveSearch && SEARCH_CONTEXTS.has(input.ecran)) {
    return {
      event: "recherche_sans_resultat",
      props: { contexte: input.ecran as RechercheContexte },
    };
  }

  if (input.hasActiveFilters) {
    return {
      event: "etat_vide_affiche",
      props: { ecran: input.ecran, motif: "filtre" },
    };
  }

  return {
    event: "etat_vide_affiche",
    props: { ecran: input.ecran, motif: "liste_vide" },
  };
}

export function emptyUxDedupeKey(decision: NonNullable<EmptyUxDecision>): string {
  if (decision.event === "recherche_sans_resultat") {
    return `recherche:${decision.props.contexte}`;
  }
  return `vide:${decision.props.ecran}:${decision.props.motif}`;
}
