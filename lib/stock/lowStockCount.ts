import { listPackages, type Package } from "@/lib/api/packages";
import { makeClientId } from "@/lib/api/packages";

/** Alert when remaining units are strictly below this value (0, 1, 2). */
export const LOW_STOCK_UNIT_THRESHOLD = 3;

export function isLowStockQuantity(qty: number): boolean {
  return Number.isFinite(qty) && qty >= 0 && qty < LOW_STOCK_UNIT_THRESHOLD;
}

export function countLowStockProducts(packages: Package[]): number {
  const merged = new Map<string, number>();
  for (const p of packages) {
    const name = String(p?.package_name ?? "").trim();
    if (!name) continue;
    const qty = Number.isFinite(Number(p?.quantity)) ? Math.max(0, Math.floor(Number(p.quantity))) : 0;
    const id = makeClientId(p);
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }

  let count = 0;
  for (const qty of merged.values()) {
    if (isLowStockQuantity(qty)) count += 1;
  }
  return count;
}

export async function fetchLowStockProductCount(): Promise<number> {
  const packages = await listPackages();
  return countLowStockProducts(packages);
}
