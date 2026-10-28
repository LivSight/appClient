import { API_BASE_URL } from "@/lib/config/api";
import { apiFetch } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import type { InAppNotification, InAppNotificationKind } from "@/lib/notifications/notificationUi";

export type ProductNotificationListResult = {
  items: InAppNotification[];
  unreadCount: number;
  nextCursor: string | null;
};

const KINDS = new Set<InAppNotificationKind>([
  "stock",
  "report_daily",
  "report_monthly",
  "promo",
  "general",
]);

function parseResponseText(rawText: string): unknown {
  if (!rawText.length) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function errorMessageFrom(status: number, data: unknown, rawText: string): string {
  if (data && typeof data === "object" && data !== null) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (typeof data === "string" && data.trim()) return data.trim();
  if (rawText.trim()) return rawText.trim();
  return `HTTP ${status}`;
}

export function parseProductNotificationKind(raw: unknown): InAppNotificationKind | null {
  const kind = String(raw ?? "").trim() as InAppNotificationKind;
  return KINDS.has(kind) ? kind : null;
}

export function mapProductNotificationItem(raw: unknown): InAppNotification | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const kind = parseProductNotificationKind(record.kind);
  const title = String(record.title ?? "").trim();
  const body = String(record.body ?? "").trim();
  const createdAt = String(record.createdAt ?? "").trim();
  if (!id || !kind || !title || !createdAt) return null;
  return {
    id,
    kind,
    title,
    body,
    createdAt,
    read: Boolean(record.read),
  };
}

export async function listProductNotifications(options?: {
  limit?: number;
  cursor?: string;
}): Promise<ProductNotificationListResult> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const qs = params.toString();
  const url = `${API_BASE_URL}/api/notifications${qs ? `?${qs}` : ""}`;
  logger.info("notifications", "GET /api/notifications", { url });

  const res = await apiFetch(url);
  const rawText = await res.text();
  const data = parseResponseText(rawText);
  if (!res.ok) {
    logger.warn("notifications", "GET /api/notifications failed", { status: res.status, body: rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems
    .map((item) => mapProductNotificationItem(item))
    .filter((item): item is InAppNotification => item != null);
  const unreadCount = Number(record.unreadCount);
  const nextCursor =
    typeof record.nextCursor === "string" && record.nextCursor.trim()
      ? record.nextCursor.trim()
      : null;

  return {
    items,
    unreadCount: Number.isFinite(unreadCount) ? Math.max(0, Math.round(unreadCount)) : 0,
    nextCursor,
  };
}

export async function getProductNotificationUnreadCount(): Promise<number> {
  const res = await apiFetch(`${API_BASE_URL}/api/notifications/unread-count`);
  const rawText = await res.text();
  const data = parseResponseText(rawText);
  if (!res.ok) throw new Error(errorMessageFrom(res.status, data, rawText));
  const unreadCount = Number(
    data && typeof data === "object" ? (data as { unreadCount?: unknown }).unreadCount : NaN,
  );
  return Number.isFinite(unreadCount) ? Math.max(0, Math.round(unreadCount)) : 0;
}

export async function markProductNotificationRead(id: string): Promise<void> {
  const safeId = encodeURIComponent(String(id).trim());
  const res = await apiFetch(`${API_BASE_URL}/api/notifications/${safeId}/read`, {
    method: "POST",
  });
  if (res.status === 204 || res.ok) return;
  const rawText = await res.text();
  const data = parseResponseText(rawText);
  throw new Error(errorMessageFrom(res.status, data, rawText));
}

export async function markAllProductNotificationsRead(): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: "POST",
  });
  if (res.status === 204 || res.ok) return;
  const rawText = await res.text();
  const data = parseResponseText(rawText);
  throw new Error(errorMessageFrom(res.status, data, rawText));
}
