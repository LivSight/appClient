const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Explicit Expo Router pathname → stable PostHog `$screen` name (French snake_case). */
const SCREEN_BY_PATH: Record<string, string> = {
  "/": "accueil",
  "/login": "login",
  "/livraison": "courses",
  "/tarifs": "tarifs",
  "/rapports": "rapports",
  "/stock": "stock",
  "/inbox": "conversations",
  "/notifications": "notifications",
  "/profile": "profil",
  "/mes-informations": "mes_informations",
  "/ma-demande-livraison": "ma_demande_livraison",
  "/ma-demande-expedition": "ma_demande_expedition",
  "/demande-expedition": "demande_expedition",
  "/info-produit-en-stock": "info_produit_en_stock",
  "/info-produit-ramasse": "info_produit_ramasse",
  "/ajouter-les-produits": "ajouter_les_produits",
  "/resume-produit-en-stock": "resume_produit_en_stock",
  "/resume-produit-ramasse": "resume_produit_ramasse",
  "/confirmee": "confirmee",
  "/ajouter-au-stock": "ajouter_au_stock",
  "/confirmation-ajout-stock": "confirmation_ajout_stock",
  "/annulation": "annulation",
  "/annulation-confirmee": "annulation_confirmee",
  "/rapport-pdf-preview": "rapport_pdf_preview",
};

const DYNAMIC_PREFIX: { prefix: string; name: string }[] = [
  { prefix: "/livraison-detail/", name: "livraison_detail" },
  { prefix: "/expedition-detail/", name: "expedition_detail" },
  { prefix: "/tarifs-zone/", name: "tarifs_zone" },
  { prefix: "/inbox/", name: "conversation_detail" },
];

function isDynamicSegment(segment: string): boolean {
  return /^\d+$/.test(segment) || UUID_SEGMENT.test(segment);
}

/** Normalize Expo Router pathname: drop query, groups, trailing slash. */
export function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] ?? "";
  const withoutGroups = withoutQuery.replace(/\/\([^/]+\)/g, "");
  const trimmed = withoutGroups.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Maps an Expo Router pathname to a stable analytics screen name.
 * Dynamic ids (numeric / UUID) are never included in the result.
 */
export function resolveScreenName(pathname: string): string {
  const path = normalizePathname(pathname);

  const exact = SCREEN_BY_PATH[path];
  if (exact) return exact;

  for (const { prefix, name } of DYNAMIC_PREFIX) {
    if (path.startsWith(prefix) && path.length > prefix.length) return name;
  }

  const parts = path.split("/").filter(Boolean).filter((p) => !isDynamicSegment(p));
  if (parts.length === 0) return "accueil";
  return parts.join("_").replace(/-/g, "_");
}

/** True when we should emit `$screen` (real navigation, not a re-render). */
export function shouldCaptureScreen(
  previous: string | null,
  next: string | null | undefined,
): boolean {
  if (!next) return false;
  return next !== previous;
}

/**
 * If pathname resolves to a new screen name, calls `screen` once and returns that name.
 * Otherwise returns `previous` unchanged (dedupe).
 */
export function captureScreenTransition(
  previous: string | null,
  pathname: string,
  screen: (name: string) => void,
): string | null {
  const name = resolveScreenName(pathname);
  if (!shouldCaptureScreen(previous, name)) return previous;
  screen(name);
  return name;
}
