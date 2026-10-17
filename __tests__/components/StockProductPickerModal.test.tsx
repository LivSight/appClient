import { render, fireEvent } from "@testing-library/react-native";
import StockProductPickerModal from "@/components/demande/StockProductPickerModal";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/SolarIcon", () => {
  const { View } = require("react-native");
  return function MockSolarIcon() {
    return <View />;
  };
});

const inventory = [
  { id: "p1", name: "Riz", stockLabel: "Sac • STOCK: 5", stockAvailable: 5 },
];

describe("StockProductPickerModal", () => {
  it("requires 2 chars before showing products", () => {
    const onChangeCart = jest.fn();
    const { getByPlaceholderText, queryByText } = render(
      <StockProductPickerModal
        visible
        cart={[]}
        inventory={inventory}
        inventoryLoading={false}
        inventoryError={null}
        onClose={jest.fn()}
        onChangeCart={onChangeCart}
      />,
    );

    fireEvent.changeText(getByPlaceholderText(/Rechercher un produit/i), "R");
    expect(queryByText("Riz")).toBeNull();
    const search = getByPlaceholderText(/Rechercher un produit/i);
    fireEvent(search, "focus");
    fireEvent.changeText(search, "Ri");
    expect(queryByText("Riz")).toBeTruthy();
  });

  it("adds product to cart on select", () => {
    const onChangeCart = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <StockProductPickerModal
        visible
        cart={[]}
        inventory={inventory}
        inventoryLoading={false}
        inventoryError={null}
        onClose={jest.fn()}
        onChangeCart={onChangeCart}
      />,
    );

    const search = getByPlaceholderText(/Rechercher un produit/i);
    fireEvent(search, "focus");
    fireEvent.changeText(search, "Ri");
    fireEvent.press(getByText("Riz"));
    expect(onChangeCart).toHaveBeenCalledWith([{ id: "p1", name: "Riz", qty: 1 }]);
  });
});
