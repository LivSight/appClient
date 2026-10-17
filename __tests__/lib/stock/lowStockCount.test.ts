import {
  countLowStockProducts,
  isLowStockQuantity,
  LOW_STOCK_UNIT_THRESHOLD,
} from "@/lib/stock/lowStockCount";

jest.mock("@/lib/api/packages", () => ({
  makeClientId: (p: { package_name?: string }) => String(p?.package_name ?? "").trim().toLowerCase(),
}));

describe("lowStockCount", () => {
  it("flags quantities below 3 units", () => {
    expect(isLowStockQuantity(0)).toBe(true);
    expect(isLowStockQuantity(2)).toBe(true);
    expect(isLowStockQuantity(3)).toBe(false);
    expect(LOW_STOCK_UNIT_THRESHOLD).toBe(3);
  });

  it("counts merged products under threshold", () => {
    const count = countLowStockProducts([
      { package_name: "Riz", quantity: 1 },
      { package_name: "Huile", quantity: 5 },
      { package_name: "Riz", quantity: 1 },
    ] as never[]);
    expect(count).toBe(1);
  });

  it("counts multiple low products", () => {
    const count = countLowStockProducts([
      { package_name: "Riz", quantity: 1 },
      { package_name: "Huile", quantity: 0 },
      { package_name: "Sucre", quantity: 10 },
    ] as never[]);
    expect(count).toBe(2);
  });
});
