import { apiFetch } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/config/api";
import {
  parseClientBalance,
  parseSettlementDebt,
  type ClientBalance,
  type SettlementDebt,
} from "@/lib/reports/debtDisplay";

async function getJson(path: string): Promise<unknown> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, { method: "GET" });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}

/** The merchant's own debt ledger. */
export async function fetchClientBalance(): Promise<ClientBalance> {
  return parseClientBalance(await getJson("/api/client-balance"));
}

/** What the given settlement period pays once the debt is taken into account. */
export async function fetchSettlementDebt(startDate: string, endDate: string): Promise<SettlementDebt | null> {
  const params = new URLSearchParams({ startDate, endDate });
  return parseSettlementDebt(await getJson(`/api/client-balance/settlement?${params.toString()}`));
}
