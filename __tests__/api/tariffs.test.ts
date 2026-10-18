import { apiFetch } from "@/lib/api/client";
import {
  getDeliveryFeeSettings,
  getDeliveryFeeZone,
  listCities,
  listDeliveryFeeZones,
  listNeighborhoods,
} from "@/lib/api/tariffs";
import {
  buildOtherTariffs,
  filterNeighborhoodNames,
  formatSupplementFcfaLabel,
  buildNeighborhoodTariffRows,
  buildTariffSupplementRows,
  filterNeighborhoodTariffRows,
  isTariffsCatalogEmpty,
  mapZoneToTariffCard,
  pickDefaultCityId,
  resolveDeliveryFeeAmounts,
  uniqueNeighborhoodNames,
  zoneDisplayLabel,
} from "@/lib/api/tariffUi";

jest.mock("@/lib/api/client", () => ({
  apiFetch: jest.fn(),
}));

const API_BASE = "http://localhost:4040";

const mockApiFetch = apiFetch as jest.Mock;

function mockApiResponse(status: number, body: unknown) {
  const rawText = typeof body === "string" ? body : JSON.stringify(body);
  mockApiFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => rawText,
  });
}

describe("tariffs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listCities GETs /api/cities", async () => {
    mockApiResponse(200, [{ id: 1, name: "Yaoundé" }]);
    const cities = await listCities();
    expect(mockApiFetch).toHaveBeenCalledWith(`${API_BASE}/api/cities`, { method: "GET" });
    expect(cities).toEqual([{ id: 1, name: "Yaoundé" }]);
  });

  it("listDeliveryFeeZones GETs /api/delivery-fee-zones", async () => {
    mockApiResponse(200, [
      {
        id: 10,
        city_id: 1,
        delivery_fee: 1000,
        sort_order: 1,
        distance_label: "0 – 4 km",
        eta_label: "~30 min",
      },
    ]);
    const zones = await listDeliveryFeeZones();
    expect(mockApiFetch).toHaveBeenCalledWith(`${API_BASE}/api/delivery-fee-zones`, { method: "GET" });
    expect(zones[0].delivery_fee).toBe(1000);
  });

  it("getDeliveryFeeZone GETs /api/delivery-fee-zones/:id", async () => {
    mockApiResponse(200, { id: 10, city_id: 1, delivery_fee: 1500, sort_order: 2 });
    const zone = await getDeliveryFeeZone(10);
    expect(mockApiFetch).toHaveBeenCalledWith(`${API_BASE}/api/delivery-fee-zones/10`, { method: "GET" });
    expect(zone.id).toBe(10);
  });

  it("listNeighborhoods GETs /api/neighborhoods", async () => {
    mockApiResponse(200, [{ id: 5, zone_id: 10, name: "Bastos", requires_entry_fee: false }]);
    const list = await listNeighborhoods();
    expect(mockApiFetch).toHaveBeenCalledWith(`${API_BASE}/api/neighborhoods`, { method: "GET" });
    expect(list[0].name).toBe("Bastos");
  });

  it("getDeliveryFeeSettings GETs /api/delivery-fee-settings", async () => {
    mockApiResponse(200, { pickup_fee: 500, express_fee: 1000, client_absent_fee_percent: 30 });
    const settings = await getDeliveryFeeSettings();
    expect(mockApiFetch).toHaveBeenCalledWith(`${API_BASE}/api/delivery-fee-settings`, { method: "GET" });
    expect(settings?.express_fee).toBe(1000);
  });

  it("getDeliveryFeeSettings returns null on 404", async () => {
    mockApiResponse(404, { message: "Not found" });
    await expect(getDeliveryFeeSettings()).resolves.toBeNull();
  });
});

