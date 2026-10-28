import { render, fireEvent, waitFor } from "@testing-library/react-native";
import DemandeWizard from "@/components/demande/DemandeWizard";
import { todayIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("@/components/SolarIcon", () => {
  const { View } = require("react-native");
  return function MockSolarIcon() {
    return <View />;
  };
});

jest.mock("@/components/CenteredScreenHeader", () => {
  const { View, Text } = require("react-native");
  return function MockHeader({ title }: { title: string }) {
    return (
      <View>
        <Text>{title}</Text>
      </View>
    );
  };
});

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: () => mockBack(),
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/hooks/useKeyboardVisible", () => ({
  useKeyboardInsets: () => ({ visible: false, height: 0 }),
}));

jest.mock("@/lib/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }),
}));

jest.mock("@/lib/hooks/useDeliveryFeeSettings", () => ({
  useDeliveryFeeSettings: () => ({ expressFee: 500, pickupFee: 1000 }),
}));

jest.mock("@/lib/api/packages", () => ({
  listPackages: jest.fn(async () => [
    { package_name: "Riz", quantity: 5, description: "Sac" },
  ]),
  makeClientId: () => "p1",
}));

jest.mock("@/lib/haptics", () => ({
  hapticSuccess: jest.fn(async () => undefined),
  hapticError: jest.fn(async () => undefined),
}));

jest.mock("@/components/HeroGridBackground", () => () => null);

describe("DemandeWizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders step 1 with date field and suivant button", () => {
    const { getByTestId, getByText } = render(<DemandeWizard flow="livraison" />);
    expect(getByTestId("delivery-date-field")).toBeTruthy();
    expect(getByText("Suivant")).toBeTruthy();
    expect(getByText("Quand")).toBeTruthy();
  });

  it("blocks step 2 when cart is empty for livraison stock", async () => {
    const { getByText } = render(<DemandeWizard flow="livraison" />);
    fireEvent.press(getByText("Suivant"));
    await waitFor(() => {
      expect(getByText("Choisir des produits")).toBeTruthy();
    });
    fireEvent.press(getByText("Suivant"));
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(getByText("Ajoutez au moins un produit de votre stock.")).toBeTruthy();
    });
  });

  it("navigates to resume on completed livraison stock flow", async () => {
    const { getByText, getByPlaceholderText } = render(<DemandeWizard flow="livraison" />);
    fireEvent.press(getByText("Suivant"));
    await waitFor(() => {
      expect(getByText("Choisir des produits")).toBeTruthy();
    });
    fireEvent.press(getByText("Choisir des produits"));
    const search = getByPlaceholderText(/Rechercher un produit/i);
    fireEvent(search, "focus");
    fireEvent.changeText(search, "Ri");
    fireEvent.press(getByText("Riz"));
    fireEvent.press(getByText("Valider la sélection"));
    fireEvent.press(getByText("Suivant"));
    await waitFor(() => {
      expect(getByPlaceholderText("6XXXXXXX")).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText("6XXXXXXX"), "670000000");
    fireEvent.changeText(getByPlaceholderText("Ex: Bastos"), "Bastos");
    fireEvent.press(getByText("Continuer"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/resume-produit-en-stock",
          params: expect.objectContaining({
            phone: "670000000",
            deliveryQuartier: "Bastos",
            scheduledDeliveryDate: todayIsoInSchedulingTimezone(),
          }),
        }),
      );
    });
  });
});
