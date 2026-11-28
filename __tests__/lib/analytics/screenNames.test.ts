import {
  captureScreenTransition,
  resolveScreenName,
  shouldCaptureScreen,
} from "@/lib/analytics/screenNames";

describe("resolveScreenName", () => {
  it("maps tab and auth routes to stable names", () => {
    expect(resolveScreenName("/")).toBe("accueil");
    expect(resolveScreenName("")).toBe("accueil");
    expect(resolveScreenName("/login")).toBe("login");
    expect(resolveScreenName("/livraison")).toBe("courses");
    expect(resolveScreenName("/tarifs")).toBe("tarifs");
    expect(resolveScreenName("/rapports")).toBe("rapports");
    expect(resolveScreenName("/stock")).toBe("stock");
    expect(resolveScreenName("/inbox")).toBe("conversations");
  });

  it("maps detail and flow routes, stripping dynamic ids", () => {
    expect(resolveScreenName("/livraison-detail/42")).toBe("livraison_detail");
    expect(resolveScreenName("/expedition-detail/e25791eb-c678-4bf8-acee-aa9117a7c819")).toBe(
      "expedition_detail",
    );
    expect(resolveScreenName("/inbox/99")).toBe("conversation_detail");
    expect(resolveScreenName("/tarifs-zone/3")).toBe("tarifs_zone");
    expect(resolveScreenName("/resume-produit-en-stock")).toBe("resume_produit_en_stock");
    expect(resolveScreenName("/ma-demande-livraison")).toBe("ma_demande_livraison");
    expect(resolveScreenName("/profile")).toBe("profil");
    expect(resolveScreenName("/rapport-pdf-preview")).toBe("rapport_pdf_preview");
  });

  it("ignores query strings and group segments", () => {
    expect(resolveScreenName("/stock?addedName=foo")).toBe("stock");
    expect(resolveScreenName("/(tabs)/livraison")).toBe("courses");
  });

  it("falls back to sanitized snake_case without leaking ids", () => {
    expect(resolveScreenName("/future-screen/123")).toBe("future_screen");
    expect(resolveScreenName("/weird_path")).toBe("weird_path");
  });
});

describe("shouldCaptureScreen", () => {
  it("captures when the screen name changes", () => {
    expect(shouldCaptureScreen(null, "accueil")).toBe(true);
    expect(shouldCaptureScreen("accueil", "courses")).toBe(true);
  });

  it("skips empty or duplicate names (re-render dedupe)", () => {
    expect(shouldCaptureScreen(null, "")).toBe(false);
    expect(shouldCaptureScreen("accueil", "accueil")).toBe(false);
    expect(shouldCaptureScreen("accueil", null)).toBe(false);
  });
});

describe("captureScreenTransition", () => {
  it("emits once per navigation and dedupes repeats", () => {
    const screen = jest.fn();
    const first = captureScreenTransition(null, "/livraison", screen);
    expect(first).toBe("courses");
    expect(screen).toHaveBeenCalledWith("courses");

    const same = captureScreenTransition(first, "/livraison", screen);
    expect(same).toBe("courses");
    expect(screen).toHaveBeenCalledTimes(1);

    const next = captureScreenTransition(same, "/stock", screen);
    expect(next).toBe("stock");
    expect(screen).toHaveBeenCalledWith("stock");
    expect(screen).toHaveBeenCalledTimes(2);
  });
});
