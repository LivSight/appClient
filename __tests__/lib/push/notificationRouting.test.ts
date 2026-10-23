import {
  isProductPushType,
  isTransactionPushType,
  parseClientPushType,
  parseDeliveryIdFromNotificationData,
  parsePushReceivedPayload,
  parseTicketMessageNotificationRoute,
  resolveClientPushRoute,
  shouldRefreshInAppNotifications,
} from "@/lib/push/notificationRouting";

describe("parseDeliveryIdFromNotificationData", () => {
  it("reads transactionId from backend payload", () => {
    expect(parseDeliveryIdFromNotificationData({ transactionId: "42" })).toBe("42");
    expect(parseDeliveryIdFromNotificationData({ transactionId: 7 })).toBe("7");
  });

  it("reads id from /transactions/:id url", () => {
    expect(parseDeliveryIdFromNotificationData({ url: "/transactions/99" })).toBe("99");
  });

  it("falls back to deliveryId for legacy payloads", () => {
    expect(parseDeliveryIdFromNotificationData({ deliveryId: "12" })).toBe("12");
  });
});

describe("parseClientPushType", () => {
  it("returns known push types", () => {
    expect(parseClientPushType({ type: "driver_assigned" })).toBe("driver_assigned");
    expect(parseClientPushType({ type: "ticket_message" })).toBe("ticket_message");
    expect(parseClientPushType({ type: "delivery_rescheduled" })).toBe("delivery_rescheduled");
    expect(parseClientPushType({ type: "delivery_today_reminder" })).toBe("delivery_today_reminder");
    expect(parseClientPushType({ type: "stock_updated" })).toBe("stock_updated");
    expect(parseClientPushType({ type: "report_daily_ready" })).toBe("report_daily_ready");
    expect(parseClientPushType({ type: "report_monthly_ready" })).toBe("report_monthly_ready");
  });

  it("returns null for unknown types", () => {
    expect(parseClientPushType({ type: "agency_new_order" })).toBeNull();
    expect(parseClientPushType({})).toBeNull();
  });
});

describe("isProductPushType / product routes", () => {
  it("recognizes product push types", () => {
    expect(isProductPushType("stock_updated")).toBe(true);
    expect(isProductPushType("report_monthly_ready")).toBe(true);
    expect(isProductPushType("ticket_message")).toBe(false);
  });

  it("routes product pushes to stock / rapports / tarifs / notifications", () => {
    expect(resolveClientPushRoute({ type: "stock_updated" })).toEqual({ screen: "stock" });
    expect(resolveClientPushRoute({ type: "report_daily_ready" })).toEqual({
      screen: "rapports",
      range: "Journalier",
    });
    expect(resolveClientPushRoute({ type: "report_monthly_ready" })).toEqual({
      screen: "rapports",
      range: "Mensuel",
    });
    expect(resolveClientPushRoute({ type: "promo" })).toEqual({ screen: "tarifs" });
    expect(resolveClientPushRoute({ type: "general" })).toEqual({ screen: "notifications" });
  });

  it("shouldRefreshInAppNotifications is true for product pushes", () => {
    expect(shouldRefreshInAppNotifications({ type: "stock_updated" })).toBe(true);
    expect(shouldRefreshInAppNotifications({ type: "ticket_message" })).toBe(false);
  });
});

describe("isTransactionPushType", () => {
  it("includes order lifecycle types", () => {
    expect(isTransactionPushType("transaction_created")).toBe(true);
    expect(isTransactionPushType("transaction_status_changed")).toBe(true);
    expect(isTransactionPushType("delivery_fee_finalized")).toBe(true);
    expect(isTransactionPushType("delivery_rescheduled")).toBe(true);
    expect(isTransactionPushType("delivery_today_reminder")).toBe(true);
  });

  it("excludes ticket_message", () => {
    expect(isTransactionPushType("ticket_message")).toBe(false);
  });
});

describe("resolveClientPushRoute", () => {
  it.each([
    "transaction_created",
    "driver_assigned",
    "driver_reassigned",
    "driver_cleared",
    "transaction_status_changed",
    "delivery_fee_finalized",
    "delivery_rescheduled",
    "delivery_today_reminder",
  ] as const)("routes %s to detail", (type) => {
    expect(
      resolveClientPushRoute({
        type,
        transactionId: "1001",
        url: "/transactions/1001",
      }),
    ).toEqual({ screen: "detail", transactionId: "1001" });
  });

  it("routes client ticket_message to inbox", () => {
    expect(
      resolveClientPushRoute({
        type: "ticket_message",
        channel: "client",
        transactionId: "1001",
        ticketId: "12",
      }),
    ).toEqual({ screen: "inbox", transactionId: "1001", ticketId: "12" });
  });

  it("ignores driver channel ticket_message", () => {
    expect(
      resolveClientPushRoute({
        type: "ticket_message",
        channel: "driver",
        transactionId: "1001",
      }),
    ).toBeNull();
  });

  it("falls back to detail when type is unknown but transactionId exists", () => {
    expect(resolveClientPushRoute({ type: "unknown", transactionId: "55" })).toEqual({
      screen: "detail",
      transactionId: "55",
    });
  });

  it("returns null when no route can be resolved", () => {
    expect(resolveClientPushRoute({ type: "unknown" })).toBeNull();
  });
});

describe("parseTicketMessageNotificationRoute", () => {
  it("routes client channel ticket_message to inbox", () => {
    expect(
      parseTicketMessageNotificationRoute({
        type: "ticket_message",
        channel: "client",
        transactionId: "1001",
        ticketId: "12",
      }),
    ).toEqual({ transactionId: "1001", ticketId: "12" });
  });

  it("ignores driver channel for client app", () => {
    expect(
      parseTicketMessageNotificationRoute({
        type: "ticket_message",
        channel: "driver",
        transactionId: "1001",
      }),
    ).toBeNull();
  });
});

describe("parsePushReceivedPayload", () => {
  it("normalizes foreground payload", () => {
    expect(
      parsePushReceivedPayload({
        type: "transaction_status_changed",
        transactionId: "1001",
      }),
    ).toEqual({
      type: "transaction_status_changed",
      transactionId: "1001",
      ticketId: undefined,
    });
  });
});
