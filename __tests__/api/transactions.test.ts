import { apiFetch } from "@/lib/api/client";
import { authSession } from "@/lib/auth/session";
import {
  buildPayloadFromPickupResume,
  buildPayloadFromStockResume,
  buildTransactionFormData,
  cancelTransaction,
  canClientCancelTransaction,
  createTransaction,
  getTransactionById,
  listTransactions,
  mapTxnStatusToUi,
  parseTransaction,
  resolveApiSourceField,
  type TransactionRequest,
} from "@/lib/api/transactions";

jest.mock("@/lib/api/client", () => ({
  apiFetch: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  authSession: {
    getSessionUser: jest.fn(),
  },
}));

const API_BASE = "http://localhost:4040";
const KEYCLOAK_ID = "5785160a-6c5c-44d5-96fd-d28aa677d8d4";

const mockGetSessionUser = authSession.getSessionUser as jest.Mock;

function mockApiResponse(status: number, body: unknown) {
  const rawText = typeof body === "string" ? body : JSON.stringify(body);
  (apiFetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => rawText,
  });
}

const SCHEDULED_DATE = "2026-07-09";

const sampleRequest: TransactionRequest = {
  package_name: "Colis test",
  description: "Description test",
  destination_street: "Bastos",
  receiver_name: "Client",
  receiver_phone: "670000000",
  source: "stock",
  scheduled_delivery_date: SCHEDULED_DATE,
  type: "delivery",
  quantity: 1,
  amount: 1500,
  cash_collect: false,
  serviceLevel: "standard",
};

describe("buildPayloadFromPickupResume", () => {
  it("uses type delivery for livraison ramassage with source pickup", () => {
    const payload = buildPayloadFromPickupResume({
      forExpedition: false,
      packageName: "Fort",
      description: "Ramassage: Mimboman — Sac",
      phone: "658478764",
      express: "no",
      collectCash: "no",
      amount: 0,
      quantity: 1,
      pickupStreet: "Mimboman",
      dropoffStreet: "Sac",
      scheduledDeliveryDate: SCHEDULED_DATE,
    });
    expect(payload.type).toBe("delivery");
    expect(payload.source).toBe("pickup");
  });

  it("uses type expedition for expedition ramassage", () => {
    const payload = buildPayloadFromPickupResume({
      forExpedition: true,
      packageName: "Colis",
      description: "Ramassage: Général Express | Rue 12",
      phone: "670000000",
      express: "no",
      collectCash: "no",
      amount: 0,
      quantity: 1,
      pickupStreet: "Général Express | Rue 12",
      dropoffStreet: "Ville",
      scheduledDeliveryDate: SCHEDULED_DATE,
    });
    expect(payload.type).toBe("expedition");
    expect(payload.source).toBe("pickup");
  });

  it("expedition ramassage: never COD, no auto fee, destination copies departure", () => {
    const payload = buildPayloadFromPickupResume({
      forExpedition: true,
      packageName: "Colis",
      description: "Ramassage: Général Express | Rue 12",
      phone: "670000000",
      express: "yes",
      collectCash: "yes",
      amount: 9999,
      quantity: 1,
      pickupStreet: "Général Express | Rue 12",
      pickupLandmark: "repère",
      dropoffStreet: "Bastos",
      dropoffLandmark: "portail rouge",
      city: "Douala",
      scheduledDeliveryDate: SCHEDULED_DATE,
    });
    expect(payload.amount).toBe(0);
    expect(payload.cash_collect).toBe(false);
    expect(payload.serviceLevel).toBe("standard");
    expect(payload.departure_street).toBe("Général Express | Rue 12");
    expect(payload.destination_street).toBe("Général Express | Rue 12");
    expect(payload.departure_city).toBe("Douala");
    expect(payload.destination_city).toBe("Douala");
    expect(payload.departure_landmark).toBeUndefined();
    expect(payload.destination_landmark).toBeUndefined();
  });
});

