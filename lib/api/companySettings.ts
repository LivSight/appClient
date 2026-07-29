import { API_BASE_URL } from "@/lib/config/api";
import { apiFetch } from "@/lib/api/client";
import { logger } from "@/lib/logger";

export type CompanySettings = {
  company_name: string | null;
  address: string | null;
};

/** Adresse de départ colis stock — repli historique si les Paramètres agence sont vides. */
export const STOCK_DEPARTURE_STREET = "Agence | Ongola Express";

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const url = `${API_BASE_URL}/api/company-settings`;
  try {
    const res = await apiFetch(url, { method: "GET" });
    if (!res.ok) {
      logger.info("companySettings", "GET /api/company-settings failed", { status: res.status });
      return null;
    }
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return null;
    return {
      company_name: typeof data.company_name === "string" ? data.company_name : null,
      address: typeof data.address === "string" ? data.address : null,
    };
  } catch (e: any) {
    logger.info("companySettings", "GET /api/company-settings error", { message: String(e?.message ?? e) });
    return null;
  }
}

/** Adresse de départ colis stock — nom et adresse agence (Paramètres), sinon repli historique. */
export function stockDepartureStreetFromCompanySettings(settings?: CompanySettings | null): string {
  const name = settings?.company_name?.trim() ?? "";
  const address = settings?.address?.trim() ?? "";
  if (name && address) return `${name} | ${address}`;
  return address || name || STOCK_DEPARTURE_STREET;
}
