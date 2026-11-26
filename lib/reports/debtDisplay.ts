import { formatXaf } from "./aggregateReports";

/** One line of the merchant's debt ledger, as sent by the backend (negative = the merchant owes). */
export type BalanceEntry = {
  id: number;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
  reversed: boolean;
  /** Posted by the system (a deficit day, an automatic deduction), not by an agent. */
  automatic: boolean;
  sourceRef: string | null;
};

export type ClientBalance = {
  /** Signed: negative means the merchant owes LivSight. */
  balance: number;
  outstandingDebt: number;
  entries: BalanceEntry[];
};

/** What one settlement period pays once the debt is taken into account. */
export type SettlementDebt = {
  net: number;
  deducted: number;
  netAfterDebt: number;
  remaining: number;
  applied: boolean;
};

/** debt = red, deduction = amber, ok = green, neutral = plain text. */
export type DebtTone = "debt" | "deduction" | "ok" | "neutral";

export type DebtLine = { label: string; value: string; tone: DebtTone };

export type EntryRow = {
  id: number;
  title: string;
  amountLabel: string;
  tone: DebtTone;
  reason: string;
  createdAt: string;
  automatic: boolean;
  reversed: boolean;
};

function num(value: unknown): number | null {
  const n = Number(value);
  return typeof value !== "boolean" && value != null && value !== "" && Number.isFinite(n) ? n : null;
}

function parseEntry(raw: unknown): BalanceEntry | null {
  const r = raw as Record<string, unknown> | null;
  const id = num(r?.id);
  const amount = num(r?.amount);
  if (!r || id == null || amount == null) return null;
  return {
    id,
    type: typeof r.type === "string" ? r.type : "",
    amount,
    reason: typeof r.reason === "string" ? r.reason : "",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    reversed: r.reversed === true,
    automatic: r.automatic === true,
    sourceRef: typeof r.sourceRef === "string" && r.sourceRef ? r.sourceRef : null,
  };
}

/** Tolerant on purpose: a missing or odd payload must never break the reports screen. */
export function parseClientBalance(raw: unknown): ClientBalance {
  const r = raw as Record<string, unknown> | null;
  const entries = Array.isArray(r?.entries)
    ? (r!.entries as unknown[]).map(parseEntry).filter((e): e is BalanceEntry => e != null)
    : [];
  return {
    balance: num(r?.balance) ?? 0,
    outstandingDebt: Math.max(0, num(r?.outstandingDebt) ?? 0),
    entries,
  };
}

export function parseSettlementDebt(raw: unknown): SettlementDebt | null {
  const r = raw as Record<string, unknown> | null;
  const net = num(r?.netAReverser);
  const deducted = num(r?.detteDeduite);
  if (!r || net == null || deducted == null) return null;
  return {
    net,
    deducted,
    netAfterDebt: num(r.netApresDette) ?? net - deducted,
    remaining: Math.max(0, num(r.detteRestante) ?? 0),
    applied: r.offsetApplied === true,
  };
}

export function shouldShowDebtCard(balance: ClientBalance | null, settlement: SettlementDebt | null): boolean {
  if (balance && balance.outstandingDebt > 0) return true;
  return Boolean(settlement && settlement.deducted > 0);
}

function fcfa(n: number): string {
  return `${formatXaf(n)} FCFA`;
}

function signedFcfa(n: number): string {
  return `${n < 0 ? "-" : ""}${fcfa(Math.abs(n))}`;
}

function currentDebt(balance: ClientBalance | null, settlement: SettlementDebt | null): number {
  return balance?.outstandingDebt ?? settlement?.remaining ?? 0;
}

/** One sentence on top of the card, in the color that says what it is. */
export function debtHeadline(
  balance: ClientBalance | null,
  settlement: SettlementDebt | null,
): { text: string; tone: "debt" | "ok" } {
  const debt = currentDebt(balance, settlement);
  return debt > 0 ? { text: `Vous devez ${fcfa(debt)}`, tone: "debt" } : { text: "Dette soldée", tone: "ok" };
}

/**
 * Lines of the debt card. It extends the existing Solde card: the Solde itself is never recomputed
 * here, the debt and what it takes out of this period's payout are shown beside it.
 */
export function debtCardLines(balance: ClientBalance | null, settlement: SettlementDebt | null): DebtLine[] {
  const debt = currentDebt(balance, settlement);
  const lines: DebtLine[] = [];
  if (settlement) {
    lines.push({ label: "Net de la période", value: signedFcfa(settlement.net), tone: settlement.net < 0 ? "debt" : "neutral" });
  }
  lines.push(
    debt > 0
      ? { label: "Dette en cours", value: fcfa(debt), tone: "debt" }
      : { label: "Dette en cours", value: "Soldée", tone: "ok" },
  );
  if (!settlement) return lines;

  if (settlement.deducted > 0) {
    lines.push({
      label: settlement.applied ? "Déduit de ce relevé" : "Déduction prévue",
      value: fcfa(settlement.deducted),
      tone: "deduction",
    });
    lines.push({ label: "À recevoir après dette", value: fcfa(Math.max(0, settlement.netAfterDebt)), tone: "neutral" });
  } else if (debt > 0) {
    const left = settlement.net - debt;
    lines.push({ label: "Solde moins dette", value: signedFcfa(left), tone: left < 0 ? "debt" : "neutral" });
  }
  return lines;
}

const KIND_LABELS: Record<string, string> = {
  DEBT: "Trop-perçu",
  REPAYMENT: "Remboursement",
  OFFSET: "Déduit d'un relevé",
  ADJUSTMENT: "Ajustement",
  REVERSAL: "Annulation",
};

export function entryTitle(entry: BalanceEntry): string {
  if (entry.type === "DEBT" && entry.sourceRef?.startsWith("deficit:")) return "Déficit du jour";
  return KIND_LABELS[entry.type] ?? "Opération";
}

function entryTone(entry: BalanceEntry): DebtTone {
  if (entry.reversed) return "neutral";
  switch (entry.type) {
    case "DEBT":
      return "debt";
    case "OFFSET":
      return "deduction";
    case "REPAYMENT":
      return "ok";
    case "ADJUSTMENT":
      return entry.amount < 0 ? "debt" : "ok";
    default:
      return "neutral";
  }
}

/** The ledger as it is shown: one row per line, colored by what it did to the debt. */
export function entryRows(entries: BalanceEntry[]): EntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entryTitle(entry),
    amountLabel: `${entry.amount < 0 ? "-" : "+"}${fcfa(Math.abs(entry.amount))}`,
    tone: entryTone(entry),
    reason: entry.reason,
    createdAt: entry.createdAt,
    automatic: entry.automatic,
    reversed: entry.reversed,
  }));
}
