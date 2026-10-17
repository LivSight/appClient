import type { Package } from "@/lib/api/packages";

export type ReportRange = "Journalier" | "Hier" | "Hebdo" | "Mensuel" | "Personnalisé";

export function dateRangeLabel(range: ReportRange): string {
  switch (range) {
    case "Journalier":
      return "Aujourd'hui";
    case "Hier":
      return "Hier";
    case "Hebdo":
      return "Cette semaine";
    case "Mensuel":
      return "Ce mois";
    case "Personnalisé":
      return "Personnalisé";
  }
}

export type ReportTransaction = {
  created_at?: string;
  type?: string;
  source?: string | null;
  status?: string;
  serviceLevel?: string | null;
  amount_due?: number;
  amount_paid?: number;
  delivery_fee?: number;
  amount?: number;
};

export type PeriodBounds = {
  start: Date;
  end: Date;
};

export type ServiceTypeCounts = {
  livraison: number;
  expedition: number;
  ramassage: number;
  course: number;
};

export type StatusBucketCounts = {
  delivered: number;
  injoignable: number;
  annule: number;
  enCours: number;
};

export type AccountingSums = {
  totalCmd: number;
  totalEncaisse: number;
  fraisLivraison: number;
  solde: number;
};

export type StockMetrics = {
  productsCount: number;
  qtyTotal: number;
};

function safeNumber(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function parseCreatedAt(iso?: string): Date | null {
  if (!iso) return null;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfDay(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

export function startOfWeekMonday(d: Date): Date {
  const dt = startOfDay(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return dt;
}

export function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function normalizeCustomDateRange(start: Date, end: Date): { start: Date; end: Date } {
  const a = startOfDay(start);
  const b = endOfDay(end);
  if (b.getTime() < a.getTime()) return { start: startOfDay(end), end: endOfDay(start) };
  return { start: a, end: b };
}

/** Previous period = same number of calendar days immediately before custom start. */
export function getCustomPeriodBounds(
  rangeStart: Date,
  rangeEnd: Date,
): { current: PeriodBounds; previous: PeriodBounds } {
  const { start, end } = normalizeCustomDateRange(rangeStart, rangeEnd);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayCount = Math.max(1, Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1);

  const previousEnd = endOfDay(new Date(start.getTime() - msPerDay));
  const previousStart = startOfDay(new Date(previousEnd.getTime() - (dayCount - 1) * msPerDay));

  return {
    current: { start, end },
    previous: { start: previousStart, end: previousEnd },
  };
}

export function resolveReportPeriodBounds(input: {
  range: ReportRange;
  now: Date;
  customStart?: Date;
  customEnd?: Date;
}): { current: PeriodBounds; previous: PeriodBounds } {
  if (input.range === "Personnalisé") {
    if (input.customStart && input.customEnd) {
      return getCustomPeriodBounds(input.customStart, input.customEnd);
    }
    return getPeriodBounds("Journalier", input.now);
  }
  if (
    input.range === "Journalier" ||
    input.range === "Hier" ||
    input.range === "Hebdo" ||
    input.range === "Mensuel"
  ) {
    return getPeriodBounds(input.range, input.now);
  }
  return getPeriodBounds("Journalier", input.now);
}

export function getPeriodBounds(
  range: Exclude<ReportRange, "Personnalisé">,
  now: Date,
): { current: PeriodBounds; previous: PeriodBounds } {
  if (range === "Journalier") {
    const currentStart = startOfDay(now);
    const currentEnd = endOfDay(now);
    const prevDay = new Date(currentStart);
    prevDay.setDate(prevDay.getDate() - 1);
    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: startOfDay(prevDay), end: endOfDay(prevDay) },
    };
  }

  if (range === "Hier") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(yesterday);
    dayBefore.setDate(dayBefore.getDate() - 1);
    return {
      current: { start: startOfDay(yesterday), end: endOfDay(yesterday) },
      previous: { start: startOfDay(dayBefore), end: endOfDay(dayBefore) },
    };
  }

  if (range === "Hebdo") {
    const currentStart = startOfWeekMonday(now);
    const currentEnd = endOfWeekSunday(now);
    const prevWeekEnd = new Date(currentStart);
    prevWeekEnd.setMilliseconds(-1);
    const previousEnd = endOfDay(prevWeekEnd);
    const previousStart = startOfWeekMonday(previousEnd);
    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    };
  }

  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  const previousStart = startOfMonth(previousEnd);
  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
}

