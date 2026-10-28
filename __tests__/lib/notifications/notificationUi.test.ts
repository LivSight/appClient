import { MOCK_IN_APP_NOTIFICATIONS } from "@/lib/notifications/mockCatalog";
import {
  countUnreadNotifications,
  iconForNotificationKind,
  routeForNotification,
  sortNotificationsNewestFirst,
  type InAppNotification,
} from "@/lib/notifications/notificationUi";

function n(partial: Partial<InAppNotification> & Pick<InAppNotification, "id">): InAppNotification {
  return {
    kind: "general",
    title: "Titre",
    body: "Corps",
    createdAt: "2026-10-18T12:00:00.000Z",
    read: false,
    ...partial,
  };
}

describe("notificationUi", () => {
  it("countUnreadNotifications counts only unread items", () => {
    expect(
      countUnreadNotifications([
        n({ id: "1", read: false }),
        n({ id: "2", read: true }),
        n({ id: "3", read: false }),
      ]),
    ).toBe(2);
    expect(countUnreadNotifications([])).toBe(0);
  });

  it("sortNotificationsNewestFirst orders by createdAt desc", () => {
    const sorted = sortNotificationsNewestFirst([
      n({ id: "old", createdAt: "2026-10-16T10:00:00.000Z" }),
      n({ id: "new", createdAt: "2026-10-18T10:00:00.000Z" }),
      n({ id: "mid", createdAt: "2026-10-17T10:00:00.000Z" }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["new", "mid", "old"]);
  });

  it("iconForNotificationKind maps stock, daily/monthly report, promo", () => {
    expect(iconForNotificationKind("stock")).toContain("box");
    expect(iconForNotificationKind("report_daily")).toContain("notes");
    expect(iconForNotificationKind("report_monthly")).toContain("notes");
    expect(iconForNotificationKind("promo")).toContain("tag");
    expect(iconForNotificationKind("general")).toContain("bell");
  });

  it("routeForNotification maps kinds to app tabs with report period filter", () => {
    expect(routeForNotification(n({ id: "s", kind: "stock" }))).toEqual({ pathname: "/stock" });
    expect(routeForNotification(n({ id: "rd", kind: "report_daily" }))).toEqual({
      pathname: "/rapports",
      params: { range: "Journalier" },
    });
    expect(routeForNotification(n({ id: "rm", kind: "report_monthly" }))).toEqual({
      pathname: "/rapports",
      params: { range: "Mensuel" },
    });
    expect(routeForNotification(n({ id: "p", kind: "promo" }))).toEqual({ pathname: "/tarifs" });
    expect(routeForNotification(n({ id: "g", kind: "general" }))).toBeNull();
  });

  it("mock catalog samples cover stock, daily/monthly report and promo", () => {
    const kinds = new Set(MOCK_IN_APP_NOTIFICATIONS.map((x) => x.kind));
    expect(kinds.has("stock")).toBe(true);
    expect(kinds.has("report_daily")).toBe(true);
    expect(kinds.has("report_monthly")).toBe(true);
    expect(kinds.has("promo")).toBe(true);
  });
});
