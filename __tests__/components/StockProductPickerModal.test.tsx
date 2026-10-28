import { render, fireEvent, within } from "@testing-library/react-native";
import StockProductPickerModal from "@/components/demande/StockProductPickerModal";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/SolarIcon", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const { View } = require("react-native");
  return function MockSolarIcon() {
    return <View />;
  };
});

const inventory = [
  { id: "p1", name: "Riz", stockLabel: "Sac • STOCK: 5", stockAvailable: 5 },
  { id: "p2", name: "Farine", stockLabel: "STOCK: 3", stockAvailable: 3 },
];

describe("StockProductPickerModal", () => {
  it("shows all stock products when search is empty", () => {
    const { getByText } = render(
      <StockProductPickerModal
        visible
        cart={[]}
        inventory={inventory}
        inventoryLoading={false}
        inventoryError={null}
        onClose={jest.fn()}
        onChangeCart={jest.fn()}
      />,
    );

    expect(getByText("Riz")).toBeTruthy();
    expect(getByText("Farine")).toBeTruthy();
  });

  it("filters products by search text", () => {
    const { getByTestId } = render(
      <StockProductPickerModal
        visible
        cart={[]}
        inventory={inventory}
        inventoryLoading={false}
        inventoryError={null}
        onClose={jest.fn()}
        onChangeCart={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("stock-picker-search"), "Far");
    const list = within(getByTestId("stock-picker-list"));
    expect(list.getByText("Farine")).toBeTruthy();
    expect(list.queryByText("Riz")).toBeNull();
  });

  it("adds product to cart on select", () => {
    const onChangeCart = jest.fn();
    const { getByText } = render(
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

    fireEvent.press(getByText("Riz"));
    expect(onChangeCart).toHaveBeenCalledWith([{ id: "p1", name: "Riz", qty: 1 }]);
  });
});
