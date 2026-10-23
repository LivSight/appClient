export type InAppNotificationKind =
  | "stock"
  | "report_daily"
  | "report_monthly"
  | "promo"
  | "general";

export type InAppNotification = {
  id: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type InAppNotificationRoute = {
  pathname: "/stock" | "/rapports" | "/tarifs";
  /** Applied on Rapports (e.g. Journalier / Mensuel). */
  params?: { range: "Journalier" | "Mensuel" };
};

export function countUnreadNotifications(items: readonly InAppNotification[]): number {
  return items.reduce((n, item) => (item.read ? n : n + 1), 0);
}

export function sortNotificationsNewestFirst(
  items: readonly InAppNotification[],
): InAppNotification[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function iconForNotificationKind(kind: InAppNotificationKind): string {
  switch (kind) {
    case "stock":
      return "solar:box-bold";
    case "report_daily":
    case "report_monthly":
      return "solar:notes-outline";
    case "promo":
      return "solar:tag-outline";
    case "general":
    default:
      return "solar:bell-outline";
  }
}

export function routeForNotification(item: InAppNotification): InAppNotificationRoute | null {
  switch (item.kind) {
    case "stock":
      return { pathname: "/stock" };
    case "report_daily":
      return { pathname: "/rapports", params: { range: "Journalier" } };
    case "report_monthly":
      return { pathname: "/rapports", params: { range: "Mensuel" } };
    case "promo":
      return { pathname: "/tarifs" };
    case "general":
    default:
      return null;
  }
}