describe("buildPayloadFromStockResume", () => {
  it("uses type delivery and source stock for livraison stock", () => {
    const payload = buildPayloadFromStockResume({
      forExpedition: false,
      itemsLine: "Robe",
      description: "Robe x1",
      phone: "670000000",
      express: "no",
      collectCash: "no",
      amount: 0,
      quantity: 1,
      destinationQuartier: "Bastos",
      destinationLandmark: "",
      departureStreet: "Agence | Ongola Express",
      scheduledDeliveryDate: SCHEDULED_DATE,
    });
    expect(payload.type).toBe("delivery");
    expect(payload.source).toBe("stock");
  });

  it("maps lineItems to indexed items and total quantity", () => {
    const payload = buildPayloadFromStockResume({
      forExpedition: false,
      lineItems: [
        { package_name: "Prod A", quantity: 2 },
        { package_name: "Prod B", quantity: 1 },
      ],
      description: "Notes",
      phone: "670000000",
      express: "no",
      collectCash: "no",
      amount: 0,
      destinationQuartier: "Akwa",
      destinationLandmark: "",
      departureStreet: "Agence",
      scheduledDeliveryDate: SCHEDULED_DATE,
    });
    expect(payload.package_name).toBe("Prod A");
    expect(payload.quantity).toBe(3);
    expect(payload.items).toEqual([
      { package_name: "Prod A", quantity: 2 },
      { package_name: "Prod B", quantity: 1 },
    ]);
  });

  it("expedition stock: never COD, destination copies departure 'Agence | adresse'", () => {
    const payload = buildPayloadFromStockResume({
      forExpedition: true,
      lineItems: [{ package_name: "Robe", quantity: 2 }],
      description: "",
      phone: "670000000",
      receiverName: "Jean",
      express: "yes",
      collectCash: "yes",
      amount: 5000,
      destinationQuartier: "Bastos",
      destinationLandmark: "près du rond-point",
      departureCity: "Douala",
      departureStreet: "Général Express | Ongola Express — Mvan",
      scheduledDeliveryDate: SCHEDULED_DATE,
    });
    expect(payload.type).toBe("expedition");
    expect(payload.source).toBe("stock");
    expect(payload.amount).toBe(0);
    expect(payload.cash_collect).toBe(false);
    expect(payload.serviceLevel).toBe("standard");
    expect(payload.departure_street).toBe("Général Express | Ongola Express — Mvan");
    expect(payload.destination_street).toBe("Général Express | Ongola Express — Mvan");
    expect(payload.departure_city).toBe("Douala");
    expect(payload.destination_city).toBe("Douala");
    expect(payload.destination_landmark).toBeUndefined();
    expect(payload.quantity).toBe(2);
  });
});

describe("parseTransaction mode inference", () => {
  it("infers pickup mode for delivery when description starts with Ramassage:", () => {
    const tx = parseTransaction({
      type: "delivery",
      description: "Ramassage: Mimboman — Sac",
      package_name: "Fort",
    });
    expect(tx.mode).toBe("pickup");
  });

  it("infers stock mode for delivery without ramassage description", () => {
    const tx = parseTransaction({
      type: "delivery",
      description: "Robe x1",
      package_name: "Robe",
    });
    expect(tx.mode).toBe("stock");
  });

  it("infers pickup mode for legacy type pickup rows", () => {
    const tx = parseTransaction({ type: "pickup", package_name: "Sac" });
    expect(tx.mode).toBe("pickup");
  });
});

describe("resolveApiSourceField", () => {
  it("passes through backend Source enum values pickup and stock", () => {
    expect(resolveApiSourceField("stock")).toBe("stock");
    expect(resolveApiSourceField("pickup")).toBe("pickup");
  });
});

