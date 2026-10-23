import type { InAppNotification } from "./notificationUi";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Seed data until the backend exposes an in-app notification feed. */
export const MOCK_IN_APP_NOTIFICATIONS: InAppNotification[] = [
  {
    id: "mock-stock-1",
    kind: "stock",
    title: "Votre stock a été mis à jour",
    body: "Les quantités de vos produits ont été actualisées.",
    createdAt: hoursAgo(2),
    read: false,
  },
  {
    id: "mock-report-daily-1",
    kind: "report_daily",
    title: "Votre rapport quotidien est disponible",
    body: "Le rapport du jour est prêt à consulter.",
    createdAt: hoursAgo(6),
    read: false,
  },
  {
    id: "mock-report-monthly-1",
    kind: "report_monthly",
    title: "Votre rapport mensuel est disponible",
    body: "Le bilan du mois est prêt à consulter.",
    createdAt: daysAgo(2),
    read: false,
  },
  {
    id: "mock-promo-1",
    kind: "promo",
    title: "Promotion livraison express",
    body: "Profitez d’un tarif avantageux sur la livraison express cette semaine.",
    createdAt: daysAgo(1),
    read: true,
  },
];
