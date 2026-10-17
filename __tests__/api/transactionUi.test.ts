import {
  filterCardItemsByDate,
  filterCardItemsByStatus,
  filterTransactionsForUser,
  mapTransactionToCardItem,
  scheduledDeliveryLabelFromTransaction,
  serviceLabelFromType,
  sourceLabelFromTransaction,
  sortTransactionsForDisplay,
} from "@/lib/api/transactionUi";
import type { Transaction } from "@/lib/api/transactions";
import type { TransactionCardItem } from "@/components/TransactionCard";

const baseTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  package_name: "Sac",
  type: "pickup",
  status: "pending",
  transactionReference: "LVS-AAAA111111",
  user_id: 3,
  amount: 0,
  destination: { street: "Makepe — Yaoundé" },
  ...overrides,
});

describe("transactionUi", () => {
  describe("serviceLabelFromType", () => {
    it("maps delivery, expedition, and legacy pickup", () => {
      expect(serviceLabelFromType("delivery")).toBe("Livraison");
      expect(serviceLabelFromType("expedition")).toBe("Expédition");
      expect(serviceLabelFromType("pickup")).toBe("Livraison");
    });
  });

  describe("sourceLabelFromTransaction", () => {
    it("prefers backend source over type", () => {
      expect(sourceLabelFromTransaction(baseTx({ source: "pickup", type: "delivery" }))).toBe("Ramassage");
      expect(sourceLabelFromTransaction(baseTx({ source: "stock", type: "delivery" }))).toBe("En stock");
      expect(sourceLabelFromTransaction(baseTx({ source: "pick_up", type: "delivery" }))).toBe("Ramassage");
      expect(sourceLabelFromTransaction(baseTx({ source: "instocke", type: "delivery" }))).toBe("En stock");
    });

    it("uses Ramassage: description prefix when source is null", () => {
      expect(
        sourceLabelFromTransaction(
          baseTx({ source: null, type: "delivery", description: "Ramassage: Mimboman — Sac" }),
        ),
      ).toBe("Ramassage");
    });

    it("falls back to mode then legacy type pickup when source is null", () => {
      expect(sourceLabelFromTransaction(baseTx({ source: null, type: "pickup", mode: undefined }))).toBe("Ramassage");
      expect(sourceLabelFromTransaction(baseTx({ source: null, type: "delivery", mode: "stock" }))).toBe("En stock");
    });
  });

  describe("mapTransactionToCardItem", () => {
    it("maps delivery + stock to two distinct pills", () => {
      const item = mapTransactionToCardItem(baseTx({ type: "delivery", source: "stock" }));
      expect(item.serviceLabel).toBe("Livraison");
      expect(item.sourceLabel).toBe("En stock");
    });

    it("maps delivery + pickup to Livraison and Ramassage", () => {
      const item = mapTransactionToCardItem(baseTx({ type: "delivery", source: "pickup" }));
      expect(item.serviceLabel).toBe("Livraison");
      expect(item.sourceLabel).toBe("Ramassage");
    });

    it("maps delivery + legacy instocke to two distinct pills", () => {
      const item = mapTransactionToCardItem(baseTx({ type: "delivery", source: "instocke" }));
      expect(item.serviceLabel).toBe("Livraison");
      expect(item.sourceLabel).toBe("En stock");
      expect(item.isExpedition).toBe(false);
    });

    it("maps delivery + legacy pick_up to Livraison and Ramassage", () => {
      const item = mapTransactionToCardItem(baseTx({ type: "delivery", source: "pick_up" }));
      expect(item.serviceLabel).toBe("Livraison");
      expect(item.sourceLabel).toBe("Ramassage");
    });

    it("maps expedition + pickup to Expédition and Ramassage", () => {
      const item = mapTransactionToCardItem(baseTx({ type: "expedition", source: "pickup", transactionReference: "LVS-EXP" }));
      expect(item.serviceLabel).toBe("Expédition");
      expect(item.sourceLabel).toBe("Ramassage");
      expect(item.isExpedition).toBe(true);
    });

    it("maps legacy type pickup (Fort/Sac) to Livraison and Ramassage", () => {
      const item = mapTransactionToCardItem(
        baseTx({
          type: "pickup",
          source: null,
          package_name: "Fort",
          description: "Ramassage: Mimboman — Sac",
        }),
      );
      expect(item.serviceLabel).toBe("Livraison");
      expect(item.sourceLabel).toBe("Ramassage");
    });

    it("maps delivery with Ramassage description to Livraison and Ramassage", () => {
      const item = mapTransactionToCardItem(
        baseTx({
          type: "delivery",
          source: null,
          description: "Ramassage: Mimboman — Sac",
          mode: "pickup",
        }),
      );
      expect(item.serviceLabel).toBe("Livraison");
      expect(item.sourceLabel).toBe("Ramassage");
    });

    it("omits amount and payment when not collecting cash", () => {
      const item = mapTransactionToCardItem(baseTx({ cash_collect: false, amount: 0 }));
      expect(item.amountLabel).toBeUndefined();
      expect(item.paymentLabel).toBeUndefined();
      expect(item.quartier).toBe("Makepe");
    });

    it("shows amount and ESPÈCES when collecting cash", () => {
      const item = mapTransactionToCardItem(baseTx({ cash_collect: true, amount: 5000 }));
      expect(item.amountLabel).toBe("5 000 FCFA");
      expect(item.paymentLabel).toBe("ESPÈCES");
    });

    it("sets express label from serviceLevel", () => {
      const item = mapTransactionToCardItem(baseTx({ serviceLevel: "express", type: "delivery", source: "stock" }));
      expect(item.expressLabel).toBe("Express");
    });

    it("uses En cours status label aligned with filters", () => {
      const item = mapTransactionToCardItem(baseTx({ status: "pending" }));
      expect(item.status).toBe("En cours");
      expect(item.statusLabel).toBe("En cours");
    });

    it("formats ref without leading hash", () => {
      const item = mapTransactionToCardItem(baseTx({ transactionReference: "LVS-TEST123456" }));
      expect(item.ref).toBe("LVS-TEST123456");
    });

    it("maps scheduled status to Planifiée", () => {
      const item = mapTransactionToCardItem(baseTx({ status: "scheduled" }));
      expect(item.status).toBe("Planifiée");
      expect(item.statusLabel).toBe("Planifiée");
    });

    it("includes scheduledLabel when scheduled_delivery_date is set", () => {
      const item = mapTransactionToCardItem(
        baseTx({ status: "scheduled", scheduled_delivery_date: "2026-07-12" }),
      );
      expect(item.scheduledLabel).toBe("12 juillet");
    });
  });

  describe("scheduledDeliveryLabelFromTransaction", () => {
    it("returns undefined when date is missing", () => {
      expect(scheduledDeliveryLabelFromTransaction(baseTx())).toBeUndefined();
    });

    it("formats scheduled delivery date in French", () => {
      expect(
        scheduledDeliveryLabelFromTransaction(baseTx({ scheduled_delivery_date: "2026-07-12" })),
      ).toBe("12 juillet");
    });
  });

  describe("filterCardItemsByStatus", () => {
    const items: TransactionCardItem[] = [
      {
        id: "1",
        title: "Sac",
        quartier: "—",
        dateLabel: "—",
        status: "Planifiée",
        statusLabel: "Planifiée",
        isExpedition: false,
        createdAtMs: null,
      },
      {
        id: "2",
        title: "Sac",
        quartier: "—",
        dateLabel: "—",
        status: "En cours",
        statusLabel: "En cours",
        isExpedition: false,
        createdAtMs: null,
      },
    ];

    it("keeps only Planifiée items", () => {
      expect(filterCardItemsByStatus(items, "Planifiée").map((i) => i.id)).toEqual(["1"]);
    });
  });

  it("filters transactions to the signed-in user", () => {
    const txns = [baseTx({ user_id: 3 }), baseTx({ user_id: 5, transactionReference: "LVS-BBBB222222" })];
    expect(filterTransactionsForUser(txns, 3)).toHaveLength(1);
    expect(filterTransactionsForUser(txns, 3)[0]?.user_id).toBe(3);
  });

  it("sorts by created_at descending when available", () => {
    const txns = [
      baseTx({ created_at: "2026-01-01T00:00:00.000Z", transactionReference: "LVS-OLD" }),
      baseTx({ created_at: "2026-05-01T00:00:00.000Z", transactionReference: "LVS-NEW" }),
    ];
    const sorted = sortTransactionsForDisplay(txns);
    expect(sorted[0]?.transactionReference).toBe("LVS-NEW");
  });

  it("falls back to reverse API order when dates are missing", () => {
    const txns = [
      baseTx({ transactionReference: "LVS-OLDEST" }),
      baseTx({ transactionReference: "LVS-MIDDLE" }),
      baseTx({ transactionReference: "LVS-NEWEST" }),
    ];
    const sorted = sortTransactionsForDisplay(txns);
    expect(sorted.map((t) => t.transactionReference)).toEqual(["LVS-NEWEST", "LVS-MIDDLE", "LVS-OLDEST"]);
  });
});