describe("buildTransactionFormData", () => {
  it("appends source pickup or stock on POST", () => {
    const form = buildTransactionFormData(sampleRequest);
    expect(form.get("source")).toBe("stock");
    expect(form.get("scheduled_delivery_date")).toBe(SCHEDULED_DATE);
    expect(form.get("package_name")).toBe("Colis test");
    expect(form.get("type")).toBe("delivery");
  });

  it("appends indexed items fields for multi-product POST", () => {
    const appendSpy = jest.spyOn(FormData.prototype, "append");
    buildTransactionFormData({
      ...sampleRequest,
      package_name: "Prod A",
      quantity: 3,
      items: [
        { package_name: "Prod A", quantity: 2 },
        { package_name: "Prod B", quantity: 1 },
      ],
    });
    expect(appendSpy).toHaveBeenCalledWith("items[0].package_name", "Prod A");
    expect(appendSpy).toHaveBeenCalledWith("items[0].quantity", "2");
    expect(appendSpy).toHaveBeenCalledWith("items[1].package_name", "Prod B");
    expect(appendSpy).toHaveBeenCalledWith("items[1].quantity", "1");
    appendSpy.mockRestore();
  });

  it("omits image when imageUri is missing", () => {
    const form = buildTransactionFormData(sampleRequest);
    expect(form.get("image")).toBeNull();
  });

  it("appends image when imageUri is provided", () => {
    const appendSpy = jest.spyOn(FormData.prototype, "append");
    buildTransactionFormData({
      ...sampleRequest,
      imageUri: "file:///data/user/photo.jpg",
    });
    expect(appendSpy).toHaveBeenCalledWith(
      "image",
      expect.objectContaining({
        uri: "file:///data/user/photo.jpg",
        name: "photo.jpg",
        type: "image/jpeg",
      }),
    );
    appendSpy.mockRestore();
  });
});

