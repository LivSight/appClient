import type { TransactionCardItem } from "@/components/TransactionCard";
import {
  getTransactionNavigationId,
  mapTxnStatusToUi,
  type Transaction,
  type UiStatusBucket,
} from "@/lib/api/transactions";
import { formatDbText } from "@/lib/formatDisplayText";
import { formatScheduledDeliveryLabel } from "@/lib/scheduling/deliveryDate";

export type TransactionStatusFilter = "Tout" | "Planifiée" | "En cours" | "Livré" | "Annulé";

export type TransactionDateFilter = "Toutes dates" | "Aujourd'hui" | "Hier" | "7 derniers jours" | "30 derniers jours";

export const TRANSACTION_DATE_FILTERS: TransactionDateFilter[] = [
  "Toutes dates",
  "Aujourd'hui",
  "Hier",
  "7 derniers jours",
  "30 derniers jours",
];

export type DateFilterBounds = { start: number; end: number };

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

/** Inclusive local-time window for a transaction date filter, or null for all dates. */
export function getDateFilterBounds(filter: TransactionDateFilter, now: number = Date.now()): DateFilterBounds | null {
  if (filter === "Toutes dates") return null;

  const anchor = new Date(now);
  if (filter === "Aujourd'hui") {
    return { start: startOfDayMs(anchor), end: endOfDayMs(anchor) };
  }
  if (filter === "Hier") {
    const yesterday = new Date(anchor);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: startOfDayMs(yesterday), end: endOfDayMs(yesterday) };
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const start = filter === "7 derniers jours" ? now - 7 * DAY_MS : now - 30 * DAY_MS;
  return { start, end: now };
}

/** Start of the filter window in ms, or null when the filter keeps everything. */
export function dateFilterStartMs(filter: TransactionDateFilter, now: number = Date.now()): number | null {
  return getDateFilterBounds(filter, now)?.start ?? null;
}

export function filterCardItemsByDate(
  items: TransactionCardItem[],
  filter: TransactionDateFilter,
  now: number = Date.now(),
): TransactionCardItem[] {
  const bounds = getDateFilterBounds(filter, now);
  if (bounds == null) return items;
  return items.filter(
    (item) =>
      item.createdAtMs != null && item.createdAtMs >= bounds.start && item.createdAtMs <= bounds.end,
  );
}

