import { apiFetch } from "@/lib/api/client";
import { deletePushToken, registerPushToken } from "@/lib/api/pushTokens";

jest.mock("@/lib/api/client", () => ({
  apiFetch: jest.fn(),
}));

const API_BASE = "http://localhost:4040";

describe("pushTokens API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POSTs token, platform and app to /api/push-tokens", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });

    await registerPushToken("ExponentPushToken[abc]");

    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/push-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expoPushToken: "ExponentPushToken[abc]",
        platform: "ios",
        app: "client",
      }),
    });
  });

  it("DELETEs specific token when provided", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });

    await deletePushToken("ExponentPushToken[abc]");

    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/push-tokens`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expoPushToken: "ExponentPushToken[abc]" }),
    });
  });

  it("DELETEs all tokens when no token provided", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });

    await deletePushToken();

    expect(apiFetch).toHaveBeenCalledWith(`${API_BASE}/api/push-tokens`, {
      method: "DELETE",
      headers: undefined,
      body: undefined,
    });
  });
});
