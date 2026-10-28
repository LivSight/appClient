import { filterStockItems } from "@/lib/stock/filterStockItems";

const items = [
  { id: "1", name: "Riz", subtitle: "Sac 25kg", qty: 5 },
  { id: "2", name: "Farine", subtitle: "Blé", qty: 2 },
  { id: "3", name: "Huile", subtitle: "", qty: 0 },
];

describe("filterStockItems", () => {
  it("returns all items when query is empty", () => {
    expect(filterStockItems(items, "")).toEqual(items);
    expect(filterStockItems(items, "   ")).toEqual(items);
  });

  it("filters by product name", () => {
    expect(filterStockItems(items, "riz").map((i) => i.id)).toEqual(["1"]);
  });

  it("filters by description subtitle", () => {
    expect(filterStockItems(items, "blé").map((i) => i.id)).toEqual(["2"]);
  });

  it("is case-insensitive", () => {
    expect(filterStockItems(items, "FAR").map((i) => i.name)).toEqual(["Farine"]);
  });
});
