/** Client-side display page size for the stock product list. */
export const STOCK_LIST_PAGE_SIZE = 10;

export type StockListPage<T> = {
  visible: T[];
  hasPrevious: boolean;
  hasNext: boolean;
  totalPages: number;
  page: number;
};

/**
 * Windowed pagination: each page shows at most `pageSize` items (replaces, never accumulates).
 */
export function paginateStockList<T>(
  items: readonly T[],
  page: number,
  pageSize: number = STOCK_LIST_PAGE_SIZE,
): StockListPage<T> {
  const size =
    Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : STOCK_LIST_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(items.length / size) || 1);
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const safePage = Math.min(requested, totalPages);
  const start = (safePage - 1) * size;
  const visible = items.slice(start, start + size);
  return {
    visible,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
    totalPages,
    page: safePage,
  };
}
