import { formatDbText, toTitleCase } from "@/lib/formatDisplayText";

describe("toTitleCase", () => {
  it("title-cases all-caps product names with French particles", () => {
    expect(toTitleCase("FARINE DE BLÉ")).toBe("Farine de Blé");
  });

  it("title-cases lowercase neighborhood names", () => {
    expect(toTitleCase("makepe")).toBe("Makepe");
  });

  it("title-cases each segment around em dash and arrow separators", () => {
    expect(toTitleCase("MAKEPE — YAOUNDÉ")).toBe("Makepe — Yaoundé");
    expect(toTitleCase("douala → yaoundé")).toBe("Douala → Yaoundé");
  });

  it("keeps quantity suffixes readable", () => {
    expect(toTitleCase("2 robes + 1 sac")).toBe("2 Robes + 1 Sac");
  });

  it("returns empty string unchanged", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("   ")).toBe("");
  });
});

describe("formatDbText", () => {
  it("preserves emails, phones, and transaction refs", () => {
    expect(formatDbText("client@example.com")).toBe("client@example.com");
    expect(formatDbText("+237 699 00 00 00")).toBe("+237 699 00 00 00");
    expect(formatDbText("TR-48291")).toBe("TR-48291");
  });

  it("formats nullish values to empty string", () => {
    expect(formatDbText(null)).toBe("");
    expect(formatDbText(undefined)).toBe("");
  });

  it("formats person names from the API", () => {
    expect(formatDbText("eric djoutousse")).toBe("Eric Djoutousse");
  });
});
