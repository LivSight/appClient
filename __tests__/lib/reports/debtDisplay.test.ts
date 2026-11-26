import { formatXaf } from "@/lib/reports/aggregateReports";
import {
  debtCardLines,
  debtHeadline,
  entryRows,
  entryTitle,
  parseClientBalance,
  parseSettlementDebt,
  shouldShowDebtCard,
  type BalanceEntry,
  type ClientBalance,
  type SettlementDebt,
} from "@/lib/reports/debtDisplay";

const f = (n: number) => `${formatXaf(n)} FCFA`;

const balance = (outstandingDebt: number, entries: BalanceEntry[] = []): ClientBalance => ({
  balance: -outstandingDebt,
  outstandingDebt,
  entries,
});

const entry = (over: Partial<BalanceEntry>): BalanceEntry => ({
  id: 1,
  type: "DEBT",
  amount: -10000,
  reason: "Trop-perçu",
  createdAt: "2026-11-10T10:00:00Z",
  reversed: false,
  automatic: false,
  sourceRef: null,
  ...over,
});

describe("parseClientBalance", () => {
  it("reads a ledger, keeping the signed amounts, the automatic flag and the source", () => {
    const parsed = parseClientBalance({
      clientId: 50,
      balance: -4000,
      outstandingDebt: 4000,
      entries: [
        { id: 2, type: "OFFSET", amount: 6000, reason: "Déduit", createdAt: "2026-11-20T10:00:00Z", reversed: false, automatic: true, sourceRef: "settlement:a:b" },
        { id: 1, type: "DEBT", amount: -10000, reason: "Trop-perçu", createdAt: "2026-11-10T10:00:00Z", reversed: false },
      ],
    });

    expect(parsed.outstandingDebt).toBe(4000);
    expect(parsed.entries[0]).toMatchObject({ id: 2, amount: 6000, automatic: true, sourceRef: "settlement:a:b" });
    expect(parsed.entries[1]).toMatchObject({ id: 1, amount: -10000, automatic: false, sourceRef: null });
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
    expect(shouldShowDebtCard(balance(0), null)).toBe(false);
  });

  it("is shown while a debt is outstanding", () => {
    expect(shouldShowDebtCard(balance(1), null)).toBe(true);
  });

  it("is shown when the period had a deduction even if the debt is now cleared", () => {
    const settlement: SettlementDebt = { net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: true };
    expect(shouldShowDebtCard(balance(0), settlement)).toBe(true);
  });
});

describe("debtHeadline", () => {
  it("says plainly how much is owed, in the debt color", () => {
    expect(debtHeadline(balance(13000), null)).toEqual({ text: `Vous devez ${f(13000)}`, tone: "debt" });
  });

  it("says the debt is settled, in the ok color", () => {
    const settlement: SettlementDebt = { net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: true };
    expect(debtHeadline(balance(0), settlement)).toEqual({ text: "Dette soldée", tone: "ok" });
  });
});

describe("debtCardLines", () => {
  it("shows the period, the debt, the deduction and what is left to receive", () => {
    const settlement: SettlementDebt = { net: 6000, deducted: 6000, netAfterDebt: 0, remaining: 4000, applied: true };

    expect(debtCardLines(balance(4000), settlement)).toEqual([
      { label: "Net de la période", value: f(6000), tone: "neutral" },
      { label: "Dette en cours", value: f(4000), tone: "debt" },
      { label: "Déduit de ce relevé", value: f(6000), tone: "deduction" },
      { label: "À recevoir après dette", value: f(0), tone: "neutral" },
    ]);
  });

  it("calls a deduction that is not posted yet a planned one", () => {
    const settlement: SettlementDebt = { net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: false };

    const lines = debtCardLines(balance(10000), settlement);

    expect(lines.find((l) => l.tone === "deduction")?.label).toBe("Déduction prévue");
  });

  it("shows the Solde minus the debt even when nothing was deducted", () => {
    const settlement: SettlementDebt = { net: 2000, deducted: 0, netAfterDebt: 2000, remaining: 5000, applied: false };

    const lines = debtCardLines(balance(5000), settlement);

    expect(lines.map((l) => l.label)).toEqual(["Net de la période", "Dette en cours", "Solde moins dette"]);
    expect(lines[2]).toEqual({ label: "Solde moins dette", value: `-${f(3000)}`, tone: "debt" });
  });

  it("keeps the sign of a negative period net", () => {
    const settlement: SettlementDebt = { net: -3000, deducted: 0, netAfterDebt: -3000, remaining: 10000, applied: false };

    const lines = debtCardLines(balance(10000), settlement);

    expect(lines[0]).toEqual({ label: "Net de la période", value: `-${f(3000)}`, tone: "debt" });
  });

  it("only shows the debt when the period has no figures", () => {
    expect(debtCardLines(balance(2500), null)).toEqual([{ label: "Dette en cours", value: f(2500), tone: "debt" }]);
  });

  it("marks a settled debt in the ok color", () => {
    const settlement: SettlementDebt = { net: 15000, deducted: 10000, netAfterDebt: 5000, remaining: 0, applied: true };

    expect(debtCardLines(balance(0), settlement)[1]).toEqual({ label: "Dette en cours", value: "Soldée", tone: "ok" });
  });
});

describe("entryTitle", () => {
  it("names each kind in French", () => {
    expect(entryTitle(entry({ type: "DEBT" }))).toBe("Trop-perçu");
    expect(entryTitle(entry({ type: "REPAYMENT", amount: 4000 }))).toBe("Remboursement");
    expect(entryTitle(entry({ type: "OFFSET", amount: 6000 }))).toBe("Déduit d'un relevé");
    expect(entryTitle(entry({ type: "ADJUSTMENT" }))).toBe("Ajustement");
    expect(entryTitle(entry({ type: "REVERSAL", amount: 10000 }))).toBe("Annulation");
    expect(entryTitle(entry({ type: "???" }))).toBe("Opération");
  });

  it("calls a debt that came from a deficit day a deficit", () => {
    expect(entryTitle(entry({ type: "DEBT", amount: -3000, sourceRef: "deficit:2026-11-26" }))).toBe("Déficit du jour");
  });
});

describe("entryRows", () => {
  it("colors a debt red, a deduction amber and a repayment green", () => {
    const rows = entryRows([
      entry({ id: 3, type: "REPAYMENT", amount: 4000 }),
      entry({ id: 2, type: "OFFSET", amount: 6000 }),
      entry({ id: 1, type: "DEBT", amount: -10000 }),
    ]);

    expect(rows.map((r) => [r.id, r.tone, r.amountLabel])).toEqual([
      [3, "ok", `+${f(4000)}`],
      [2, "deduction", `+${f(6000)}`],
      [1, "debt", `-${f(10000)}`],
    ]);
  });

  it("keeps the reason and the automatic flag, and grays out a cancelled line", () => {
    const [row] = entryRows([
      entry({ type: "DEBT", amount: -3000, sourceRef: "deficit:2026-11-26", reason: "Déficit du relevé du 2026-11-26", automatic: true, reversed: true }),
    ]);

    expect(row.title).toBe("Déficit du jour");
    expect(row.reason).toBe("Déficit du relevé du 2026-11-26");
    expect(row.automatic).toBe(true);
    expect(row.reversed).toBe(true);
    expect(row.tone).toBe("neutral");
  });

  it("shows every line, newest first as received", () => {
    const rows = entryRows(Array.from({ length: 8 }, (_, i) => entry({ id: i + 1 })));
    expect(rows).toHaveLength(8);
    expect(rows[0].id).toBe(1);
  });
});
