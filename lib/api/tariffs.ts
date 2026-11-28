import { API_BASE_URL } from "@/lib/config/api";
import { apiFetch } from "@/lib/api/client";
import { logger } from "@/lib/logger";

export type City = {
  id: number;
  name: string;
};

export type DeliveryFeeZone = {
  id: number;
  city_id: number;
  delivery_fee: number;
  sort_order: number;
  distance_label: string | null;
  eta_label: string | null;
};

export type Neighborhood = {
  id: number;
  zone_id: number;
  name: string;
  delivery_fee: number | null;
  requires_entry_fee: boolean;
};

export type DeliveryFeeSettings = {
  pickup_fee: number;
  express_fee: number;
  client_absent_fee_percent?: number | null;
};

type ApiError = { success?: false; error?: string; message?: string };

function parseResponseText(rawText: string): unknown {
  if (!rawText.length) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function errorMessageFrom(resStatus: number, data: unknown, rawText: string): string {
  if (data && typeof data === "object" && data !== null) {
    const message = (data as ApiError).message;
    if (typeof message === "string" && message.trim().length) return message.trim();
  }
  if (typeof data === "string" && data.trim().length) return data.trim();
  if (rawText.trim().length) return rawText.trim();
  return `HTTP ${resStatus}`;
}

function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const inner = (data as { data?: unknown } | null)?.data;
  if (Array.isArray(inner)) return inner as T[];
  return [];
}

function normalizeRecord<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in (data as object)) {
    return ((data as { data?: T }).data ?? data) as T;
  }
  return data as T;
}

async function getJson<T>(url: string, tag: string): Promise<T> {
  const t0 = Date.now();
  logger.info(tag, `GET ${url}`);
  const res = await apiFetch(url, { method: "GET" });
  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);
  logger.info("perf", tag, {
    networkMs: Date.now() - t0,
    payloadKb: Math.round(rawText.length / 102.4) / 10,
    status: res.status,
  });

  if (!res.ok) {
    logger.info(tag, "GET failed", { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  return normalizeRecord<T>(data);
}

export async function listCities(): Promise<City[]> {
  const url = `${API_BASE_URL}/api/cities`;
  const data = await getJson<unknown>(url, "listCities");
  return normalizeListResponse<City>(data);
}

export async function listDeliveryFeeZones(): Promise<DeliveryFeeZone[]> {
  const url = `${API_BASE_URL}/api/delivery-fee-zones`;
  const data = await getJson<unknown>(url, "listDeliveryFeeZones");
  return normalizeListResponse<DeliveryFeeZone>(data);
}

export async function getDeliveryFeeZone(id: number): Promise<DeliveryFeeZone> {
  const url = `${API_BASE_URL}/api/delivery-fee-zones/${encodeURIComponent(String(id))}`;
  return getJson<DeliveryFeeZone>(url, "getDeliveryFeeZone");
}

export async function listNeighborhoods(): Promise<Neighborhood[]> {
  const url = `${API_BASE_URL}/api/neighborhoods`;
  const data = await getJson<unknown>(url, "listNeighborhoods");
  return normalizeListResponse<Neighborhood>(data);
}

export async function getDeliveryFeeSettings(): Promise<DeliveryFeeSettings | null> {
  const t0 = Date.now();
  const url = `${API_BASE_URL}/api/delivery-fee-settings`;
  logger.info("getDeliveryFeeSettings", `GET ${url}`);
  const res = await apiFetch(url, { method: "GET" });
  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);
  logger.info("perf", "getDeliveryFeeSettings", {
    networkMs: Date.now() - t0,
    payloadKb: Math.round(rawText.length / 102.4) / 10,
    status: res.status,
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    logger.info("getDeliveryFeeSettings", "GET failed", { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  return normalizeRecord<DeliveryFeeSettings>(data);
}

export type TariffsCatalog = {
  cities: City[];
  zones: DeliveryFeeZone[];
  neighborhoods: Neighborhood[];
  settings: DeliveryFeeSettings | null;
};

export async function fetchTariffsCatalog(): Promise<TariffsCatalog> {
  const t0 = Date.now();
  const [cities, zones, neighborhoods, settings] = await Promise.all([
    listCities(),
    listDeliveryFeeZones(),
    listNeighborhoods(),
    getDeliveryFeeSettings(),
  ]);
  logger.info("perf", "fetchTariffsCatalog", {
    totalMs: Date.now() - t0,
    cities: cities.length,
    zones: zones.length,
    neighborhoods: neighborhoods.length,
    hasSettings: settings != null,
  });
  return { cities, zones, neighborhoods, settings };
}
