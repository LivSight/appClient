import type { City, DeliveryFeeSettings, DeliveryFeeZone, Neighborhood, TariffsCatalog } from "@/lib/api/tariffs";
import { formatDbText } from "@/lib/formatDisplayText";

export type TariffZoneCard = {
  zoneId: string;
  zoneLabel: string;
  priceXaf: number;
  distanceLabel: string;
  etaLabel: string;
};

export type OtherTariffItem = {
  title: string;
  description: string;
  valueLabel: string;
  valueKind: "pillGreen" | "rightAmount" | "pillMuted" | "rightAmountPrimary";
};

export function formatTariffFcfa(n: number): string {
  const v = Math.max(0, Math.round(Number(n) || 0));
  return v.toLocaleString("fr-FR").replace(/\s/g, " ");
}

export function formatTariffAmountLabel(n: number): string {
  return `${formatTariffFcfa(n)} FCFA`;
}

export function formatSupplementFcfaLabel(fee: number | null | undefined): string {
  if (fee == null || !Number.isFinite(fee)) return "—";
  return `+${formatTariffFcfa(fee)} FCFA`;
}

/** True when the API returned no zones and no express/pickup fee settings. */
export function isTariffsCatalogEmpty(catalog: Pick<TariffsCatalog, "zones" | "settings">): boolean {
  if (catalog.zones.length > 0) return false;
  const { pickupFee, expressFee } = resolveDeliveryFeeAmounts(catalog.settings);
  return pickupFee == null && expressFee == null;
}

export function resolveDeliveryFeeAmounts(settings: DeliveryFeeSettings | null | undefined): {
  pickupFee: number | null;
  expressFee: number | null;
} {
  if (!settings) return { pickupFee: null, expressFee: null };
  const pickupFee = Number(settings.pickup_fee);
  const expressFee = Number(settings.express_fee);
  return {
    pickupFee: Number.isFinite(pickupFee) ? pickupFee : null,
    expressFee: Number.isFinite(expressFee) ? expressFee : null,
  };
}

export function zoneDisplayLabel(zone: Pick<DeliveryFeeZone, "sort_order" | "distance_label">): string {
  return `ZONE ${zone.sort_order}`;
}

export function cityDisplayLabel(city: City, countryCode = "CM"): string {
  const name = formatDbText(city.name) || "Ville";
  return `${name}, ${countryCode}`;
}

export function pickDefaultCityId(cities: City[]): number | null {
  if (!cities.length) return null;
  const yaounde = cities.find((c) => c.name?.trim().toLowerCase() === "yaoundé" || c.name?.trim().toLowerCase() === "yaounde");
  return yaounde?.id ?? cities[0].id;
}

export function zonesForCity(zones: DeliveryFeeZone[], cityId: number): DeliveryFeeZone[] {
  return zones.filter((z) => z.city_id === cityId).sort((a, b) => a.sort_order - b.sort_order);
}

export function mapZoneToTariffCard(zone: DeliveryFeeZone): TariffZoneCard {
  const distance = zone.distance_label?.trim();
  const eta = zone.eta_label?.trim();
  return {
    zoneId: String(zone.id),
    zoneLabel: zoneDisplayLabel(zone),
    priceXaf: zone.delivery_fee,
    distanceLabel: distance && distance !== "N/A" ? distance : "—",
    etaLabel: eta && eta !== "N/A" ? eta : "—",
  };
}

function entryFeeLabel(neighborhoods: Neighborhood[]): string {
  const fees = neighborhoods
    .filter((n) => n.requires_entry_fee)
    .map((n) => n.delivery_fee)
    .filter((f): f is number => typeof f === "number" && f > 0);

  if (!fees.length) return "+500 FCFA";

  const min = Math.min(...fees);
  const max = Math.max(...fees);
  if (min === max) return `+${formatTariffFcfa(min)} FCFA`;
  return `+${formatTariffFcfa(min)} – ${formatTariffFcfa(max)} FCFA`;
}

export function buildOtherTariffs(
  _settings: DeliveryFeeSettings | null,
  neighborhoods: Neighborhood[],
): OtherTariffItem[] {
  const entryLabel = entryFeeLabel(neighborhoods);

  return [
    {
      title: "Stockage",
      description: "Salle de stockage à l'Hippodrome · Déduction automatique à chaque livraison confirmée",
      valueLabel: "GRATUIT",
      valueKind: "pillGreen",
    },
    {
      title: "Retrait / récupération",
      description: "Selon la zone et le type de colis · Tarif fixé à la commande",
      valueLabel: "Selon zone",
      valueKind: "pillMuted",
    },
    {
      title: "Expédition inter-urbaine",
      description: "Commission LivSight · Frais de transit fixés par l'agence de voyage partenaire",
      valueLabel: "Sur devis",
      valueKind: "pillMuted",
    },
    {
      title: "Frais de quartier",
      description: "Ajoutés si le livreur entre dans un quartier spécifique hors tarif de zone",
      valueLabel: entryLabel,
      valueKind: "rightAmountPrimary",
    },
    {
      title: "Courses particuliers",
      description: "Ouvert à tous · Particuliers et commerçants · Commande via l'application",
      valueLabel: "Tarif de zone",
      valueKind: "pillMuted",
    },
  ];
}

export function neighborhoodsForZone(neighborhoods: Neighborhood[], zoneId: number): string[] {
  return neighborhoods
    .filter((n) => n.zone_id === zoneId)
    .map((n) => formatDbText(n.name))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

/** Unique neighborhood names from API, sorted for autocomplete. */
export function uniqueNeighborhoodNames(neighborhoods: Neighborhood[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const n of neighborhoods) {
    const name = formatDbText(n.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b, "fr"));
}

/** Filter neighborhood names for quartier autocomplete. */
export function filterNeighborhoodNames(
  names: readonly string[],
  query: string,
  minLength: number = 2,
): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < minLength) return [];
  return names.filter((name) => name.toLowerCase().includes(q));
}
