import { resolveIdentityAction } from "@/lib/analytics/identity";

describe("resolveIdentityAction", () => {
  it("identifies when a user logs in", () => {
    expect(resolveIdentityAction("kc-123", null)).toBe("identify");
  });

  it("identifies when the account changes", () => {
    expect(resolveIdentityAction("kc-456", "kc-123")).toBe("identify");
  });

  it("resets when the user logs out", () => {
    expect(resolveIdentityAction(null, "kc-123")).toBe("reset");
  });

  it("does nothing while anonymous", () => {
    expect(resolveIdentityAction(null, null)).toBe("none");
  });

  it("does nothing when the same user stays logged in", () => {
    expect(resolveIdentityAction("kc-123", "kc-123")).toBe("none");
  });
});
