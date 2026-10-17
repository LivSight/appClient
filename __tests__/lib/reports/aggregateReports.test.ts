import {
  aggregateReports,
  countServiceTypes,
  dateRangeLabel,
  filterTransactionsInRange,
  formatPeriodLabel,
  getCustomPeriodBounds,
  getPeriodBounds,
  normalizeCustomDateRange,
  resolveReportPeriodBounds,
  statusBucketCounts,
  sumAccounting,
  sumStockMetrics,
  type ReportTransaction,
} from "@/lib/reports/aggregateReports";

/** Local calendar date — avoids TZ flakiness vs UTC ISO strings. */
const NOW = new Date(2026, 4, 30, 14, 0, 0);

function tx(overrides: Partial<ReportTransaction> = {}): ReportTransaction {
  return {
    created_at: "2026-05-30T10:00:00.000Z",
    type: "delivery",
    source: "stock",
    status: "pending",
    amount_due: 0,
    amount_paid: 0,
    delivery_fee: 0,
    ...overrides,
  };
}

describe("aggregateReports", () => {
  describe("getPeriodBounds", () => {
    it("Journalier uses today and yesterday", () => {
      const { current, previous } = getPeriodBounds("Journalier", NOW);
      expect(current.start.getFullYear()).toBe(2026);
      expect(current.start.getMonth()).toBe(4);
      expect(current.start.getDate()).toBe(30);
      expect(previous.start.getDate()).toBe(29);
    });

    it("Mensuel uses current month and previous month", () => {
      const { current, previous } = getPeriodBounds("Mensuel", NOW);
      expect(current.start.getMonth()).toBe(4);
      expect(current.start.getFullYear()).toBe(2026);
      expect(previous.start.getMonth()).toBe(3);
    });

    it("Hier uses yesterday and the day before", () => {
      const { current, previous } = getPeriodBounds("Hier", NOW);
      expect(current.start.getDate()).toBe(29);
      expect(current.end.getDate()).toBe(29);
      expect(previous.start.getDate()).toBe(28);
      expect(previous.end.getDate()).toBe(28);
    });
  });

  describe("dateRangeLabel", () => {
    it("returns short labels for preset ranges", () => {
      expect(dateRangeLabel("Journalier")).toBe("Aujourd'hui");
      expect(dateRangeLabel("Hier")).toBe("Hier");
      expect(dateRangeLabel("Hebdo")).toBe("Cette semaine");
      expect(dateRangeLabel("Mensuel")).toBe("Ce mois");
      expect(dateRangeLabel("Personnalisé")).toBe("Personnalisé");
    });
  });

  describe("formatPeriodLabel", () => {
    it("formats Hier with yesterday date", () => {
      const label = formatPeriodLabel("Hier", NOW);
      expect(label).toContain("Hier");
      expect(label).toContain("29");
      expect(label).toContain("mai");
    });
  });

  describe("custom date range", () => {
    it("normalizeCustomDateRange swaps inverted dates", () => {
      const { start, end } = normalizeCustomDateRange(
        new Date(2026, 4, 20),
        new Date(2026, 4, 10),
      );
      expect(start.getDate()).toBe(10);
      expect(end.getDate()).toBe(20);
    });

    it("getCustomPeriodBounds compares to prior window of equal length", () => {
      const { current, previous } = getCustomPeriodBounds(
        new Date(2026, 4, 10),
        new Date(2026, 4, 12),
      );
      expect(current.start.getDate()).toBe(10);
      expect(current.end.getDate()).toBe(12);
      expect(previous.end.getDate()).toBe(9);
      expect(previous.start.getDate()).toBe(7);
    });

    it("resolveReportPeriodBounds uses custom dates when range is Personnalisé", () => {
      const { current } = resolveReportPeriodBounds({
        range: "Personnalisé",
        now: NOW,
        customStart: new Date(2026, 4, 5),
        customEnd: new Date(2026, 4, 7),
      });
      expect(current.start.getDate()).toBe(5);
      expect(current.end.getDate()).toBe(7);
    });
  });

  describe("filterTransactionsInRange", () => {
    it("includes rows whose created_at falls in [start, end]", () => {
      const bounds = getPeriodBounds("Journalier", NOW);
      const rows = [
        tx({ created_at: new Date(2026, 4, 30, 10, 0, 0).toISOString() }),
        tx({ created_at: new Date(2026, 4, 29, 10, 0, 0).toISOString() }),
        tx({ created_at: new Date(2026, 4, 28, 10, 0, 0).toISOString() }),
      ];
      const inCurrent = filterTransactionsInRange(rows, bounds.current);
      expect(inCurrent).toHaveLength(1);
    });
  });

  describe("countServiceTypes", () => {
    it("counts delivery, expedition, ramassage, and express course", () => {
      const counts = countServiceTypes([
        tx({ type: "delivery", source: "stock" }),
        tx({ type: "expedition", source: "stock" }),
        tx({ type: "delivery", source: "pickup" }),
        tx({ type: "delivery", source: "stock", serviceLevel: "express" }),
      ]);
      expect(counts.livraison).toBe(2);
      expect(counts.expedition).toBe(1);
      expect(counts.ramassage).toBe(1);
      expect(counts.course).toBe(1);
    });
  });

  describe("statusBucketCounts", () => {
    it("maps backend statuses to UI buckets", () => {
      const buckets = statusBucketCounts([
        tx({ status: "completed" }),
        tx({ status: "unreachable" }),
        tx({ status: "failed" }),
        tx({ status: "pending" }),
      ]);
      expect(buckets.delivered).toBe(1);
      expect(buckets.injoignable).toBe(1);
      expect(buckets.annule).toBe(1);
      expect(buckets.enCours).toBe(1);
    });
  });

  describe("sumAccounting", () => {
    it("computes solde as total encaissé minus frais de livraison", () => {
      const sums = sumAccounting([
        tx({ status: "completed", amount_due: 15000, amount_paid: 13500, delivery_fee: 1500 }),
        tx({ status: "pending", amount_due: 4000, amount_paid: 0, delivery_fee: 0 }),
      ]);
      expect(sums.totalCmd).toBe(19000);
      expect(sums.totalEncaisse).toBe(15000);
      expect(sums.fraisLivraison).toBe(1500);
      expect(sums.solde).toBe(15000 - 1500);
    });
  });

  describe("sumStockMetrics", () => {
    it("counts products and total quantity", () => {
      const stock = sumStockMetrics([
        { package_name: "A", description: "", quantity: 3, defective_quantity: 0, user_id: 1 },
        { package_name: "B", description: "", quantity: 5, defective_quantity: 0, user_id: 1 },
      ]);
      expect(stock.productsCount).toBe(2);
      expect(stock.qtyTotal).toBe(8);
    });
  });

  describe("aggregateReports", () => {
    it("builds formatted metrics for current vs previous period", () => {
      const transactions = [
        tx({
          created_at: new Date(2026, 4, 30, 11, 0, 0).toISOString(),
          status: "completed",
          amount_due: 10000,
          amount_paid: 9000,
          delivery_fee: 1000,
        }),
        tx({
          created_at: new Date(2026, 4, 29, 11, 0, 0).toISOString(),
          status: "completed",
          amount_due: 5000,
          amount_paid: 4500,
          delivery_fee: 500,
        }),
      ];
      const result = aggregateReports({
        range: "Journalier",
        now: NOW,
        transactions,
        packages: [{ package_name: "Sac", description: "", quantity: 2, defective_quantity: 0, user_id: 1 }],
      });

      expect(result.serviceTypes.livraison).toBeGreaterThanOrEqual(0);
      expect(result.formatted.totalEncaisse).toMatch(/\d/);
      expect(result.formatted.stockProductsCount).toBe("1");
      expect(result.formatted.stockQtyTotal).toBe("2");
    });
  });
});
