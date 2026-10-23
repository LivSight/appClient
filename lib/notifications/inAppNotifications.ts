import {
  getProductNotificationUnreadCount,
  listProductNotifications,
  markProductNotificationRead,
} from "@/lib/api/productNotifications";
import type { InAppNotification } from "./notificationUi";

/** Lists in-app product notifications from the gateway. */
export async function listInAppNotifications(): Promise<InAppNotification[]> {
  const result = await listProductNotifications({ limit: 50 });
  return result.items;
}

export async function getUnreadInAppNotificationCount(): Promise<number> {
  return getProductNotificationUnreadCount();
}

export async function markInAppNotificationRead(id: string): Promise<void> {
  await markProductNotificationRead(id);
}
