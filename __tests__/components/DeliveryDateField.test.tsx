import { fireEvent, render } from "@testing-library/react-native";
import DeliveryDateField from "@/components/DeliveryDateField";
import { todayIsoInSchedulingTimezone, tomorrowIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";

jest.mock("@/components/SolarIcon", () => {
  const { View } = require("react-native");
  return function MockSolarIcon() {
    return <View />;
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockDateTimePicker() {
    return <View testID="mock-date-picker" />;
  };
});

describe("DeliveryDateField", () => {
  it("renders compact chips for today and tomorrow", () => {
    const onChange = jest.fn();
    const today = todayIsoInSchedulingTimezone();
    const { getByTestId } = render(
      <DeliveryDateField value={today} onChange={onChange} testID="delivery-date" />,
    );

    fireEvent.press(getByTestId("delivery-date-tomorrow"));
    expect(onChange).toHaveBeenCalledWith(tomorrowIsoInSchedulingTimezone());
  });

  it("opens the picker only when Autre is selected", () => {
    const onChange = jest.fn();
    const today = todayIsoInSchedulingTimezone();
    const { getByTestId, queryByTestId } = render(
      <DeliveryDateField value={today} onChange={onChange} testID="delivery-date" />,
    );

    expect(queryByTestId("mock-date-picker")).toBeNull();
    fireEvent.press(getByTestId("delivery-date-other"));
    expect(queryByTestId("mock-date-picker")).toBeTruthy();
  });
});
