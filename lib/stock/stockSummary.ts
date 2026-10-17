export type StockSummary = {
  productsCount: number;
  qtyTotal: number;
  outOfStockCount: number;
};

/** Aggregate store metrics from per-product quantities (current stock snapshot). */
export function stockSummaryFromQuantities(quantities: readonly number[]): StockSummary {
  let qtyTotal = 0;
  let outOfStockCount = 0;
  for (const raw of quantities) {
    const qty = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    qtyTotal += qty;
    if (qty <= 0) outOfStockCount += 1;
  }
  return {
    productsCount: quantities.length,
    qtyTotal,
    outOfStockCount,
  };
}
