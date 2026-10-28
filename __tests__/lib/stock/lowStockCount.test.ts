import {
  countLowStockProducts,
  isLowStockQuantity,
  LOW_STOCK_UNIT_THRESHOLD,
} from "@/lib/stock/lowStockCount";
import type { Package } from "@/lib/api/packages";

function pkg(partial: Partial<Package> & Pick<Package, "package_name" | "quantity">): Package {
  return {
    description: "",
    defective_quantity: 0,
    user_id: 2,
    ...partial,
  };
}

describe("lowStockCount", () => {
  it("flags quantities below 3 units", () => {
    expect(isLowStockQuantity(0)).toBe(true);
    expect(isLowStockQuantity(2)).toBe(true);
    expect(isLowStockQuantity(3)).toBe(false);
    expect(LOW_STOCK_UNIT_THRESHOLD).toBe(3);
  });

  it("counts each stock row like the Stock screen (no name merge)", () => {
    // Two "Riz" rows stay two cards on Stock — badge must match red pills (2), not merge to 1.
    const count = countLowStockProducts([
      pkg({ package_name: "Riz", quantity: 1 }),
      pkg({ package_name: "Huile", quantity: 5 }),
      pkg({ package_name: "Riz", quantity: 1 }),
    ]);
    expect(count).toBe(2);
  });

  it("counts multiple low products among a full list", () => {
    const count = countLowStockProducts([
      pkg({ package_name: "A", quantity: 10 }),
      pkg({ package_name: "B", quantity: 1 }),
      pkg({ package_name: "C", quantity: 8 }),
      pkg({ package_name: "D", quantity: 0 }),
      pkg({ package_name: "E", quantity: 3 }),
    ]);
    expect(count).toBe(2);
  });

  it("skips rows without a displayable name", () => {
    expect(countLowStockProducts([pkg({ package_name: "   ", quantity: 0 })])).toBe(0);
  });
});
