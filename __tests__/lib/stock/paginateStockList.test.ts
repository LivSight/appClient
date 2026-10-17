import { STOCK_LIST_PAGE_SIZE, paginateStockList } from "@/lib/stock/paginateStockList";

describe("paginateStockList", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("uses a page size of 10", () => {
    expect(STOCK_LIST_PAGE_SIZE).toBe(10);
  });

  it("returns only the current page window (not cumulative)", () => {
    expect(paginateStockList(items, 1)).toEqual({
      visible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      hasPrevious: false,
      hasNext: true,
      totalPages: 3,
      page: 1,
    });
    expect(paginateStockList(items, 2)).toEqual({
      visible: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      hasPrevious: true,
      hasNext: true,
      totalPages: 3,
      page: 2,
    });
    expect(paginateStockList(items, 3)).toEqual({
      visible: [21, 22, 23, 24, 25],
      hasPrevious: true,
      hasNext: false,
      totalPages: 3,
      page: 3,
    });
  });

  it("handles short lists on a single page", () => {
    expect(paginateStockList([1, 2, 3], 1)).toEqual({
      visible: [1, 2, 3],
      hasPrevious: false,
      hasNext: false,
      totalPages: 1,
      page: 1,
    });
  });

  it("clamps invalid page / pageSize values", () => {
    expect(paginateStockList(items, 0).page).toBe(1);
    expect(paginateStockList(items, -2).visible).toEqual(items.slice(0, 10));
    expect(paginateStockList(items, 99).page).toBe(3);
    expect(paginateStockList(items, 1, 0).visible).toHaveLength(10);
  });

  it("returns an empty page for an empty list", () => {
    expect(paginateStockList([], 1)).toEqual({
      visible: [],
      hasPrevious: false,
      hasNext: false,
      totalPages: 1,
      page: 1,
    });
  });
});
