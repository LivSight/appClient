import { AuthError } from "@/lib/auth/authApi";
import {
  errorLabel,
  loginFailureReason,
  normalizeEndpoint,
  reachedScrollMilestones,
} from "@/lib/analytics/mappers";

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

describe("normalizeEndpoint", () => {
  it("strips origin and query, masks numeric ids", () => {
    expect(normalizeEndpoint("http://10.0.0.1:4040/api/users/42/transactions?keycloakId=abc")).toBe(
      "/api/users/:id/transactions",
    );
  });

  it("masks uuid segments", () => {
    expect(normalizeEndpoint("https://gw.livsight.com/api/tickets/e25791eb-c678-4bf8-acee-aa9117a7c819")).toBe(
      "/api/tickets/:id",
    );
  });

  it("keeps plain paths untouched", () => {
    expect(normalizeEndpoint("http://localhost:4040/api/packages")).toBe("/api/packages");
    expect(normalizeEndpoint("/api/push-tokens")).toBe("/api/push-tokens");
  });
});

describe("reachedScrollMilestones", () => {
  it("returns no milestone near the top", () => {
    expect(reachedScrollMilestones(0, 800, 2000)).toEqual([]);
  });

  it("returns 50 at half depth", () => {
    expect(reachedScrollMilestones(600, 800, 2000)).toEqual([50]);
  });

  it("returns both milestones at the bottom", () => {
    expect(reachedScrollMilestones(1200, 800, 2000)).toEqual([50, 100]);
  });

  it("treats non-scrollable content as fully read", () => {
    expect(reachedScrollMilestones(0, 800, 600)).toEqual([50, 100]);
  });
});
