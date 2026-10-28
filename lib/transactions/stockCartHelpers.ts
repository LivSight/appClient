import type { StockCartItem } from "@/lib/transactions/transactionFormValidation";

export function parseStockCartItems(raw: string | undefined): StockCartItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => ({
        id: String(it?.id ?? "").trim(),
        name: String(it?.name ?? "").trim(),
        qty: Number.isFinite(Number(it?.qty)) ? Math.max(1, Math.floor(Number(it.qty))) : 0,
      }))
      .filter((it) => it.id && it.name && it.qty > 0);
  } catch {
    return [];
  }
}

export function stringifyStockCartItems(items: StockCartItem[]): string {
  return JSON.stringify(items.filter((it) => it.id && it.name && it.qty > 0));
}

export function cartQtyForItem(cart: StockCartItem[], id: string): number {
  return cart.find((it) => it.id === id)?.qty ?? 0;
}

export type StockInventoryItem = {
  id: string;
  name: string;
  stockLabel: string;
  stockAvailable: number;
};

export function addOrIncrementCartItem(
  cart: StockCartItem[],
  item: Pick<StockInventoryItem, "id" | "name">,
  maxQty: number,
): StockCartItem[] {
  const existing = cart.find((it) => it.id === item.id);
  if (existing) {
    const nextQty = Math.min(maxQty, existing.qty + 1);
    if (nextQty <= existing.qty) return cart;
    return cart.map((it) => (it.id === item.id ? { ...it, qty: nextQty } : it));
  }
  if (maxQty <= 0) return cart;
  return [...cart, { id: item.id, name: item.name, qty: 1 }];
}

export function updateCartItemQty(cart: StockCartItem[], id: string, qty: number): StockCartItem[] {
  if (qty <= 0) return cart.filter((it) => it.id !== id);
  return cart.map((it) => (it.id === id ? { ...it, qty } : it));
}

export function removeCartItem(cart: StockCartItem[], id: string): StockCartItem[] {
  return cart.filter((it) => it.id !== id);
}

export function stockCartSummaryLabel(cart: StockCartItem[]): string {
  if (!cart.length) return "Aucun produit sélectionné";
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const productWord = cart.length > 1 ? "produits" : "produit";
  return `${cart.length} ${productWord} · ${totalQty} unité${totalQty > 1 ? "s" : ""}`;
}
