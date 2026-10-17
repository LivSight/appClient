import { makeClientId, type Package } from "@/lib/api/packages";
import { formatDbText } from "@/lib/formatDisplayText";
import type { StockInventoryItem } from "@/lib/transactions/stockCartHelpers";

export function toInventory(items: Package[]): StockInventoryItem[] {
  const merged = new Map<string, { id: string; name: string; description: string; qty: number }>();
  for (const p of items) {
    const name = formatDbText(p?.package_name);
    if (!name) continue;
    const description = formatDbText(p?.description);
    const qty = Number.isFinite(Number(p?.quantity)) ? Math.max(0, Math.floor(Number(p.quantity))) : 0;
    const id = makeClientId(p);
    const existing = merged.get(id);
    if (existing) {
      existing.qty += qty;
      if (!existing.description && description) existing.description = description;
    } else {
      merged.set(id, { id, name, description, qty });
    }
  }
  return Array.from(merged.values()).map(({ id, name, description, qty }) => ({
    id,
    name,
    stockLabel: [description, `STOCK: ${qty}`].filter(Boolean).join(" • "),
    stockAvailable: qty,
  }));
}