describe("tariffUi", () => {
  it("zoneDisplayLabel uses sort_order", () => {
    expect(
      zoneDisplayLabel({
        id: 1,
        city_id: 1,
        delivery_fee: 1000,
        sort_order: 2,
        distance_label: "4 – 8 km",
        eta_label: "~45 min",
      }),
    ).toBe("ZONE 2");
  });

  it("mapZoneToTariffCard maps API zone to UI card", () => {
    const card = mapZoneToTariffCard({
      id: 3,
      city_id: 1,
      delivery_fee: 2000,
      sort_order: 3,
      distance_label: "8 – 20 km",
      eta_label: "~1h",
    });
    expect(card.zoneId).toBe("3");
    expect(card.zoneLabel).toBe("ZONE 3");
    expect(card.priceXaf).toBe(2000);
    expect(card.distanceLabel).toBe("8 – 20 km");
  });

  it("pickDefaultCityId prefers Yaoundé then first city", () => {
    expect(pickDefaultCityId([{ id: 2, name: "Douala" }, { id: 1, name: "Yaoundé" }])).toBe(1);
    expect(pickDefaultCityId([{ id: 2, name: "Douala" }])).toBe(2);
  });

  it("isTariffsCatalogEmpty is true when there are no zones and no fee settings", () => {
    expect(isTariffsCatalogEmpty({ zones: [], settings: null })).toBe(true);
    expect(
      isTariffsCatalogEmpty({
        zones: [],
        settings: { pickup_fee: 500, express_fee: 1000 },
      }),
    ).toBe(false);
    expect(
      isTariffsCatalogEmpty({
        zones: [{ id: 1, city_id: 1, delivery_fee: 1500, sort_order: 1, distance_label: null, eta_label: null }],
        settings: null,
      }),
    ).toBe(false);
  });

  it("resolveDeliveryFeeAmounts reads pickup and express from settings", () => {
    expect(resolveDeliveryFeeAmounts({ pickup_fee: 750, express_fee: 1200 })).toEqual({
      pickupFee: 750,
      expressFee: 1200,
    });
    expect(resolveDeliveryFeeAmounts(null)).toEqual({ pickupFee: null, expressFee: null });
  });

  it("formatSupplementFcfaLabel prefixes plus sign", () => {
    expect(formatSupplementFcfaLabel(500)).toBe("+500 FCFA");
    expect(formatSupplementFcfaLabel(null)).toBe("—");
  });

  it("buildNeighborhoodTariffRows lists quartiers with zone and amount", () => {
    const rows = buildNeighborhoodTariffRows({
      zones: [
        { id: 1, city_id: 1, delivery_fee: 1500, sort_order: 1, distance_label: "0-5", eta_label: null },
        { id: 2, city_id: 1, delivery_fee: 2000, sort_order: 2, distance_label: null, eta_label: null },
      ],
      neighborhoods: [
        { id: 10, zone_id: 2, name: "Mvan", delivery_fee: null, requires_entry_fee: false },
        { id: 11, zone_id: 1, name: "Bastos", delivery_fee: 500, requires_entry_fee: true },
        { id: 12, zone_id: 99, name: "Hors ville", delivery_fee: null, requires_entry_fee: false },
      ],
    });
    expect(rows.map((r) => r.neighborhoodName)).toEqual(["Bastos", "Mvan"]);
    expect(rows[0]).toMatchObject({ zoneLabel: "ZONE 1", amountLabel: "1 500 FCFA", zoneId: "1" });
    expect(rows[1]).toMatchObject({ zoneLabel: "ZONE 2", amountLabel: "2 000 FCFA" });
  });

  it("filterNeighborhoodTariffRows matches quartier or zone", () => {
    const rows = buildNeighborhoodTariffRows({
      zones: [{ id: 1, city_id: 1, delivery_fee: 1500, sort_order: 1, distance_label: null, eta_label: null }],
      neighborhoods: [
        { id: 1, zone_id: 1, name: "Bastos", delivery_fee: null, requires_entry_fee: false },
        { id: 2, zone_id: 1, name: "Mvan", delivery_fee: null, requires_entry_fee: false },
      ],
    });
    expect(filterNeighborhoodTariffRows(rows, "bas").map((r) => r.neighborhoodName)).toEqual(["Bastos"]);
    expect(filterNeighborhoodTariffRows(rows, "zone 1")).toHaveLength(2);
    expect(filterNeighborhoodTariffRows(rows, "")).toHaveLength(2);
  });

  it("buildTariffSupplementRows lists express and pickup fees", () => {
    expect(buildTariffSupplementRows({ expressFee: 1000, pickupFee: 500 }).map((r) => r.amountLabel)).toEqual([
      "+1 000 FCFA",
      "+500 FCFA",
    ]);
  });


  it("buildOtherTariffs uses entry neighborhoods for quartier fee", () => {
    const items = buildOtherTariffs(
      { pickup_fee: 500, express_fee: 1000, client_absent_fee_percent: 30 },
      [{ id: 1, zone_id: 1, name: "Bastos", delivery_fee: 500, requires_entry_fee: true }],
    );
    expect(items.find((i) => i.title === "Ramassage hors stock")).toBeUndefined();
    expect(items.find((i) => i.title === "Frais de quartier")?.valueLabel).toBe("+500 FCFA");
  });

  it("uniqueNeighborhoodNames dedupes, trims and sorts alphabetically", () => {
    const names = uniqueNeighborhoodNames([
      { id: 2, zone_id: 1, name: "Mvan", delivery_fee: 0, requires_entry_fee: false },
      { id: 1, zone_id: 1, name: " Bastos ", delivery_fee: 500, requires_entry_fee: true },
      { id: 3, zone_id: 2, name: "bastos", delivery_fee: 0, requires_entry_fee: false },
      { id: 4, zone_id: 1, name: "  ", delivery_fee: 0, requires_entry_fee: false },
    ]);
    expect(names).toEqual(["Bastos", "Mvan"]);
  });

  it("filterNeighborhoodNames returns empty when query is too short", () => {
    const names = ["Bastos", "Emombo", "Mvan"];
    expect(filterNeighborhoodNames(names, "")).toEqual([]);
    expect(filterNeighborhoodNames(names, "   ")).toEqual([]);
    expect(filterNeighborhoodNames(names, "b")).toEqual([]);
  });

  it("filterNeighborhoodNames filters case-insensitively when query is long enough", () => {
    const names = ["Bastos", "Emombo", "Mvan"];
    expect(filterNeighborhoodNames(names, "MV")).toEqual(["Mvan"]);
    expect(filterNeighborhoodNames(names, "ombo")).toEqual(["Emombo"]);
  });
});
