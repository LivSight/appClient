export type StockSearchItem = {
  name: string;
  subtitle?: string;
};

/** Client-side stock search: empty query keeps all items; otherwise match name or subtitle. */
export function filterStockItems<T extends StockSearchItem>(items: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((item) => {
    const name = item.name.toLowerCase();
    const subtitle = String(item.subtitle ?? "").toLowerCase();
    return name.includes(q) || subtitle.includes(q);
  });
}
