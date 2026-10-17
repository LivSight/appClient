export type StockCartPickerItem = { id: string };

/** Hides products already in the cart from the search dropdown (qty is adjusted on the cart card). */
export function inventoryExcludingCart<T extends { id: string }>(
  inventory: T[],
  cart: StockCartPickerItem[],
): T[] {
  if (!cart.length) return inventory;
  const cartIds = new Set(cart.map((item) => item.id));
  return inventory.filter((item) => !cartIds.has(item.id));
}
