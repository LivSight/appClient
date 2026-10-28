import { stockSummaryFromItems, stockSummaryFromQuantities } from "@/lib/stock/stockSummary";

describe("stockSummaryFromQuantities", () => {
  it("counts products, total quantity, and out-of-stock rows", () => {
    expect(stockSummaryFromQuantities([5, 0, 3, 0])).toEqual({
      productsCount: 4,
      qtyTotal: 8,
      outOfStockCount: 2,
      defectiveTotal: 0,
    });
  });

  it("returns zeros for an empty list", () => {
    expect(stockSummaryFromQuantities([])).toEqual({
      productsCount: 0,
      qtyTotal: 0,
      outOfStockCount: 0,
      defectiveTotal: 0,
    });
  });
});

describe("stockSummaryFromItems", () => {
  it("sums defective quantities separately from sellable stock", () => {
    expect(
      stockSummaryFromItems([
        { quantity: 5, defectiveQuantity: 2 },
        { quantity: 0, defectiveQuantity: 1 },
        { quantity: 3 },
      ]),
    ).toEqual({
      productsCount: 3,
      qtyTotal: 8,
      outOfStockCount: 1,
      defectiveTotal: 3,
    });
  });

  it("treats missing or invalid defective as zero", () => {
    expect(
      stockSummaryFromItems([
        { quantity: 2, defectiveQuantity: -1 },
        { quantity: 1, defectiveQuantity: Number.NaN },
      ]),
    ).toEqual({
      productsCount: 2,
      qtyTotal: 3,
      outOfStockCount: 0,
      defectiveTotal: 0,
    });
  });
});
