import { listPackages, type Package } from "@/lib/api/packages";
import { stockProductRowsFromPackages } from "@/lib/stock/stockProductRows";

/** Alert when remaining units are strictly below this value (0, 1, 2). */
export const LOW_STOCK_UNIT_THRESHOLD = 3;

export function isLowStockQuantity(qty: number): boolean {
  return Number.isFinite(qty) && qty >= 0 && qty < LOW_STOCK_UNIT_THRESHOLD;
}

/** Same rule as Stock red quantity pills — one count per visible product row. */
export function countLowStockProducts(packages: Package[]): number {
  return stockProductRowsFromPackages(packages).reduce((n, row) => (row.low ? n + 1 : n), 0);
}

export async function fetchLowStockProductCount(): Promise<number> {
  const packages = await listPackages();
  return countLowStockProducts(packages);
}
