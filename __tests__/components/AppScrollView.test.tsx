import { render } from "@testing-library/react-native";
import AppText from "@/components/AppText";
import AppScrollView from "@/components/AppScrollView";

jest.mock("react-native-gesture-handler", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const { ScrollView } = require("react-native");
  const MockScrollView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => (
    <ScrollView ref={ref} testID="gesture-scroll-view" {...props} />
  ));
  MockScrollView.displayName = "MockGestureScrollView";
  return {
    ScrollView: MockScrollView,
  };
});

describe("AppScrollView", () => {
  it("renders children inside a gesture-handler ScrollView", () => {
    const { getByText, getByTestId } = render(
      <AppScrollView>
        <AppText>Scrollable content</AppText>
      </AppScrollView>,
    );

    expect(getByTestId("gesture-scroll-view")).toBeTruthy();
    expect(getByText("Scrollable content")).toBeTruthy();
  });

  it("enables nested scroll and interactive keyboard dismiss by default", () => {
    const { getByTestId } = render(
      <AppScrollView>
        <AppText>Content</AppText>
      </AppScrollView>,
    );

    const scrollView = getByTestId("gesture-scroll-view");
    expect(scrollView.props.nestedScrollEnabled).toBe(true);
    expect(scrollView.props.keyboardDismissMode).toBe("interactive");
    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
  });
});
