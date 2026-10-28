import { sortStockItemsByName } from "@/lib/stock/sortStockItems";

describe("sortStockItemsByName", () => {
  it("sorts alphabetically by name (French locale)", () => {
    const items = [
      { id: "1", name: "Riz" },
      { id: "2", name: "Farine" },
      { id: "3", name: "Huile" },
      { id: "4", name: "Épices" },
    ];
    expect(sortStockItemsByName(items).map((i) => i.name)).toEqual([
      "Épices",
      "Farine",
      "Huile",
      "Riz",
    ]);
  });

  it("does not mutate the input array", () => {
    const items = [{ name: "B" }, { name: "A" }];
    const copy = [...items];
    sortStockItemsByName(items);
    expect(items).toEqual(copy);
  });

  it("is case-insensitive", () => {
    expect(sortStockItemsByName([{ name: "sucre" }, { name: "Sel" }]).map((i) => i.name)).toEqual([
      "Sel",
      "sucre",
    ]);
  });
});
