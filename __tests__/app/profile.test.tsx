import React from "react";
import { Alert, Linking } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ProfileScreen from "@/app/profile";

const mockLogout = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    replace: (...args: unknown[]) => mockReplace(...args),
    push: jest.fn(),
  },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    logout: mockLogout,
    login: jest.fn(),
    isAuthenticated: true,
    isLoading: false,
    user: { keycloakId: "5785160a-6c5c-44d5-96fd-d28aa677d8d4", email: "snake123@example.com" },
  }),
}));

const mockGetCurrentUser = jest.fn(async () => ({
  id: 3,
  first_name: "Snake",
  last_name: "User",
  email: "snake123@example.com",
  phone: "+221 77 000 00 00",
}));

jest.mock("@/lib/auth/currentUser", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getCurrentUserId: jest.fn(),
  resetCurrentUserIdCache: jest.fn(),
}));

jest.mock("expo-router/react-navigation", () => ({
  useFocusEffect: (cb: () => void) => {
    const React = require("react");
    React.useEffect(() => cb(), [cb]);
  },
}));

jest.mock("@/lib/haptics", () => ({
  hapticLight: jest.fn(async () => undefined),
}));

jest.mock("@/components/SolarIcon", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: () => <View />,
  };
});

jest.mock("@/components/ScreenLayout", () => {
  const React = require("react");
  const { View, ScrollView } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) => (
      <View testID="screen-layout">
        {header}
        <ScrollView>{children}</ScrollView>
      </View>
    ),
  };
});

function renderProfile() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ProfileScreen />
    </SafeAreaProvider>,
  );
}

/** Presses the given button (by label) of the most recent Alert.alert call. */
function pressAlertButton(alertSpy: jest.SpyInstance, label: string) {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1]?.[2] as
    | { text?: string; onPress?: () => void }[]
    | undefined;
  const button = buttons?.find((b) => b.text === label);
  expect(button).toBeTruthy();
  button?.onPress?.();
}

describe("ProfileScreen", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogout.mockReset();
    mockReplace.mockReset();
    mockLogout.mockResolvedValue(undefined);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue({
      id: 3,
      first_name: "Snake",
      last_name: "User",
      email: "snake123@example.com",
      phone: "+221 77 000 00 00",
    });
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("shows name, email, and avatar after load", async () => {
    const screen = renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Snake User")).toBeTruthy();
      expect(screen.getByText("snake123@example.com")).toBeTruthy();
      expect(screen.getByTestId("profile-avatar")).toBeTruthy();
    });
  });

  it("shows a friendly error and retry when profile load fails", async () => {
    mockGetCurrentUser.mockRejectedValueOnce(new Error("Network error"));

    const screen = renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Impossible de charger votre profil")).toBeTruthy();
      expect(screen.getByText("Vérifiez votre connexion internet et réessayez.")).toBeTruthy();
      expect(screen.queryByText("Network error")).toBeNull();
    });
  });

  it("shows an error when the user cannot be resolved", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null as never);

    const screen = renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Impossible de charger votre profil")).toBeTruthy();
      expect(screen.getByText("Vos informations sont introuvables. Veuillez vous reconnecter.")).toBeTruthy();
    });
  });

  it("logs out and redirects to login after confirmation", async () => {
    const screen = renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Snake User")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("profile-logout"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Déconnexion", expect.any(String), expect.any(Array));
    });
    expect(mockLogout).not.toHaveBeenCalled();

    pressAlertButton(alertSpy, "Se déconnecter");

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("shows an alert when logout fails", async () => {
    mockLogout.mockRejectedValueOnce(new Error("offline"));

    const screen = renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Snake User")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("profile-logout"));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Déconnexion", expect.any(String), expect.any(Array));
    });
    pressAlertButton(alertSpy, "Se déconnecter");

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Déconnexion impossible", expect.any(String));
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("opens a mailto deletion request after confirmation", async () => {
    const openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);

    const screen = renderProfile();

    await waitFor(() => {
      expect(screen.getByText("Snake User")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("profile-delete-account"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Supprimer le compte", expect.any(String), expect.any(Array));
    });

    pressAlertButton(alertSpy, "Demander la suppression");

    await waitFor(() => {
      expect(openURLSpy).toHaveBeenCalledTimes(1);
    });

    const url = openURLSpy.mock.calls[0][0] as string;
    expect(url).toContain("mailto:livsight@gmail.com");
    expect(url).toContain(encodeURIComponent("snake123@example.com"));

    openURLSpy.mockRestore();
  });
});