export function filterTransactionsInRange(
  transactions: ReportTransaction[],
  bounds: PeriodBounds,
): ReportTransaction[] {
  return transactions.filter((t) => {
    const dt = parseCreatedAt(t.created_at);
    if (!dt) return false;
    return dt >= bounds.start && dt <= bounds.end;
  });
}

export function countServiceTypes(transactions: ReportTransaction[]): ServiceTypeCounts {
  let livraison = 0;
  let expedition = 0;
  let ramassage = 0;
  let course = 0;

  for (const t of transactions) {
    const type = norm(t.type);
    const source = norm(t.source);
    const level = norm(t.serviceLevel);

    if (type === "expedition") {
      expedition += 1;
    } else if (source === "pickup" || source === "pick_up" || type === "pickup") {
      ramassage += 1;
    } else if (type === "delivery") {
      livraison += 1;
    }

    if (level === "express") course += 1;
  }

  return { livraison, expedition, ramassage, course };
}

const INJOIGNABLE = new Set([
  "unreachable",
  "does_not_pick_up",
  "client_absent",
  "no_answer",
  "present_ne_decroche_zone1",
  "present_ne_decroche_zone2",
]);

const ANNULE = new Set(["failed", "cancelled", "canceled", "rejected", "expired", "aborted"]);

const DELIVERED = new Set(["delivered", "completed", "complete", "done", "success"]);

function isCompletedOrPickupType(t: ReportTransaction): boolean {
  const status = norm(t.status);
  const type = norm(t.type);
  return DELIVERED.has(status) || type === "pickup" || status === "pickup";
}

function isTerminalNoCollect(t: ReportTransaction): boolean {
  const status = norm(t.status);
  return ANNULE.has(status) || INJOIGNABLE.has(status);
}

function countsForDeliveryFee(t: ReportTransaction): boolean {
  const status = norm(t.status);
  const type = norm(t.type);
  return DELIVERED.has(status) || type === "pickup" || status === "pickup" || status === "client_absent";
}

export function statusBucketCounts(transactions: ReportTransaction[]): StatusBucketCounts {
  let delivered = 0;
  let injoignable = 0;
  let annule = 0;
  let enCours = 0;

  for (const t of transactions) {
    const status = norm(t.status);
    const type = norm(t.type);

    if (DELIVERED.has(status) && type !== "pickup" && status !== "pickup") {
      delivered += 1;
    } else if (INJOIGNABLE.has(status)) {
      injoignable += 1;
    } else if (ANNULE.has(status)) {
      annule += 1;
    } else {
      enCours += 1;
    }
  }

  return { delivered, injoignable, annule, enCours };
}

export function sumAccounting(transactions: ReportTransaction[]): AccountingSums {
  let totalCmd = 0;
  let totalEncaisse = 0;
  let fraisLivraison = 0;

  for (const t of transactions) {
    const due = safeNumber(t.amount_due);
    const paid = safeNumber(t.amount_paid);
    const fee = safeNumber(t.delivery_fee);

    if (due > 0) totalCmd += due;

    if (isCompletedOrPickupType(t)) {
      totalEncaisse += due;
    } else if (!isTerminalNoCollect(t)) {
      totalEncaisse += paid;
    }

    if (countsForDeliveryFee(t) && fee > 0) {
      fraisLivraison += fee;
    }
  }

  /** Solde = total encaissé − frais de livraison (net partenaire). */
  const solde = totalEncaisse - fraisLivraison;

  return { totalCmd, totalEncaisse, fraisLivraison, solde };
}

export function sumStockMetrics(packages: Package[]): StockMetrics {
  const productsCount = packages.length;
  const qtyTotal = packages.reduce((sum, p) => sum + safeNumber(p.quantity), 0);
  return { productsCount, qtyTotal };
}

