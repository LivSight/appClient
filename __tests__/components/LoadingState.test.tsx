import { render } from "@testing-library/react-native";
import LoadingState from "@/components/LoadingState";

describe("LoadingState", () => {
  it("renders the spinner", () => {
    const { getByTestId } = render(<LoadingState />);
    expect(getByTestId("loading-state-spinner")).toBeTruthy();
  });

  it("renders the optional label", () => {
    const { getByText } = render(<LoadingState label="Chargement des rapports…" />);
    expect(getByText("Chargement des rapports…")).toBeTruthy();
  });

  it("renders no label by default", () => {
    const { queryByText } = render(<LoadingState />);
    expect(queryByText(/Chargement/)).toBeNull();
  });

  it("fills the screen in fullScreen mode", () => {
    const { getByTestId } = render(<LoadingState fullScreen />);
    expect(getByTestId("loading-state")).toHaveStyle({ flex: 1 });
  });
});
