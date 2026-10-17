import { shouldRegisterPushNotifications } from "@/lib/push/pushConfig";

describe("shouldRegisterPushNotifications", () => {
  it("is disabled in dev unless EXPO_PUBLIC_ENABLE_PUSH is set", () => {
    expect(shouldRegisterPushNotifications({ dev: true, enablePushEnv: undefined })).toBe(false);
    expect(shouldRegisterPushNotifications({ dev: true, enablePushEnv: "" })).toBe(false);
    expect(shouldRegisterPushNotifications({ dev: true, enablePushEnv: "true" })).toBe(true);
    expect(shouldRegisterPushNotifications({ dev: true, enablePushEnv: "1" })).toBe(true);
  });

  it("is enabled in production builds", () => {
    expect(shouldRegisterPushNotifications({ dev: false, enablePushEnv: undefined })).toBe(true);
  });

  it("is blocked in dev when the gateway points to production, even with the flag on", () => {
    expect(
      shouldRegisterPushNotifications({
        dev: true,
        enablePushEnv: "true",
        gatewayUrl: "https://gateway.livsight.com",
      }),
    ).toBe(false);
  });

  it("allows dev push against staging and local gateways", () => {
    expect(
      shouldRegisterPushNotifications({
        dev: true,
        enablePushEnv: "true",
        gatewayUrl: "https://staging-gateway.livsight.com",
      }),
    ).toBe(true);
    expect(
      shouldRegisterPushNotifications({
        dev: true,
        enablePushEnv: "true",
        gatewayUrl: "http://10.192.87.24:4040",
      }),
    ).toBe(true);
  });

  it("stays enabled in production builds regardless of gateway", () => {
    expect(
      shouldRegisterPushNotifications({
        dev: false,
        gatewayUrl: "https://gateway.livsight.com",
      }),
    ).toBe(true);
  });
});
