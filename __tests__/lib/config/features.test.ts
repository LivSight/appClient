import { isExpressDeliveryUiEnabled } from "@/lib/config/features";

describe("features", () => {
  it("disables express delivery UI for clients", () => {
    expect(isExpressDeliveryUiEnabled()).toBe(false);
  });
});
