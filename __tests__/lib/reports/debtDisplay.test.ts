import { formatXaf } from "@/lib/reports/aggregateReports";
import {
  debtCardLines,
  entryKindLabel,
  parseClientBalance,
  parseSettlementDebt,
  shouldShowDebtCard,
} from "@/lib/reports/debtDisplay";

describe("parseClientBalance", () => {
  it("reads a ledger and keeps the signed balance", () => {
    const parsed = parseClientBalance({
      clientId: 50,
      balance: -4000,
      outstandingDebt: 4000,
      entries: [
        { id: 2, type: "OFFSET", amount: 6000, reason: "Déduit du relevé", createdAt: "2026-11-20T10:00:00Z", reversed: false },
        { id: 1, type: "DEBT", amount: -10000, reason: "Trop-perçu", createdAt: "2026-11-10T10:00:00Z", reversed: false },
      ],
    });

    expect(parsed.outstandingDebt).toBe(4000);
    expect(parsed.balance).toBe(-4000);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[1].amount).toBe(-10000);
  });

  it("never crashes on a missing or odd payload", () => {
    expect(parseClientBalance(null)).toEqual({ balance: 0, outstandingDebt: 0, entries: [] });
    expect(parseClientBalance({ outstandingDebt: "abc", entries: "x" })).toEqual({
      balance: 0,
      outstandingDebt: 0,
      entries: [],
    });
  });

  it("never reports a negative outstanding debt", () => {
    expect(parseClientBalance({ balance: 500, outstandingDebt: -500, entries: [] }).outstandingDebt).toBe(0);
  });
});

describe("parseSettlementDebt", () => {
  it("reads the settlement view", () => {
    expect(
      parseSettlementDebt({ netAReverser: 15000, detteDeduite: 10000, netApresDette: 5000, detteRestante: 0, offsetApplied: true }),
    ).toEqual({ net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: true });
  });

  it("returns null when there is nothing usable", () => {
    expect(parseSettlementDebt(null)).toBeNull();
    expect(parseSettlementDebt({})).toBeNull();
  });
});

describe("shouldShowDebtCard", () => {
  it("is hidden when there is no debt and nothing deducted", () => {
    expect(shouldShowDebtCard({ balance: 0, outstandingDebt: 0, entries: [] }, null)).toBe(false);
  });

  it("is shown while a debt is outstanding", () => {
    expect(shouldShowDebtCard({ balance: -1, outstandingDebt: 1, entries: [] }, null)).toBe(true);
  });

  it("is shown when the period had a deduction even if the debt is now cleared", () => {
    expect(
      shouldShowDebtCard(
        { balance: 0, outstandingDebt: 0, entries: [] },
        { net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: true },
      ),
    ).toBe(true);
  });
});

describe("debtCardLines", () => {
  it("explains the debt, the deduction and the amount still to receive", () => {
    const lines = debtCardLines(
      { balance: -4000, outstandingDebt: 4000, entries: [] },
      { net: 6000, deducted: 6000, netAfterDebt: 0, remaining: 4000, applied: true },
    );

    expect(lines).toEqual([
      { label: "Dette à récupérer", value: `${formatXaf(4000)} FCFA`, tone: "debt" },
      { label: "Déduit de ce relevé", value: `${formatXaf(6000)} FCFA`, tone: "neutral" },
      { label: "À recevoir après dette", value: `${formatXaf(0)} FCFA`, tone: "neutral" },
    ]);
  });

  it("only shows the debt when the period has no deduction", () => {
    const lines = debtCardLines({ balance: -2500, outstandingDebt: 2500, entries: [] }, null);
    expect(lines).toEqual([{ label: "Dette à récupérer", value: `${formatXaf(2500)} FCFA`, tone: "debt" }]);
  });

  it("marks a settled debt", () => {
    const lines = debtCardLines(
      { balance: 0, outstandingDebt: 0, entries: [] },
      { net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: true },
    );
    expect(lines[0]).toEqual({ label: "Dette à récupérer", value: "Soldée", tone: "ok" });
  });
});

describe("entryKindLabel", () => {
  it("names each kind in French", () => {
    expect(entryKindLabel("DEBT")).toBe("Trop-perçu");
    expect(entryKindLabel("REPAYMENT")).toBe("Remboursement");
    expect(entryKindLabel("OFFSET")).toBe("Déduit d'un relevé");
    expect(entryKindLabel("ADJUSTMENT")).toBe("Ajustement");
    expect(entryKindLabel("REVERSAL")).toBe("Annulation");
    expect(entryKindLabel("???")).toBe("Opération");
  });
});
