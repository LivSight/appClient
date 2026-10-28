import { inventoryExcludingCart } from "@/lib/stockCartPicker";

describe("inventoryExcludingCart", () => {
  const inventory = [
    { id: "a", name: "Brosse" },
    { id: "b", name: "Mixa" },
    { id: "c", name: "Savon" },
  ];

  it("returns all items when cart is empty", () => {
    expect(inventoryExcludingCart(inventory, [])).toEqual(inventory);
  });

  it("removes items already present in the cart", () => {
    expect(inventoryExcludingCart(inventory, [{ id: "a" }])).toEqual([
      { id: "b", name: "Mixa" },
      { id: "c", name: "Savon" },
    ]);
  });
});
