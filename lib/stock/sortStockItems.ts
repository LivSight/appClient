/** Alphabetical A→Z sort by product name (French collation, case-insensitive). */
export function sortStockItemsByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), "fr", { sensitivity: "base" }),
  );
}
