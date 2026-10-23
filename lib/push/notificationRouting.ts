import type { Notification } from "expo-notifications";

export type ClientPushType =
  | "transaction_created"
  | "driver_assigned"
  | "driver_reassigned"
  | "driver_cleared"
  | "transaction_status_changed"
  | "delivery_fee_finalized"
  | "delivery_rescheduled"
  | "delivery_today_reminder"
  | "ticket_message"
  | "stock_updated"
  | "report_daily_ready"
  | "report_monthly_ready"
  | "promo"
  | "general";

export type ClientPushRoute =
  | { screen: "inbox"; transactionId: string; ticketId?: string }
  | { screen: "detail"; transactionId: string }
  | { screen: "stock" }
  | { screen: "rapports"; range: "Journalier" | "Mensuel" }
  | { screen: "tarifs" }
  | { screen: "notifications" };

export type PushReceivedPayload = {
  type: ClientPushType | string;
  transactionId?: string;
  ticketId?: string;
};

export type TicketMessageNotificationRoute = {
  transactionId: string;
  ticketId?: string;
};

const TRANSACTION_PUSH_TYPES = new Set<ClientPushType>([
  "transaction_created",
  "driver_assigned",
  "driver_reassigned",
  "driver_cleared",
  "transaction_status_changed",
  "delivery_fee_finalized",
  "delivery_rescheduled",
  "delivery_today_reminder",
]);

const PRODUCT_PUSH_TYPES = new Set<ClientPushType>([
  "stock_updated",
  "report_daily_ready",
  "report_monthly_ready",
  "promo",
  "general",
]);

function parseStringId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function parseClientPushType(data: Record<string, unknown> | null | undefined): ClientPushType | null {
  if (!data || typeof data !== "object") return null;
  const type = String(data.type ?? "").trim();
  if (!type.length) return null;
  if (
    type === "transaction_created" ||
    type === "driver_assigned" ||
    type === "driver_reassigned" ||
    type === "driver_cleared" ||
    type === "transaction_status_changed" ||
    type === "delivery_fee_finalized" ||
    type === "delivery_rescheduled" ||
    type === "delivery_today_reminder" ||
    type === "ticket_message" ||
    type === "stock_updated" ||
    type === "report_daily_ready" ||
    type === "report_monthly_ready" ||
    type === "promo" ||
    type === "general"
  ) {
    return type;
  }
  return null;
}

export function isProductPushType(type: string | null | undefined): boolean {
  if (!type) return false;
  return PRODUCT_PUSH_TYPES.has(type as ClientPushType);
}

export function resolveProductPushRoute(type: ClientPushType): ClientPushRoute | null {
  switch (type) {
    case "stock_updated":
      return { screen: "stock" };
    case "report_daily_ready":
      return { screen: "rapports", range: "Journalier" };
    case "report_monthly_ready":
      return { screen: "rapports", range: "Mensuel" };
    case "promo":
      return { screen: "tarifs" };
    case "general":
      return { screen: "notifications" };
    default:
      return null;
  }
}

export function isTransactionPushType(type: string | null | undefined): boolean {
  if (!type) return false;
  return TRANSACTION_PUSH_TYPES.has(type as ClientPushType);
}

/**
 * Parse delivery / transaction id from Expo Push `data` (align with backend payload).
 */
export function parseDeliveryIdFromNotificationData(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data || typeof data !== "object") return null;

  const transactionId = parseStringId(data.transactionId ?? data.transaction_id);
  if (transactionId) return transactionId;

  const raw = parseStringId(data.deliveryId ?? data.delivery_id);
  if (raw) return raw;

  const url = data.url;
  if (typeof url === "string") {
    const transactionMatch = url.match(/\/transactions\/([^/?#]+)/);
    if (transactionMatch?.[1]) return transactionMatch[1];

    const legacyMatch = url.match(/livraison-detail\/([^/?#]+)/);
    if (legacyMatch?.[1]) return legacyMatch[1];

    const expeditionMatch = url.match(/expedition-detail\/([^/?#]+)/);
    if (expeditionMatch?.[1]) return expeditionMatch[1];
  }

  return null;
}

function parseTicketIdFromNotificationData(data: Record<string, unknown>): string | undefined {
  const ticketId = parseStringId(data.ticketId ?? data.ticket_id);
  return ticketId ?? undefined;
}

export function resolveClientPushRoute(
  data: Record<string, unknown> | null | undefined,
): ClientPushRoute | null {
  if (!data || typeof data !== "object") return null;

  const type = parseClientPushType(data);

  if (type === "ticket_message") {
    const channel = String(data.channel ?? "client").trim().toLowerCase();
    if (channel === "driver") return null;

    const transactionId = parseDeliveryIdFromNotificationData(data);
    if (!transactionId) return null;

    return {
      screen: "inbox",
      transactionId,
      ticketId: parseTicketIdFromNotificationData(data),
    };
  }

  if (type && isProductPushType(type)) {
    return resolveProductPushRoute(type);
  }

  if (type && isTransactionPushType(type)) {
    const transactionId = parseDeliveryIdFromNotificationData(data);
    if (!transactionId) return null;
    return { screen: "detail", transactionId };
  }

  const fallbackTransactionId = parseDeliveryIdFromNotificationData(data);
  if (fallbackTransactionId) {
    return { screen: "detail", transactionId: fallbackTransactionId };
  }

  return null;
}

/**
 * Client app: route `ticket_message` pushes to inbox when channel is `client`.
 */
export function parseTicketMessageNotificationRoute(
  data: Record<string, unknown> | null | undefined,
): TicketMessageNotificationRoute | null {
  const route = resolveClientPushRoute(data);
  if (!route || route.screen !== "inbox") return null;
  return { transactionId: route.transactionId, ticketId: route.ticketId };
}

export function parsePushReceivedPayload(
  data: Record<string, unknown> | null | undefined,
): PushReceivedPayload | null {
  if (!data || typeof data !== "object") return null;

  const type = parseClientPushType(data) ?? String(data.type ?? "").trim();
  if (!type.length) return null;

  return {
    type,
    transactionId: parseDeliveryIdFromNotificationData(data) ?? undefined,
    ticketId: parseTicketIdFromNotificationData(data),
  };
}

export function getDataFromNotification(
  n: Notification,
): Record<string, unknown> | undefined {
  const c = n.request.content;
  const data = c.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return undefined;
}

export function shouldRefreshLivraisonList(payload: PushReceivedPayload): boolean {
  if (shouldSuppressClientPushPresentation(String(payload.type))) return false;
  return isTransactionPushType(String(payload.type));
}

export function shouldRefreshConversations(payload: PushReceivedPayload): boolean {
  return payload.type === "ticket_message";
}

export function shouldRefreshInAppNotifications(payload: PushReceivedPayload): boolean {
  return isProductPushType(String(payload.type));
}

/**
 * Temporary client-side mute: hide banner/sound and skip tap routing.
 * Backend may still send the push; we do not surface `driver_reassigned` for now.
 */
export function shouldSuppressClientPushPresentation(
  input: string | Record<string, unknown> | null | undefined,
): boolean {
  const type =
    typeof input === "string"
      ? input.trim()
      : input && typeof input === "object"
        ? String(input.type ?? "").trim()
        : "";
  return type === "driver_reassigned";
}

export function matchesOpenTransaction(
  payload: PushReceivedPayload,
  openTransactionId: string | null | undefined,
): boolean {
  if (!openTransactionId?.trim() || !payload.transactionId) return false;
  return payload.transactionId.trim() === openTransactionId.trim();
}
