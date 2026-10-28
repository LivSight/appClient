import { getAnalyticsClient } from "@/lib/analytics/client";
import { track } from "@/lib/analytics/events";

jest.mock("@/lib/analytics/client", () => ({
  getAnalyticsClient: jest.fn(),
}));

describe("track", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is a no-op when analytics are disabled", () => {
    (getAnalyticsClient as jest.Mock).mockReturnValue(null);

    expect(() => track("connexion_reussie")).not.toThrow();
  });

  it("captures the event with its properties", () => {
    const capture = jest.fn();
    (getAnalyticsClient as jest.Mock).mockReturnValue({ capture });

    track("demande_soumise", { flow: "livraison", source: "stock", nb_produits: 3 });

    expect(capture).toHaveBeenCalledWith("demande_soumise", {
      flow: "livraison",
      source: "stock",
      nb_produits: 3,
    });
  });

  it("captures prop-less events without properties", () => {
    const capture = jest.fn();
    (getAnalyticsClient as jest.Mock).mockReturnValue({ capture });

    track("connexion_reussie");

    expect(capture).toHaveBeenCalledWith("connexion_reussie", undefined);
  });

  it("never throws when capture fails", () => {
    (getAnalyticsClient as jest.Mock).mockReturnValue({
      capture: jest.fn(() => {
        throw new Error("boom");
      }),
    });

    expect(() => track("connexion_reussie")).not.toThrow();
  });
});
