import { getAnalyticsClient, resetAnalyticsClientForTesting } from "@/lib/analytics/client";
import { getPostHogConfig } from "@/lib/analytics/posthogConfig";

const mockPosthogCtor = jest.fn();

jest.mock("posthog-react-native", () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      mockPosthogCtor(...args);
    }
  },
}));

jest.mock("@/lib/analytics/posthogConfig", () => ({
  getPostHogConfig: jest.fn(),
}));

describe("getAnalyticsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAnalyticsClientForTesting();
  });

  it("returns null when no config (analytics disabled)", () => {
    (getPostHogConfig as jest.Mock).mockReturnValue(null);

    expect(getAnalyticsClient()).toBeNull();
    expect(mockPosthogCtor).not.toHaveBeenCalled();
  });

  it("builds the client from config and memoizes it", () => {
    (getPostHogConfig as jest.Mock).mockReturnValue({
      apiKey: "phc_test",
      host: "https://eu.i.posthog.com",
    });

    const first = getAnalyticsClient();
    const second = getAnalyticsClient();

    expect(first).toBe(second);
    expect(mockPosthogCtor).toHaveBeenCalledTimes(1);
    expect(mockPosthogCtor).toHaveBeenCalledWith("phc_test", { host: "https://eu.i.posthog.com" });
  });

  it("memoizes the disabled state too", () => {
    (getPostHogConfig as jest.Mock).mockReturnValue(null);

    getAnalyticsClient();
    getAnalyticsClient();

    expect(getPostHogConfig).toHaveBeenCalledTimes(1);
  });
});