describe("filterCardItemsByDate", () => {
  // Fixed reference: 2026-07-09 12:00 local time
  const NOW = new Date(2026, 6, 9, 12, 0, 0).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const item = (id: string, createdAtMs: number | null): TransactionCardItem => ({
    id,
    title: "Sac",
    quartier: "—",
    dateLabel: "—",
    status: "En cours",
    statusLabel: "En cours",
    isExpedition: false,
    createdAtMs,
  });

  const items = [
    item("today", new Date(2026, 6, 9, 8, 0, 0).getTime()),
    item("3-days", NOW - 3 * DAY_MS),
    item("20-days", NOW - 20 * DAY_MS),
    item("60-days", NOW - 60 * DAY_MS),
    item("no-date", null),
  ];

  it("returns everything for Toutes dates", () => {
    expect(filterCardItemsByDate(items, "Toutes dates", NOW)).toHaveLength(5);
  });

  it("keeps only today's items for Aujourd'hui", () => {
    expect(filterCardItemsByDate(items, "Aujourd'hui", NOW).map((i) => i.id)).toEqual(["today"]);
  });

  it("keeps only yesterday's items for Hier", () => {
    const yesterday = item("yesterday", new Date(2026, 6, 8, 10, 0, 0).getTime());
    expect(filterCardItemsByDate([...items, yesterday], "Hier", NOW).map((i) => i.id)).toEqual(["yesterday"]);
  });

  it("keeps the last 7 days", () => {
    expect(filterCardItemsByDate(items, "7 derniers jours", NOW).map((i) => i.id)).toEqual(["today", "3-days"]);
  });

  it("keeps the last 30 days", () => {
    expect(filterCardItemsByDate(items, "30 derniers jours", NOW).map((i) => i.id)).toEqual([
      "today",
      "3-days",
      "20-days",
    ]);
  });

  it("excludes items without a timestamp when a period is selected", () => {
    const ids = filterCardItemsByDate(items, "30 derniers jours", NOW).map((i) => i.id);
    expect(ids).not.toContain("no-date");
  });
});
