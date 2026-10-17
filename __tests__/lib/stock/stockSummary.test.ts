import { stockSummaryFromQuantities } from "@/lib/stock/stockSummary";

describe("stockSummaryFromQuantities", () => {
  it("counts products, total quantity, and out-of-stock rows", () => {
    expect(stockSummaryFromQuantities([5, 0, 3, 0])).toEqual({
      productsCount: 4,
      qtyTotal: 8,
      outOfStockCount: 2,
    });
  });

  it("returns zeros for an empty list", () => {
    expect(stockSummaryFromQuantities([])).toEqual({
      productsCount: 0,
      qtyTotal: 0,
      outOfStockCount: 0,
    });
  });
});
