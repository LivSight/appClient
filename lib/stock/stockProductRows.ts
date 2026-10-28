import { makeClientId, type Package } from "@/lib/api/packages";
import type { StockProductCardItem } from "@/components/StockProductCard";
import { formatDbText } from "@/lib/formatDisplayText";

/** Keep in sync with `LOW_STOCK_UNIT_THRESHOLD` in lowStockCount.ts (qty 0, 1, 2). */
const LOW_STOCK_MAX_EXCLUSIVE = 3;

/**
 * Maps API packages to Stock screen rows (one card per package row).
 * Shared so the tab badge low-count matches the red quantity pills.
 */
export function stockProductRowsFromPackages(packages: readonly Package[]): StockProductCardItem[] {
  const seen = new Map<string, number>();
  const rows: StockProductCardItem[] = [];

  for (const p of packages) {
    const name = formatDbText(p?.package_name);
    if (!name) continue;

    const qty = Number.isFinite(Number(p?.quantity)) ? Math.max(0, Math.floor(Number(p.quantity))) : 0;
    const defectiveQty = Number.isFinite(Number(p?.defective_quantity))
      ? Math.max(0, Math.floor(Number(p.defective_quantity)))
      : 0;
    const baseId = makeClientId(p);
    const occurrence = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, occurrence);

    rows.push({
      id: occurrence > 1 ? `${baseId}#${occurrence}` : baseId,
      name,
      subtitle: formatDbText(p?.description),
      qty,
      defectiveQty,
      low: qty < LOW_STOCK_MAX_EXCLUSIVE,
    });
  }

  return rows;
}
