import { AuthError } from "@/lib/auth/authApi";
import { errorLabel, loginFailureReason } from "@/lib/analytics/mappers";

describe("loginFailureReason", () => {
  it("maps 4xx auth errors to identifiants", () => {
    expect(loginFailureReason(new AuthError("bad", 401))).toBe("identifiants");
    expect(loginFailureReason(new AuthError("bad", 400))).toBe("identifiants");
  });

  it("maps 5xx auth errors to serveur", () => {
    expect(loginFailureReason(new AuthError("down", 500))).toBe("serveur");
    expect(loginFailureReason(new AuthError("down", 503))).toBe("serveur");
  });

  it("maps statusless errors to reseau", () => {
    expect(loginFailureReason(new TypeError("Network request failed"))).toBe("reseau");
    expect(loginFailureReason(new AuthError("no status"))).toBe("reseau");
  });

  it("maps anything else to inconnue", () => {
    expect(loginFailureReason("weird")).toBe("inconnue");
    expect(loginFailureReason(null)).toBe("inconnue");
  });
});

describe("errorLabel", () => {
  it("returns the error message, truncated", () => {
    expect(errorLabel(new Error("Session expirée"))).toBe("Session expirée");
    expect(errorLabel(new Error("x".repeat(200)))).toHaveLength(120);
  });

  it("falls back to inconnue for non-errors", () => {
    expect(errorLabel("boom")).toBe("inconnue");
    expect(errorLabel(undefined)).toBe("inconnue");
  });
});