export function formatTransactionDateLabel(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function scheduledDeliveryLabelFromTransaction(tx: Transaction): string | undefined {
  const iso = String(tx.scheduled_delivery_date ?? "").trim();
  if (!iso.length) return undefined;
  return formatScheduledDeliveryLabel(iso);
}

export function formatTransactionAmountLabel(amount?: number): string {
  const n = Number.isFinite(Number(amount)) ? Math.max(0, Math.round(Number(amount))) : 0;
  return `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
}

/** Service kind from backend `type`. Legacy rows used `pickup` for Ramassage livraisons. */
export function serviceLabelFromType(type?: string): string | undefined {
  const t = String(type ?? "").trim().toLowerCase();
  if (t === "expedition") return "Expédition";
  if (t === "delivery" || t === "livraison") return "Livraison";
  if (t === "pickup") return "Livraison";
  return undefined;
}

function isRamassageDescription(description?: string): boolean {
  return String(description ?? "").trim().toLowerCase().startsWith("ramassage:");
}

/** Fulfillment from backend `source`, with fallbacks when GET omits source. */
export function sourceLabelFromTransaction(tx: Transaction): string | undefined {
  const source = String(tx.source ?? "").trim().toLowerCase();
  if (source === "pick_up" || source === "pickup") return "Ramassage";
  if (source === "instocke" || source === "in_stock" || source === "stock") return "En stock";

  if (isRamassageDescription(tx.description)) return "Ramassage";

  if (tx.mode === "pickup") return "Ramassage";
  if (tx.mode === "stock") return "En stock";

  const type = String(tx.type ?? "").trim().toLowerCase();
  if (type === "pickup") return "Ramassage";

  return undefined;
}

export function isExpeditionType(type?: string): boolean {
  return String(type ?? "").trim().toLowerCase() === "expedition";
}

export function statusLabelFromBucket(status: UiStatusBucket): string {
  return status;
}

export function isCollectingCash(tx: Transaction): boolean {
  if (typeof tx.cash_collect === "boolean") return tx.cash_collect;
  if (typeof tx.collect_cash === "boolean") return tx.collect_cash;
  return Number(tx.amount ?? 0) > 0;
}

export function formatTransactionRef(tx: Transaction): string {
  const reference = String(tx.transactionReference ?? "").trim();
  if (reference.length) return reference;
  const id = tx.id != null ? String(tx.id).trim() : "";
  if (id.length) return `TR-${id}`;
  return "—";
}

export function expressLabelFromTransaction(tx: Transaction): string | undefined {
  const level = String(tx.serviceLevel ?? "").trim().toLowerCase();
  if (level === "express" || tx.express) return "Express";
  return undefined;
}

/** Single uppercase label for inbox banner (legacy combined display). */
export function inboxCategoryBannerLabel(tx: Transaction): string {
  if (isExpeditionType(tx.type)) return "EXPÉDITION";
  const source = sourceLabelFromTransaction(tx);
  if (source === "Ramassage") return "RAMASSAGE";
  if (source === "En stock") return "EN STOCK";
  const service = serviceLabelFromType(tx.type);
  if (service === "Livraison") return "LIVRAISON";
  return "COURSE";
}

function formatProductTitle(packageName: string, qty: number): string {
  const titleBase = formatDbText(packageName) || "Colis";
  return qty > 1 && !titleBase.toLowerCase().includes("x") ? `${titleBase} x${qty}` : titleBase;
}

function extractQuartier(tx: Transaction): string {
  const destStreet =
    typeof tx.destination?.street === "string" ? tx.destination.street : String(tx.destination_street ?? "");
  const fromStreet = destStreet.split("—")[0]?.trim() || destStreet.trim();
  if (fromStreet.length) return formatDbText(fromStreet);

  const city =
    typeof tx.destination?.city === "string" ? tx.destination.city.trim() : String(tx.destination_city ?? "").trim();
  if (city.length) return formatDbText(city);

  const receiver =
    String(tx.receiver_name ?? tx.receiverData?.name ?? "").trim();
  if (receiver.length) return formatDbText(receiver);

  return "—";
}

export function mapTransactionToCardItem(tx: Transaction): TransactionCardItem {
  const id = getTransactionNavigationId(tx);
  const qty = Number.isFinite(Number(tx.quantity)) ? Math.max(1, Math.floor(Number(tx.quantity))) : 1;
  const title = formatProductTitle(String(tx.package_name ?? "Colis"), qty);
  const quartier = extractQuartier(tx);
  const status = mapTxnStatusToUi(tx.status);
  const collectingCash = isCollectingCash(tx);
  const amount = Number(tx.amount ?? 0);
  const dateLabel = formatTransactionDateLabel(tx.created_at);
  const scheduledLabel = scheduledDeliveryLabelFromTransaction(tx);

  let serviceLabel = serviceLabelFromType(tx.type);
  let sourceLabel = sourceLabelFromTransaction(tx);

  if (serviceLabel && sourceLabel && serviceLabel.toLowerCase() === sourceLabel.toLowerCase()) {
    sourceLabel = undefined;
  }

  return {
    id,
    ref: formatTransactionRef(tx),
    title,
    quartier,
    dateLabel: dateLabel || "—",
    createdAtMs: transactionSortTimestamp(tx),
    status,
    statusLabel: statusLabelFromBucket(status),
    amountLabel: collectingCash ? formatTransactionAmountLabel(amount) : undefined,
    paymentLabel: collectingCash ? "ESPÈCES" : undefined,
    serviceLabel,
    sourceLabel,
    expressLabel: expressLabelFromTransaction(tx),
    isExpedition: isExpeditionType(tx.type),
    scheduledLabel,
  };
}

export function filterTransactionsForUser(txns: Transaction[], userId: number | null): Transaction[] {
  if (userId == null) return txns;
  return txns.filter((tx) => {
    const ownerId = Number(tx.user_id);
    if (!Number.isFinite(ownerId)) return true;
    return ownerId === userId;
  });
}

function transactionSortTimestamp(tx: Transaction): number | null {
  for (const field of [tx.created_at, tx.updated_at]) {
    const parsed = Date.parse(String(field ?? ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function sortTransactionsForDisplay(txns: Transaction[]): Transaction[] {
  return txns
    .map((tx, index) => ({ tx, index }))
    .sort((a, b) => {
      const aTime = transactionSortTimestamp(a.tx);
      const bTime = transactionSortTimestamp(b.tx);

      if (aTime != null && bTime != null && aTime !== bTime) {
        return bTime - aTime;
      }
      if (aTime != null && bTime == null) return -1;
      if (aTime == null && bTime != null) return 1;

      return b.index - a.index;
    })
    .map(({ tx }) => tx);
}

export function filterCardItemsByStatus(
  items: TransactionCardItem[],
  filter: TransactionStatusFilter,
): TransactionCardItem[] {
  if (filter === "Tout") return items;
  return items.filter((item) => item.status === filter);
}

export function transactionsToCardItems(txns: Transaction[]): TransactionCardItem[] {
  return sortTransactionsForDisplay(txns)
    .map(mapTransactionToCardItem)
    .filter((item) => item.id.length > 0);
}
