import { classifyEmptyUx, emptyUxDedupeKey } from "@/lib/analytics/emptyUx";

describe("classifyEmptyUx", () => {
  it("returns null when not ready or not empty", () => {
    expect(
      classifyEmptyUx({ ecran: "stock", ready: false, isEmpty: true }),
    ).toBeNull();
    expect(
      classifyEmptyUx({ ecran: "stock", ready: true, isEmpty: false }),
    ).toBeNull();
  });

  it("prefers recherche_sans_resultat over empty when search is active", () => {
    expect(
      classifyEmptyUx({
        ecran: "stock",
        ready: true,
        isEmpty: true,
        hasActiveSearch: true,
        hasActiveFilters: true,
      }),
    ).toEqual({
      event: "recherche_sans_resultat",
      props: { contexte: "stock" },
    });

    expect(
      classifyEmptyUx({
        ecran: "tarifs",
        ready: true,
        isEmpty: true,
        hasActiveSearch: true,
      }),
    ).toEqual({
      event: "recherche_sans_resultat",
      props: { contexte: "tarifs" },
    });

    expect(
      classifyEmptyUx({
        ecran: "conversations",
        ready: true,
        isEmpty: true,
        hasActiveSearch: true,
        hasActiveFilters: true,
      }),
    ).toEqual({
      event: "recherche_sans_resultat",
      props: { contexte: "conversations" },
    });
  });

  it("uses etat_vide_affiche with filtre when filters hide all rows", () => {
    expect(
      classifyEmptyUx({
        ecran: "courses",
        ready: true,
        isEmpty: true,
        hasActiveFilters: true,
      }),
    ).toEqual({
      event: "etat_vide_affiche",
      props: { ecran: "courses", motif: "filtre" },
    });

    expect(
      classifyEmptyUx({
        ecran: "rapports",
        ready: true,
        isEmpty: true,
        hasActiveFilters: true,
      }),
    ).toEqual({
      event: "etat_vide_affiche",
      props: { ecran: "rapports", motif: "filtre" },
    });
  });

  it("uses etat_vide_affiche liste_vide for true empty lists", () => {
    expect(
      classifyEmptyUx({ ecran: "stock", ready: true, isEmpty: true }),
    ).toEqual({
      event: "etat_vide_affiche",
      props: { ecran: "stock", motif: "liste_vide" },
    });

    expect(
      classifyEmptyUx({ ecran: "notifications", ready: true, isEmpty: true }),
    ).toEqual({
      event: "etat_vide_affiche",
      props: { ecran: "notifications", motif: "liste_vide" },
    });

    expect(
      classifyEmptyUx({ ecran: "tarifs_zone", ready: true, isEmpty: true }),
    ).toEqual({
      event: "etat_vide_affiche",
      props: { ecran: "tarifs_zone", motif: "liste_vide" },
    });
  });

  it("does not treat search as recherche on screens without free-text search", () => {
    expect(
      classifyEmptyUx({
        ecran: "courses",
        ready: true,
        isEmpty: true,
        hasActiveSearch: true,
        hasActiveFilters: true,
      }),
    ).toEqual({
      event: "etat_vide_affiche",
      props: { ecran: "courses", motif: "filtre" },
    });
  });
});

describe("emptyUxDedupeKey", () => {
  it("builds stable keys for search and empty decisions", () => {
    expect(
      emptyUxDedupeKey({
        event: "recherche_sans_resultat",
        props: { contexte: "stock" },
      }),
    ).toBe("recherche:stock");
    expect(
      emptyUxDedupeKey({
        event: "etat_vide_affiche",
        props: { ecran: "courses", motif: "filtre" },
      }),
    ).toBe("vide:courses:filtre");
  });
});
