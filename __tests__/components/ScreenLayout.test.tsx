import { render } from "@testing-library/react-native";
import AppText from "@/components/AppText";
import ScreenLayout from "@/components/ScreenLayout";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/hooks/useKeyboardVisible", () => ({
  useKeyboardInsets: () => ({ visible: false, height: 0 }),
}));

jest.mock("@/components/HeroGridBackground", () => () => null);

jest.mock("@/components/AppScrollView", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const { ScrollView } = require("react-native");
  const MockAppScrollView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => (
    <ScrollView ref={ref} testID="app-scroll-view" {...props} />
  ));
  MockAppScrollView.displayName = "MockAppScrollView";
  return MockAppScrollView;
});

describe("ScreenLayout pull-to-refresh", () => {
  it("wires RefreshControl when onRefresh is provided", () => {
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ScreenLayout refreshing onRefresh={onRefresh}>
        <AppText>Content</AppText>
      </ScreenLayout>,
    );

    const scrollView = getByTestId("app-scroll-view");
    expect(scrollView.props.refreshControl).toBeTruthy();
    expect(scrollView.props.refreshControl.props.refreshing).toBe(true);
    scrollView.props.refreshControl.props.onRefresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
