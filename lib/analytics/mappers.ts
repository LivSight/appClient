import { AuthError } from "@/lib/auth/authApi";
import type { AnalyticsEvents } from "@/lib/analytics/events";

/** Categorizes a login failure for connexion_echouee (never the raw credentials/message). */
export function loginFailureReason(e: unknown): AnalyticsEvents["connexion_echouee"]["raison"] {
  if (e instanceof AuthError) {
    if (typeof e.status === "number") {
      if (e.status >= 500) return "serveur";
      if (e.status >= 400) return "identifiants";
    }
    return "reseau";
  }
  if (e instanceof Error) return "reseau";
  return "inconnue";
}

/** Short, truncated error label for *_echouee events — generic UI messages only, no payloads. */
export function errorLabel(e: unknown): string {
  return e instanceof Error && e.message ? e.message.slice(0, 120) : "inconnue";
}

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Path for erreur_api: origin and query stripped, numeric/uuid segments masked — no IDs leak. */
export function normalizeEndpoint(url: string): string {
  const path = url
    .replace(/^https?:\/\/[^/]+/i, "")
    .split(/[?#]/)[0];
  return path
    .split("/")
    .map((segment) => (/^\d+$/.test(segment) || UUID_SEGMENT.test(segment) ? ":id" : segment))
    .join("/");
}

/** Scroll milestones (50/100) satisfied by the current position; short content counts as read. */
export function reachedScrollMilestones(
  offsetY: number,
  layoutHeight: number,
  contentHeight: number,
): (50 | 100)[] {
  const scrollable = contentHeight - layoutHeight;
  const depth = scrollable <= 0 ? 1 : Math.min(1, Math.max(0, offsetY / scrollable));
  const milestones: (50 | 100)[] = [];
  if (depth >= 0.5) milestones.push(50);
  if (depth >= 0.98) milestones.push(100);
  return milestones;
}
