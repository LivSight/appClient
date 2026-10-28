export type StockSummary = {
  productsCount: number;
  qtyTotal: number;
  outOfStockCount: number;
  /** Units marked defective (not sellable). */
  defectiveTotal: number;
};

export type StockSummaryItem = {
  quantity: number;
  defectiveQuantity?: number;
};

function coerceNonNegInt(value: unknown): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

/** Aggregate store metrics from per-product quantity + optional defective counts. */
export function stockSummaryFromItems(items: readonly StockSummaryItem[]): StockSummary {
  let qtyTotal = 0;
  let outOfStockCount = 0;
  let defectiveTotal = 0;
  for (const item of items) {
    const qty = coerceNonNegInt(item.quantity);
    qtyTotal += qty;
    if (qty <= 0) outOfStockCount += 1;
    defectiveTotal += coerceNonNegInt(item.defectiveQuantity);
  }
  return {
    productsCount: items.length,
    qtyTotal,
    outOfStockCount,
    defectiveTotal,
  };
}

/** Aggregate store metrics from per-product quantities (current stock snapshot). */
export function stockSummaryFromQuantities(quantities: readonly number[]): StockSummary {
  return stockSummaryFromItems(quantities.map((quantity) => ({ quantity })));
}
