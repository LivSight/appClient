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
