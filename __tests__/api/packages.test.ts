import { apiFetch } from "@/lib/api/client";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import {
  createPackage,
  listPackages,
  makeClientId,
  type Package,
} from "@/lib/api/packages";

jest.mock("@/lib/api/client", () => ({
  apiFetch: jest.fn(),
}));

jest.mock("@/lib/auth/currentUser", () => ({
  getCurrentUserId: jest.fn(),
}));

const API_BASE = "http://localhost:4040";

const mockApiFetch = apiFetch as jest.Mock;
const mockGetCurrentUserId = getCurrentUserId as jest.Mock;

function mockApiResponse(status: number, body: unknown) {
  const rawText = typeof body === "string" ? body : JSON.stringify(body);
  mockApiFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => rawText,
  });
}

describe("makeClientId", () => {
  it("is stable for the same input", () => {
    const a: Package = { package_name: "Farine", description: "Bio", quantity: 5, defective_quantity: 0, user_id: 3 };
    const b: Package = { package_name: "Farine", description: "Bio", quantity: 5, defective_quantity: 0, user_id: 3 };
    expect(makeClientId(a)).toBe(makeClientId(b));
  });

  it("differs across different (user_id, package_name) pairs", () => {
    const a: Package = { package_name: "Farine", description: "", quantity: 1, defective_quantity: 0, user_id: 3 };
    const b: Package = { package_name: "Sucre", description: "", quantity: 1, defective_quantity: 0, user_id: 3 };
    const c: Package = { package_name: "Farine", description: "", quantity: 1, defective_quantity: 0, user_id: 5 };
    expect(makeClientId(a)).not.toBe(makeClientId(b));
    expect(makeClientId(a)).not.toBe(makeClientId(c));
  });

  it("does not change when quantity changes (so React keys stay stable)", () => {
    const before: Package = { package_name: "Farine", description: "Bio", quantity: 1, defective_quantity: 0, user_id: 3 };
    const after: Package = { package_name: "Farine", description: "Bio", quantity: 99, defective_quantity: 0, user_id: 3 };
    expect(makeClientId(before)).toBe(makeClientId(after));
  });
});

describe("packages API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue(3);
  });

  describe("createPackage", () => {
    it("POSTs to /api/packages/create-package with the resolved user_id", async () => {
      mockApiResponse(200, {
        package_name: "Farine de Blé",
        description: "Sac 50kg",
        quantity: 4,
        user_id: 3,
      });

      await createPackage({ package_name: "Farine de Blé", description: "Sac 50kg", quantity: 4 });

      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockApiFetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/api/packages/create-package`);
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        package_name: "Farine de Blé",
        description: "Sac 50kg",
        quantity: 4,
        user_id: 3,
      });
    });

    it("defaults blank description to 'Aucune description'", async () => {
      mockApiResponse(200, {
        package_name: "Sucre",
        description: "Aucune description",
        quantity: 1,
        user_id: 3,
      });

      await createPackage({ package_name: "Sucre", description: "   ", quantity: 1 });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1].body as string);
      expect(body.description).toBe("Aucune description");
    });

    it("defaults missing description to 'Aucune description'", async () => {
      mockApiResponse(200, {
        package_name: "Sel",
        description: "Aucune description",
        quantity: 2,
        user_id: 3,
      });

      await createPackage({ package_name: "Sel", quantity: 2 });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1].body as string);
      expect(body.description).toBe("Aucune description");
    });

    it("coerces quantity to a non-negative integer", async () => {
      mockApiResponse(200, {
        package_name: "Riz",
        description: "x",
        quantity: 0,
        user_id: 3,
      });

      await createPackage({ package_name: "Riz", description: "x", quantity: -3.7 });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1].body as string);
      expect(body.quantity).toBe(0);
    });

    it("uses an explicit user_id when provided", async () => {
      mockApiResponse(200, {
        package_name: "Pâtes",
        description: "x",
        quantity: 1,
        user_id: 5,
      });

      await createPackage({ package_name: "Pâtes", description: "x", quantity: 1, user_id: 5 });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1].body as string);
      expect(body.user_id).toBe(5);
      expect(mockGetCurrentUserId).not.toHaveBeenCalled();
    });

    it("throws with the server message on non-2xx", async () => {
      mockApiResponse(404, "User not found");

      await expect(
        createPackage({ package_name: "X", description: "x", quantity: 1 }),
      ).rejects.toThrow("User not found");
    });

    it("throws when no session user is available", async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      await expect(
        createPackage({ package_name: "X", description: "x", quantity: 1 }),
      ).rejects.toThrow(/session/i);
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("listPackages", () => {
    it("GETs /api/packages and filters items to the current user_id", async () => {
      mockApiResponse(200, [
        { package_name: "Mine A", description: "a", quantity: 1, user_id: 3 },
        { package_name: "Other", description: "o", quantity: 9, user_id: 5 },
        { package_name: "Mine B", description: "b", quantity: 2, user_id: 3 },
      ]);

      const result = await listPackages();

      expect(mockApiFetch).toHaveBeenCalledWith(`${API_BASE}/api/packages`, { method: "GET" });
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.package_name).sort()).toEqual(["Mine A", "Mine B"]);
    });

    it("preserves defective_quantity from the API (defaults missing to 0)", async () => {
      mockApiResponse(200, [
        {
          id: 10,
          package_name: "Farine",
          description: "a",
          quantity: 5,
          defective_quantity: 2,
          user_id: 3,
        },
        {
          package_name: "Sucre",
          description: "b",
          quantity: 1,
          user_id: 3,
        },
      ]);

      const result = await listPackages();

      expect(result).toEqual([
        expect.objectContaining({
          id: 10,
          package_name: "Farine",
          quantity: 5,
          defective_quantity: 2,
          user_id: 3,
        }),
        expect.objectContaining({
          package_name: "Sucre",
          quantity: 1,
          defective_quantity: 0,
          user_id: 3,
        }),
      ]);
    });

    it("parses the {data: []} envelope shape", async () => {
      mockApiResponse(200, {
        data: [
          { package_name: "Mine", description: "x", quantity: 1, user_id: 3 },
        ],
      });

      const result = await listPackages();

      expect(result).toHaveLength(1);
      expect(result[0].package_name).toBe("Mine");
    });

    it("returns an empty array when nothing matches the current user", async () => {
      mockApiResponse(200, [
        { package_name: "Other", description: "o", quantity: 1, user_id: 5 },
      ]);

      const result = await listPackages();
      expect(result).toEqual([]);
    });

    it("returns an empty array on an empty response", async () => {
      mockApiResponse(200, []);

      const result = await listPackages();
      expect(result).toEqual([]);
    });

    it("uses an explicit user_id when provided (no session lookup)", async () => {
      mockApiResponse(200, [
        { package_name: "A", description: "x", quantity: 1, user_id: 3 },
        { package_name: "B", description: "x", quantity: 1, user_id: 5 },
      ]);

      const result = await listPackages({ user_id: 5 });

      expect(mockGetCurrentUserId).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].package_name).toBe("B");
    });

    it("throws with the server message on non-2xx", async () => {
      mockApiResponse(500, { message: "Server error" });

      await expect(listPackages()).rejects.toThrow("Server error");
    });

    it("throws when no session user is available", async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      await expect(listPackages()).rejects.toThrow(/session/i);
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });
});