export function formatXaf(n: number): string {
  const v = Math.max(0, Math.round(safeNumber(n)));
  return v.toLocaleString("fr-FR").replace(/\s/g, " ");
}

export function formatDeltaPct(current: number, prev: number): string {
  const denom = Math.max(prev, 1);
  const delta = Math.round(((current - prev) / denom) * 100);
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta}%`;
}

function formatDateLongFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDayMonthFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

function formatMonthYearFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function formatPeriodLabel(
  range: ReportRange,
  now: Date,
  custom?: { start: Date; end: Date },
): string {
  if (range === "Personnalisé" && custom) {
    const { start, end } = normalizeCustomDateRange(custom.start, custom.end);
    if (start.toDateString() === end.toDateString()) {
      return formatDateLongFr(start);
    }
    return `Du ${formatDateLongFr(start)} au ${formatDateLongFr(end)}`;
  }
  if (range === "Journalier") return `Aujourd’hui, ${formatDateLongFr(now)}`;
  if (range === "Hier") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return `Hier, ${formatDateLongFr(yesterday)}`;
  }
  if (range === "Mensuel") return formatMonthYearFr(now);
  if (range === "Personnalisé") return "Choisissez une période";
  const start = startOfWeekMonday(now);
  const end = endOfWeekSunday(now);
  return `Semaine du ${formatDayMonthFr(start)} au ${formatDateLongFr(end)}`;
}

export type FormattedReports = {
  totalCmd: string;
  totalCmdDelta: string;
  totalEncaisse: string;
  totalEncaisseDelta: string;
  resteAPercevoir: string;
  resteAPercevoirDelta: string;
  feesWithdrawn: string;
  feesWithdrawnDelta: string;
  stockProductsCount: string;
  stockProductsCountDelta: string;
  stockQtyTotal: string;
  stockQtyTotalDelta: string;
  totalSuffix: string;
};

export function aggregateReports(input: {
  range: ReportRange;
  now: Date;
  customStart?: Date;
  customEnd?: Date;
  transactions: ReportTransaction[];
  packages: Package[];
}): {
  current: ReportTransaction[];
  previous: ReportTransaction[];
  serviceTypes: ServiceTypeCounts;
  buckets: StatusBucketCounts;
  accounting: { current: AccountingSums; previous: AccountingSums };
  stock: StockMetrics;
  formatted: FormattedReports;
} {
  const bounds = resolveReportPeriodBounds({
    range: input.range,
    now: input.now,
    customStart: input.customStart,
    customEnd: input.customEnd,
  });
  const current = filterTransactionsInRange(input.transactions, bounds.current);
  const previous = filterTransactionsInRange(input.transactions, bounds.previous);

  const serviceTypes = countServiceTypes(current);
  const buckets = statusBucketCounts(current);
  const accountingCurrent = sumAccounting(current);
  const accountingPrevious = sumAccounting(previous);
  const stock = sumStockMetrics(input.packages);

  const formatted: FormattedReports = {
    totalCmd: formatXaf(accountingCurrent.totalCmd),
    totalCmdDelta: formatDeltaPct(accountingCurrent.totalCmd, accountingPrevious.totalCmd),
    totalEncaisse: formatXaf(accountingCurrent.totalEncaisse),
    totalEncaisseDelta: formatDeltaPct(accountingCurrent.totalEncaisse, accountingPrevious.totalEncaisse),
    resteAPercevoir: formatXaf(accountingCurrent.solde),
    resteAPercevoirDelta: formatDeltaPct(accountingCurrent.solde, accountingPrevious.solde),
    feesWithdrawn: formatXaf(accountingCurrent.fraisLivraison),
    feesWithdrawnDelta: formatDeltaPct(accountingCurrent.fraisLivraison, accountingPrevious.fraisLivraison),
    stockProductsCount: String(stock.productsCount),
    stockProductsCountDelta: "—",
    stockQtyTotal: String(stock.qtyTotal),
    stockQtyTotalDelta: "—",
    totalSuffix: "FCFA",
  };

  return {
    current,
    previous,
    serviceTypes,
    buckets,
    accounting: { current: accountingCurrent, previous: accountingPrevious },
    stock,
    formatted,
  };
}
