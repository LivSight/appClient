import { DEFAULT_POSTHOG_HOST, getPostHogConfig } from "@/lib/analytics/posthogConfig";

describe("getPostHogConfig", () => {
  it("returns null when the API key is missing or blank", () => {
    expect(getPostHogConfig({ apiKey: undefined })).toBeNull();
    expect(getPostHogConfig({ apiKey: "" })).toBeNull();
    expect(getPostHogConfig({ apiKey: "   " })).toBeNull();
  });

  it("returns the key with the EU host by default", () => {
    expect(getPostHogConfig({ apiKey: "phc_test" })).toEqual({
      apiKey: "phc_test",
      host: DEFAULT_POSTHOG_HOST,
    });
    expect(DEFAULT_POSTHOG_HOST).toBe("https://eu.i.posthog.com");
  });

  it("uses the provided host when set", () => {
    expect(getPostHogConfig({ apiKey: "phc_test", host: "https://us.i.posthog.com" })).toEqual({
      apiKey: "phc_test",
      host: "https://us.i.posthog.com",
    });
  });

  it("trims key and host", () => {
    expect(getPostHogConfig({ apiKey: " phc_test ", host: " https://eu.i.posthog.com " })).toEqual({
      apiKey: "phc_test",
      host: "https://eu.i.posthog.com",
    });
  });
});
