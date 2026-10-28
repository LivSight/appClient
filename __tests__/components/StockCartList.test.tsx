import { render } from "@testing-library/react-native";
import StockCartList from "@/components/demande/StockCartList";

const inventory = [
  { id: "p1", name: "Riz", stockLabel: "STOCK: 5", stockAvailable: 5 },
  { id: "p2", name: "Farine", stockLabel: "STOCK: 3", stockAvailable: 3 },
  { id: "p3", name: "Huile", stockLabel: "STOCK: 2", stockAvailable: 2 },
];

const cart = [
  { id: "p1", name: "Riz", qty: 1 },
  { id: "p2", name: "Farine", qty: 2 },
  { id: "p3", name: "Huile", qty: 1 },
];

describe("StockCartList", () => {
  it("shows every cart item in compact mode", () => {
    const { getByText, queryByText } = render(
      <StockCartList cart={cart} inventory={inventory} onChange={jest.fn()} compact />,
    );

    expect(getByText("Riz")).toBeTruthy();
    expect(getByText("Farine")).toBeTruthy();
    expect(getByText("Huile")).toBeTruthy();
    expect(queryByText(/\+1 autre/i)).toBeNull();
  });
});
