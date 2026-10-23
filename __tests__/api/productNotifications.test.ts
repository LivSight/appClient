import { apiFetch } from "@/lib/api/client";
import {
  getProductNotificationUnreadCount,
  listProductNotifications,
  mapProductNotificationItem,
  markAllProductNotificationsRead,
  markProductNotificationRead,
  parseProductNotificationKind,
} from "@/lib/api/productNotifications";

jest.mock("@/lib/api/client", () => ({
  apiFetch: jest.fn(),
}));

const API_BASE = "http://localhost:4040";

function mockApiResponse(status: number, body: unknown) {
  const rawText = typeof body === "string" ? body : body == null ? "" : JSON.stringify(body);
  (apiFetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => rawText,
  });
}

describe("parseProductNotificationKind", () => {
  it("accepts known kinds", () => {
    expect(parseProductNotificationKind("stock")).toBe("stock");
    expect(parseProductNotificationKind("report_daily")).toBe("report_daily");
    expect(parseProductNotificationKind("report_monthly")).toBe("report_monthly");
    expect(parseProductNotificationKind("promo")).toBe("promo");
    expect(parseProductNotificationKind("general")).toBe("general");
  });

  it("rejects unknown kinds", () => {
    expect(parseProductNotificationKind("ticket_message")).toBeNull();
    expect(parseProductNotificationKind("")).toBeNull();
  });
});

describe("mapProductNotificationItem", () => {
  it("maps API item to InAppNotification", () => {
    expect(
      mapProductNotificationItem({
        id: "42",
        kind: "report_monthly",
        title: "Votre rapport mensuel est disponible",
        body: "Le bilan du mois est prêt à consulter.",
        createdAt: "2026-10-18T14:20:00Z",
        read: false,
      }),
    ).toEqual({
      id: "42",
      kind: "report_monthly",
      title: "Votre rapport mensuel est disponible",
      body: "Le bilan du mois est prêt à consulter.",
      createdAt: "2026-10-18T14:20:00Z",
      read: false,
    });
  });

  it("returns null for invalid items", () => {
    expect(mapProductNotificationItem({ id: "1", kind: "nope" })).toBeNull();
    expect(mapProductNotificationItem(null)).toBeNull();
  });
});

describe("productNotifications API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listProductNotifications GETs /api/notifications", async () => {
    mockApiResponse(200, {
      items: [
        {
          id: "42",
          kind: "stock",
          title: "Stock mis à jour",
          body: "Votre stock a été mis à jour.",
          createdAt: "2026-10-18T14:20:00Z",
          read: false,
        },
      ],
      unreadCount: 1,
      nextCursor: null,
    });

    const result = await listProductNotifications({ limit: 20 });
    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/notifications?limit=20`);
    expect(result.unreadCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.kind).toBe("stock");
    expect(result.nextCursor).toBeNull();
  });

  it("listProductNotifications appends cursor when provided", async () => {
    mockApiResponse(200, { items: [], unreadCount: 0, nextCursor: null });
    await listProductNotifications({ limit: 10, cursor: "abc" });
    expect(apiFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/notifications?limit=10&cursor=${encodeURIComponent("abc")}`,
    );
  });

  it("getProductNotificationUnreadCount GETs unread-count", async () => {
    mockApiResponse(200, { unreadCount: 3 });
    expect(await getProductNotificationUnreadCount()).toBe(3);
    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/notifications/unread-count`);
  });

  it("markProductNotificationRead POSTs /:id/read", async () => {
    mockApiResponse(204, null);
    await markProductNotificationRead("42");
    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/notifications/42/read`, {
      method: "POST",
    });
  });

  it("markAllProductNotificationsRead POSTs read-all", async () => {
    mockApiResponse(204, null);
    await markAllProductNotificationsRead();
    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/notifications/read-all`, {
      method: "POST",
    });
  });

  it("throws on non-OK list response", async () => {
    mockApiResponse(500, { message: "boom" });
    await expect(listProductNotifications()).rejects.toThrow(/boom|500/);
  });
});
