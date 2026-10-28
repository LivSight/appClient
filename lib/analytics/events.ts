import { getAnalyticsClient } from "@/lib/analytics/client";
import { logger } from "@/lib/logger";

export type DemandeFlow = "livraison" | "expedition";
export type DemandeSource = "stock" | "ramasse";

/**
 * The analytics contract — every event the app may capture, with its properties.
 * Event names are frozen: renaming one breaks PostHog history. Adding an event
 * means adding it here first; capturing anything outside this catalog is a type
 * error. No PII ever goes in properties (no names, phones, addresses, amounts).
 */
export type AnalyticsEvents = {
  // P1 — métier
  demande_soumise: { flow: DemandeFlow; source: DemandeSource; nb_produits: number };
  demande_echouee: { flow: DemandeFlow; source: DemandeSource; erreur: string };
  demande_abandonnee: { flow: DemandeFlow; etape: "formulaire" | "resume" };
  connexion_reussie: undefined;
  connexion_echouee: { raison: "identifiants" | "reseau" | "serveur" | "inconnue" };
  annulation_demandee: { raison: string };
  ajout_stock_soumis: { nb_produits: number };
  ajout_stock_echoue: { erreur: string };

  // P2 — features
  quartier_recherche: { terme: string; trouve: boolean };
  rapport_visualise: { type_rapport: string; periode: string };
  document_telecharge: { type_rapport: string; periode: string; action: "telechargement" | "partage" };
  document_echec: { type_rapport: string; erreur: string };
  courses_filtrees: { filtre_statut: string; filtre_periode: string };
  notification_recue: { type: string };
  notification_ouverte: { type: string; ecran_cible: string };
  tarif_zone_consulte: { zone: string };

  // P3 — profondeur
  rapport_scroll: { profondeur: 50 | 100 };
  conversation_ouverte: undefined;
  erreur_api: { endpoint: string; statut: number };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

type TrackArgs<E extends AnalyticsEventName> = AnalyticsEvents[E] extends undefined
  ? [event: E]
  : [event: E, props: AnalyticsEvents[E]];

/** Fire-and-forget capture: no-op when analytics are disabled, never throws. */
export function track<E extends AnalyticsEventName>(...args: TrackArgs<E>): void {
  const [event, props] = args as [AnalyticsEventName, Record<string, unknown> | undefined];
  const client = getAnalyticsClient();
  if (!client) return;
  try {
    client.capture(event, props as Parameters<typeof client.capture>[1]);
  } catch (e) {
    logger.warn("analytics", `track(${event}) failed`, e);
  }
}
