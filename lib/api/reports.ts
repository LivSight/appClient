import { API_BASE_URL } from "@/lib/config/api";
import { apiFetch } from "@/lib/api/client";
import { authSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/** Client-scoped report endpoints (GET /api/reports/*) — aggregates are computed server-side. */

export type ReportStatusSummaryItem = {
  status?: string;
  count?: number;
};

export type DeliveryReportLine = {
  id?: number;
  transaction_reference?: string;
  date?: string;
  quartier?: string;
  phone?: string;
  receiver_name?: string;
  status?: string;
  source?: string | null;
  amount_due?: number;
  amount_paid?: number;
  delivery_fee?: number;
  items?: { package_name?: string; quantity?: number }[];
};

export type DeliveryReport = {
  client_id?: number;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  generated_at?: string;
  deliveries?: DeliveryReportLine[];
  status_summary?: ReportStatusSummaryItem[];
  tarifs_par_quartier?: { quartier?: string; count?: number; unit_fee?: number; total_fees?: number }[];
  /** Sum of amount_paid over the period */
  total_encaisse?: number;
  /** Sum of delivery fees over the period */
  total_tarifs?: number;
  /** Sum of amount_due over the period */
  total_commande?: number;
  /** total_encaisse minus total_tarifs */
  reste_a_percevoir?: number;
  delivery_count?: number;
};

export type ExpeditionReportLine = {
  id?: number;
  transaction_reference?: string;
  date?: string;
  departure_city?: string;
  departure_label?: string;
  phone?: string;
  receiver_name?: string;
  status?: string;
  status_label?: string;
  scheduled_delivery_date?: string;
  rescheduled_at?: string;
  expedition_cost?: number;
  agency_main_fee?: number;
  expedition_total_charge?: number;
  expedition_fees_pending?: boolean;
  items?: { package_name?: string; quantity?: number }[];
};

export type ExpeditionReport = {
  client_id?: number;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  generated_at?: string;
  expeditions?: ExpeditionReportLine[];
  status_summary?: ReportStatusSummaryItem[];
  expedition_count?: number;
  /** Sum of expedition_cost (transport — dépense refacturable) */
  total_transport?: number;
  /** Sum of agency_main_fee (revenu agence) */
  total_main_agence?: number;
  /** transport + main = dette client envers l'agence. Ne pas combiner avec reste_a_percevoir. */
  total_a_facturer?: number;
  /** Count of expeditions with expedition_fees_pending = true */
  fees_pending_count?: number;
};

/** Relevé de solde client — synthèse serveur, ne jamais recalculer le net côté front. */
export type SettlementReport = {
  client_id?: number;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  generated_at?: string;
  /** Σ amount_due sur livraisons completed / collected_at_office (COD brut) */
  total_encaisse_brut?: number;
  /** Σ delivery_fee sur livraisons completed / collected_at_office */
  total_frais_livraison?: number;
  /** Σ amount_paid sur livraisons completed / collected_at_office (net après frais) */
  solde_livraisons?: number;
  /** Σ expedition_cost + agency_main_fee sur la période */
  total_frais_expedition?: number;
  /** solde_livraisons − total_frais_expedition : montant à reverser au client */
  net_a_reverser?: number;
  delivered_count?: number;
  delivery_count?: number;
  expedition_count?: number;
  /** Rapport livraisons complet embarqué (lignes + agrégats) */
  deliveries?: DeliveryReport;
  /** Rapport expéditions complet embarqué (lignes + agrégats) */
  expeditions?: ExpeditionReport;
};

export type StockReport = {
  client_id?: number;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  generated_at?: string;
  stock_lines?: {
    package_id?: number;
    package_name?: string;
    description?: string;
    quantity?: number;
    out_of_stock?: boolean;
    updated_at?: string;
  }[];
  consumption?: { package_id?: number; package_name?: string; total_quantity_deducted?: number; movement_count?: number }[];
  total_products?: number;
  total_quantity_in_stock?: number;
  out_of_stock_count?: number;
};

/** YYYY-MM-DD in local time, matching the endpoint's LocalDate params. */
export function toReportDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type ReportStatusBuckets = {
  delivered: number;
  injoignable: number;
  annule: number;
  enCours: number;
};

const DELIVERED_STATUSES = new Set(["completed", "collected_at_office", "delivered"]);
const INJOIGNABLE_STATUSES = new Set(["unreachable", "does_not_pick_up", "client_absent", "postponed"]);
const ANNULE_STATUSES = new Set(["failed", "cancelled", "canceled"]);

/** Folds the backend's per-status counts into the four UI buckets. */
export function statusBucketsFromSummary(summary: ReportStatusSummaryItem[] | undefined): ReportStatusBuckets {
  const buckets: ReportStatusBuckets = { delivered: 0, injoignable: 0, annule: 0, enCours: 0 };
  for (const item of summary ?? []) {
    const status = String(item?.status ?? "").trim().toLowerCase();
    const count = Number(item?.count ?? 0);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (DELIVERED_STATUSES.has(status)) buckets.delivered += count;
    else if (INJOIGNABLE_STATUSES.has(status)) buckets.injoignable += count;
    else if (ANNULE_STATUSES.has(status)) buckets.annule += count;
    else buckets.enCours += count;
  }
  return buckets;
}

export type ReportSourceCounts = {
  stock: number;
  pickup: number;
};

/** Counts report lines by fulfillment source (En stock vs Ramassage). */
export function sourceCountsFromDeliveries(deliveries: DeliveryReportLine[] | undefined): ReportSourceCounts {
  const counts: ReportSourceCounts = { stock: 0, pickup: 0 };
  for (const line of deliveries ?? []) {
    const source = String(line?.source ?? "").trim().toLowerCase();
    if (source === "pickup" || source === "pick_up") counts.pickup += 1;
    else if (source === "stock" || source === "instocke" || source === "in_stock") counts.stock += 1;
  }
  return counts;
}

function parseResponseText(rawText: string): unknown {
  if (!rawText.length) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function errorMessageFrom(status: number, data: unknown, rawText: string): string {
  if (data && typeof data === "object") {
    const message = (data as { message?: string }).message;
    if (typeof message === "string" && message.trim().length) return message.trim();
  }
  if (typeof data === "string" && data.trim().length) return data.trim();
  if (rawText.trim().length) return rawText.trim();
  return `HTTP ${status}`;
}

async function requireKeycloakId(action: string): Promise<string> {
  const sessionUser = await authSession.getSessionUser();
  if (!sessionUser?.keycloakId) {
    throw new Error(`Session expirée. Reconnectez-vous pour ${action}.`);
  }
  return sessionUser.keycloakId.trim();
}

export type ReportKind = "settlement" | "deliveries" | "expeditions" | "stock";

async function fetchReport<T>(kind: ReportKind, startDate: string, endDate: string): Promise<T> {
  const keycloakId = await requireKeycloakId("consulter vos rapports");
  const url = `${API_BASE_URL}/api/reports/${kind}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
  logger.info("reports", `GET /api/reports/${kind}`, { url });

  const res = await apiFetch(url, {
    method: "GET",
    headers: { "X-User-Id": keycloakId },
  });

  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);

  if (!res.ok) {
    logger.info("reports", `GET /api/reports/${kind} failed`, { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  const record = data as { data?: T } | T;
  return (((record as { data?: T })?.data ?? record) ?? {}) as T;
}

export function fetchDeliveryReport(startDate: string, endDate: string): Promise<DeliveryReport> {
  return fetchReport<DeliveryReport>("deliveries", startDate, endDate);
}

export function fetchStockReport(startDate: string, endDate: string): Promise<StockReport> {
  return fetchReport<StockReport>("stock", startDate, endDate);
}

export function fetchExpeditionReport(startDate: string, endDate: string): Promise<ExpeditionReport> {
  return fetchReport<ExpeditionReport>("expeditions", startDate, endDate);
}

export function fetchSettlementReport(startDate: string, endDate: string): Promise<SettlementReport> {
  return fetchReport<SettlementReport>("settlement", startDate, endDate);
}

/** Builds the authenticated PDF endpoint URL + headers (download handled by the caller). */
/** Base du nom de fichier local — aligné sur les noms générés par le backend. */
const PDF_FILE_BASES: Record<ReportKind, string> = {
  settlement: "Releve-Solde",
  deliveries: "Rapport-Livraisons",
  expeditions: "Rapport-Expeditions",
  stock: "Rapport-Stock",
};

export async function buildReportPdfRequest(
  kind: ReportKind,
  startDate: string,
  endDate: string,
): Promise<{ url: string; headers: Record<string, string>; fileName: string }> {
  const keycloakId = await requireKeycloakId("télécharger le rapport");
  const token = await authSession.getAccessToken();
  const url = `${API_BASE_URL}/api/reports/${kind}/pdf?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&download=true`;
  const headers: Record<string, string> = { "X-User-Id": keycloakId };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { url, headers, fileName: `LivSight_${PDF_FILE_BASES[kind]}_${startDate}_au_${endDate}.pdf` };
}
