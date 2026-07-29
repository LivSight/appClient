import { UIManager } from "react-native";

describe("reportPdf WebView availability", () => {
  const originalHasViewManagerConfig = UIManager.hasViewManagerConfig;

  afterEach(() => {
    UIManager.hasViewManagerConfig = originalHasViewManagerConfig;
    jest.resetModules();
  });

  it("returns null without loading react-native-webview when native view is missing", () => {
    UIManager.hasViewManagerConfig = jest.fn((name: string) => name !== "RNCWebView");

    let getWebViewComponent: typeof import("@/lib/reports/reportPdf").getWebViewComponent;
    jest.isolateModules(() => {
      ({ getWebViewComponent } = require("@/lib/reports/reportPdf"));
    });

    expect(getWebViewComponent!()).toBeNull();
    expect(UIManager.hasViewManagerConfig).toHaveBeenCalledWith("RNCWebView");
  });

  it("isPdfPreviewAvailable is false when WebView native module is missing", () => {
    UIManager.hasViewManagerConfig = jest.fn(() => false);

    let isPdfPreviewAvailable: typeof import("@/lib/reports/reportPdf").isPdfPreviewAvailable;
    jest.isolateModules(() => {
      ({ isPdfPreviewAvailable } = require("@/lib/reports/reportPdf"));
    });

    expect(isPdfPreviewAvailable!()).toBe(false);
  });
});
