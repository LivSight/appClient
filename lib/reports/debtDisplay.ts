import { formatXaf } from "./aggregateReports";

/** One line of the merchant's debt ledger, as sent by the backend (negative = the merchant owes). */
export type BalanceEntry = {
  id: number;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
  reversed: boolean;
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

export type DebtLine = { label: string; value: string; tone: "debt" | "ok" | "neutral" };

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

/**
 * Lines of the debt card. It extends the existing Solde card: the Solde itself is never recomputed
 * here, the debt and what it takes out of this period's payout are shown beside it.
 */
export function debtCardLines(balance: ClientBalance | null, settlement: SettlementDebt | null): DebtLine[] {
  const outstanding = balance?.outstandingDebt ?? settlement?.remaining ?? 0;
  const lines: DebtLine[] = [
    outstanding > 0
      ? { label: "Dette à récupérer", value: fcfa(outstanding), tone: "debt" }
      : { label: "Dette à récupérer", value: "Soldée", tone: "ok" },
  ];
  if (settlement && settlement.deducted > 0) {
    lines.push({ label: "Déduit de ce relevé", value: fcfa(settlement.deducted), tone: "neutral" });
    lines.push({ label: "À recevoir après dette", value: fcfa(Math.max(0, settlement.netAfterDebt)), tone: "neutral" });
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

export function entryKindLabel(type: string): string {
  return KIND_LABELS[type] ?? "Opération";
}