describe("transactions API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({
      keycloakId: KEYCLOAK_ID,
      email: "snake123@example.com",
    });
  });

  describe("listTransactions", () => {
    it("GETs /api/users/transactions?keycloakId= for the session user", async () => {
      mockApiResponse(200, [
        {
          package_name: "Mine",
          user_id: 3,
          type: "delivery",
          transactionReference: "LVS-AAA",
          destination: { street: "Bastos" },
        },
        {
          package_name: "WhatsApp order",
          user_id: 3,
          type: "delivery",
          source: "stock",
          transactionReference: "LVS-BBIHDBBBEF",
          destination: { street: "Makepe" },
        },
      ]);

      const result = await listTransactions();

      expect(apiFetch).toHaveBeenCalledWith(
        `${API_BASE}/api/users/transactions?keycloakId=${encodeURIComponent(KEYCLOAK_ID)}`,
        { method: "GET" },
      );
      expect(result).toHaveLength(2);
      expect(result[0].package_name).toBe("Mine");
      expect(result[1].transactionReference).toBe("LVS-BBIHDBBBEF");
    });

    it("throws when there is no authenticated session", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      await expect(listTransactions()).rejects.toThrow("Session expirée");
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("throws when apiFetch returns an error status", async () => {
      mockApiResponse(500, { message: "Server error" });

      await expect(listTransactions()).rejects.toThrow("Server error");
    });
  });

  describe("createTransaction", () => {
    it("POSTs multipart with Bearer (via apiFetch) and X-User-Id keycloak header", async () => {
      mockApiResponse(200, { message: "Transaction created successfully" });
      mockApiResponse(200, [
        {
          package_name: "Colis test",
          user_id: 3,
          type: "delivery",
          status: "pending",
          transactionReference: "LVS-NEW",
          destination: { street: "Bastos" },
        },
      ]);

      await createTransaction(sampleRequest);

      expect(apiFetch).toHaveBeenCalledTimes(2);
      const [url, init] = (apiFetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API_BASE}/api/transactions`);
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
      expect(init.headers).toEqual({ "X-User-Id": KEYCLOAK_ID });
    });

    it("throws when there is no authenticated session", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      await expect(createTransaction(sampleRequest)).rejects.toThrow("Session expirée");
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("throws when create fails", async () => {
      mockApiResponse(404, "User not found");

      await expect(createTransaction(sampleRequest)).rejects.toThrow("User not found");
    });

    it("returns the created transaction from a refreshed list when POST only returns a message", async () => {
      mockApiResponse(200, { message: "Transaction created successfully" });
      mockApiResponse(200, [
        {
          package_name: "Colis test",
          user_id: 3,
          type: "delivery",
          status: "pending",
          transactionReference: "LVS-NEWREF",
          destination: { street: "Bastos" },
        },
      ]);

      const created = await createTransaction(sampleRequest);

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(created.transactionReference).toBe("LVS-NEWREF");
    });
  });

  describe("getTransactionById", () => {
    it("uses reference endpoint when id is LVS-*", async () => {
      mockApiResponse(200, {
        package_name: "Ref txn",
        user_id: 3,
        type: "delivery",
        transactionReference: "LVS-JFCIIJIDDJ",
        destination: { street: "Makepe" },
        receiverData: { name: "Client", phone: "670000000" },
      });

      const tx = await getTransactionById("LVS-JFCIIJIDDJ");

      expect(apiFetch).toHaveBeenCalledWith(
        `${API_BASE}/api/transactions/reference?transactionReference=LVS-JFCIIJIDDJ`,
        { method: "GET" },
      );
      expect(tx.transactionReference).toBe("LVS-JFCIIJIDDJ");
      expect(tx.receiver_phone).toBe("670000000");
    });

    it("uses numeric id endpoint for non-reference ids", async () => {
      mockApiResponse(200, {
        id: 1,
        package_name: "Numeric txn",
        user_id: 3,
        type: "delivery",
        destination: { street: "Essos" },
      });

      const tx = await getTransactionById(1);

      expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/transactions/1`, { method: "GET" });
      expect(tx.package_name).toBe("Numeric txn");
    });

    it("throws when detail fetch fails", async () => {
      mockApiResponse(404, "Not found");

      await expect(getTransactionById("999")).rejects.toThrow("Not found");
    });
  });

  describe("canClientCancelTransaction", () => {
    it("allows cancel only when status is pending", () => {
      expect(canClientCancelTransaction("pending")).toBe(true);
      expect(canClientCancelTransaction("PENDING")).toBe(true);
    });

    it("blocks cancel for in-progress and terminal statuses", () => {
      expect(canClientCancelTransaction("processing")).toBe(false);
      expect(canClientCancelTransaction("scheduled")).toBe(false);
      expect(canClientCancelTransaction("assigned")).toBe(false);
      expect(canClientCancelTransaction("delivered")).toBe(false);
      expect(canClientCancelTransaction("failed")).toBe(false);
      expect(canClientCancelTransaction("cancelled")).toBe(false);
      expect(canClientCancelTransaction(null)).toBe(false);
      expect(canClientCancelTransaction("")).toBe(false);
    });
  });

  describe("cancelTransaction", () => {
    beforeEach(() => {
      mockGetSessionUser.mockResolvedValue({ keycloakId: KEYCLOAK_ID });
    });

    it("PUTs status failed to /api/transactions/:id with X-User-Id", async () => {
      mockApiResponse(200, { id: 42, status: "failed", package_name: "Colis", type: "delivery" });

      const tx = await cancelTransaction(42, { reason: "Client injoignable" });

      expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/transactions/42`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": KEYCLOAK_ID,
        },
        body: JSON.stringify({ status: "failed" }),
      });
      expect(tx.status).toBe("failed");
    });

    it("resolves LVS reference via GET before PUT on numeric id", async () => {
      (apiFetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 7,
              transactionReference: "LVS-ABC123",
              package_name: "Ref txn",
              type: "delivery",
              status: "pending",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 7,
              transactionReference: "LVS-ABC123",
              status: "failed",
              package_name: "Ref txn",
              type: "delivery",
            }),
        });

      await cancelTransaction("LVS-ABC123", { reason: "Autre motif", details: "Test" });

      expect(apiFetch).toHaveBeenNthCalledWith(
        1,
        `${API_BASE}/api/transactions/reference?transactionReference=LVS-ABC123`,
        { method: "GET" },
      );
      expect(apiFetch).toHaveBeenNthCalledWith(
        2,
        `${API_BASE}/api/transactions/7`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "failed" }),
        }),
      );
    });

    it("throws when session is missing", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      await expect(cancelTransaction(1, { reason: "Client injoignable" })).rejects.toThrow(
        "Session expirée",
      );
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("throws when cancel PUT fails", async () => {
      mockApiResponse(400, "Invalid status: cancelled");

      await expect(cancelTransaction(1, { reason: "Client injoignable" })).rejects.toThrow(
        "Invalid status: cancelled",
      );
    });
  });
});

describe("mapTxnStatusToUi", () => {
  it("maps scheduled to Planifiée", () => {
    expect(mapTxnStatusToUi("scheduled")).toBe("Planifiée");
    expect(mapTxnStatusToUi("SCHEDULED")).toBe("Planifiée");
  });
});

describe("parseTransaction scheduled fields", () => {
  it("maps scheduled_delivery_date, delivery_attempt, rescheduled_at", () => {
    const tx = parseTransaction({
      package_name: "Colis",
      status: "scheduled",
      scheduled_delivery_date: "2026-07-12",
      delivery_attempt: 2,
      rescheduled_at: "2026-07-09T10:00:00Z",
    });
    expect(tx.scheduled_delivery_date).toBe("2026-07-12");
    expect(tx.delivery_attempt).toBe(2);
    expect(tx.rescheduled_at).toBe("2026-07-09T10:00:00Z");
  });
});

describe("buildPayloadFromPickupResume scheduled date", () => {
  it("includes scheduled_delivery_date and omits client status", () => {
    const payload = buildPayloadFromPickupResume({
      forExpedition: false,
      packageName: "Sac",
      description: "Test",
      phone: "670000000",
      express: "no",
      collectCash: "no",
      amount: 0,
      quantity: 1,
      pickupStreet: "A",
      dropoffStreet: "B",
      scheduledDeliveryDate: "2026-07-15",
    });
    expect(payload.scheduled_delivery_date).toBe("2026-07-15");
    expect(payload.status).toBeUndefined();
  });
});

describe("mapTxnStatusToUi", () => {
  it("maps scheduled to Planifiée", () => {
    expect(mapTxnStatusToUi("scheduled")).toBe("Planifiée");
    expect(mapTxnStatusToUi("SCHEDULED")).toBe("Planifiée");
  });
});

describe("parseTransaction scheduled fields", () => {
  it("maps scheduled_delivery_date, delivery_attempt, rescheduled_at", () => {
    const tx = parseTransaction({
      package_name: "Colis",
      status: "scheduled",
      scheduled_delivery_date: "2026-07-12",
      delivery_attempt: 2,
      rescheduled_at: "2026-07-09T10:00:00Z",
    });
    expect(tx.scheduled_delivery_date).toBe("2026-07-12");
    expect(tx.delivery_attempt).toBe(2);
    expect(tx.rescheduled_at).toBe("2026-07-09T10:00:00Z");
  });
});

describe("buildPayloadFromPickupResume scheduled date", () => {
  it("includes scheduled_delivery_date and omits client status", () => {
    const payload = buildPayloadFromPickupResume({
      forExpedition: false,
      packageName: "Sac",
      description: "Test",
      phone: "670000000",
      express: "no",
      collectCash: "no",
      amount: 0,
      quantity: 1,
      pickupStreet: "A",
      dropoffStreet: "B",
      scheduledDeliveryDate: "2026-07-15",
    });
    expect(payload.scheduled_delivery_date).toBe("2026-07-15");
    expect(payload.status).toBeUndefined();
  });
});
