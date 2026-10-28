import * as SecureStore from "expo-secure-store";
import {
  rememberRegisteredPushToken,
  getRegisteredPushToken,
  getRegisteredPushTokenAsync,
  clearRegisteredPushToken,
} from "@/lib/push/pushTokenStore";

import { deletePushToken } from "@/lib/api/pushTokens";
import { unregisterPushNotificationsAsync } from "@/lib/push/registerPushNotifications";

// Reset in-memory state between tests by clearing before each
beforeEach(() => {
  clearRegisteredPushToken();
  jest.clearAllMocks();
});

describe("pushTokenStore", () => {
  describe("rememberRegisteredPushToken", () => {
    it("stores token in memory", () => {
      rememberRegisteredPushToken("ExponentPushToken[abc123]");
      expect(getRegisteredPushToken()).toBe("ExponentPushToken[abc123]");
    });

    it("persists token to SecureStore", () => {
      rememberRegisteredPushToken("ExponentPushToken[abc123]");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "push_token_registered",
        "ExponentPushToken[abc123]",
      );
    });
  });

  describe("getRegisteredPushTokenAsync", () => {
    it("returns in-memory token when available", async () => {
      rememberRegisteredPushToken("ExponentPushToken[mem]");
      const token = await getRegisteredPushTokenAsync();
      expect(token).toBe("ExponentPushToken[mem]");
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it("falls back to SecureStore when memory is empty (e.g. after app restart)", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("ExponentPushToken[stored]");
      const token = await getRegisteredPushTokenAsync();
      expect(token).toBe("ExponentPushToken[stored]");
    });

    it("returns null when both memory and SecureStore are empty", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const token = await getRegisteredPushTokenAsync();
      expect(token).toBeNull();
    });
  });

  describe("clearRegisteredPushToken", () => {
    it("clears in-memory token and removes from SecureStore", () => {
      rememberRegisteredPushToken("ExponentPushToken[abc]");
      clearRegisteredPushToken();
      expect(getRegisteredPushToken()).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("push_token_registered");
    });
  });
});

// ── unregisterPushNotificationsAsync ─────────────────────────────────────────

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[test]" })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("@/lib/config/expoProject", () => ({
  getEASProjectId: jest.fn(() => "test-project-id"),
}));

jest.mock("@/lib/api/pushTokens", () => ({
  registerPushToken: jest.fn(async () => undefined),
  deletePushToken: jest.fn(async () => undefined),
}));

describe("unregisterPushNotificationsAsync", () => {
  it("calls deletePushToken with the in-memory token", async () => {
    rememberRegisteredPushToken("ExponentPushToken[mem]");
    await unregisterPushNotificationsAsync();
    expect(deletePushToken).toHaveBeenCalledWith("ExponentPushToken[mem]");
  });

  it("calls deletePushToken with token from SecureStore when memory is empty (app restart scenario)", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("ExponentPushToken[stored]");
    await unregisterPushNotificationsAsync();
    expect(deletePushToken).toHaveBeenCalledWith("ExponentPushToken[stored]");
  });

  it("does NOT call deletePushToken when no token is found anywhere", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    await unregisterPushNotificationsAsync();
    expect(deletePushToken).not.toHaveBeenCalled();
  });

  it("clears the token from memory and SecureStore after unregister", async () => {
    rememberRegisteredPushToken("ExponentPushToken[x]");
    await unregisterPushNotificationsAsync();
    expect(getRegisteredPushToken()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("push_token_registered");
  });

  it("still clears token even if deletePushToken throws", async () => {
    rememberRegisteredPushToken("ExponentPushToken[err]");
    (deletePushToken as jest.Mock).mockRejectedValueOnce(new Error("network"));
    await unregisterPushNotificationsAsync();
    expect(getRegisteredPushToken()).toBeNull();
  });
});
