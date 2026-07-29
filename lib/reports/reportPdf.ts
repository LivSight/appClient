import { UIManager } from "react-native";
import { buildReportPdfRequest, type ReportKind } from "@/lib/api/reports";
import { logger } from "@/lib/logger";

export const PDF_MODULES_UNAVAILABLE_MESSAGE =
  "Le téléchargement de PDF nécessite une version plus récente de l'application.";

/**
 * expo-file-system / expo-sharing / react-native-webview are native modules
 * added after some dev builds were made. Loading them lazily keeps the
 * Rapports screen working on builds that don't ship them yet — only the PDF
 * features fail (or degrade), with a clear message, until the app is rebuilt.
 */
function loadNativeModules(): {
  FileSystem: typeof import("expo-file-system/legacy");
  Sharing: typeof import("expo-sharing");
} {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const FileSystem = require("expo-file-system/legacy");
    const Sharing = require("expo-sharing");
    /* eslint-enable @typescript-eslint/no-require-imports */
    // On builds made before these packages were added, require() can still
    // succeed while the native side is missing — validate the actual exports.
    if (
      typeof FileSystem?.downloadAsync !== "function" ||
      typeof FileSystem?.cacheDirectory !== "string" ||
      typeof Sharing?.isAvailableAsync !== "function" ||
      typeof Sharing?.shareAsync !== "function"
    ) {
      throw new Error("native exports missing");
    }
    return { FileSystem, Sharing };
  } catch (e: unknown) {
    logger.warn("reports", "native PDF modules unavailable", e);
    throw new Error(PDF_MODULES_UNAVAILABLE_MESSAGE);
  }
}

type WebViewComponent = typeof import("react-native-webview").WebView;

let cachedWebViewComponent: WebViewComponent | null | undefined;

function isWebViewNativeModuleRegistered(): boolean {
  if (typeof UIManager?.hasViewManagerConfig !== "function") return true;
  return UIManager.hasViewManagerConfig("RNCWebView");
}

/** Returns the WebView component, or null on builds without the native module. */
export function getWebViewComponent(): WebViewComponent | null {
  if (cachedWebViewComponent !== undefined) return cachedWebViewComponent;

  if (!isWebViewNativeModuleRegistered()) {
    cachedWebViewComponent = null;
    return null;
  }

  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { WebView } = require("react-native-webview");
    /* eslint-enable @typescript-eslint/no-require-imports */
    cachedWebViewComponent = WebView ?? null;
    return cachedWebViewComponent;
  } catch (e: unknown) {
    logger.warn("reports", "react-native-webview unavailable", e);
    cachedWebViewComponent = null;
    return null;
  }
}

/** True when the in-app PDF preview (react-native-webview) can be used on this build. */
export function isPdfPreviewAvailable(): boolean {
  try {
    if (!getWebViewComponent()) return false;
    loadNativeModules();
    return true;
  } catch {
    return false;
  }
}

export type CachedReportPdf = {
  fileUri: string;
  fileName: string;
};

/** Downloads a report PDF from the backend (authenticated) into the cache directory. */
export async function downloadReportPdfToCache(
  kind: ReportKind,
  startDate: string,
  endDate: string,
): Promise<CachedReportPdf> {
  const { FileSystem } = loadNativeModules();
  const { url, headers, fileName } = await buildReportPdfRequest(kind, startDate, endDate);
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

  logger.info("reports", `download ${kind} PDF`, { url });
  const result = await FileSystem.downloadAsync(url, fileUri, { headers });
  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status}`);
  }
  return { fileUri: result.uri, fileName };
}

/** Reads a cached PDF as base64 (for the in-app pdf.js preview). */
export async function readReportPdfBase64(fileUri: string): Promise<string> {
  const { FileSystem } = loadNativeModules();
  return FileSystem.readAsStringAsync(fileUri, { encoding: "base64" });
}

/** Opens the native share/preview sheet on an already-downloaded PDF. */
export async function shareCachedReportPdf(pdf: CachedReportPdf): Promise<void> {
  const { Sharing } = loadNativeModules();
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(pdf.fileUri, {
    mimeType: "application/pdf",
    dialogTitle: pdf.fileName,
    UTI: "com.adobe.pdf",
  });
}

/**
 * Downloads a report PDF from the backend (authenticated) into the cache
 * directory, then opens the native share/preview sheet.
 */
export async function downloadAndShareReportPdf(
  kind: ReportKind,
  startDate: string,
  endDate: string,
): Promise<void> {
  const pdf = await downloadReportPdfToCache(kind, startDate, endDate);
  await shareCachedReportPdf(pdf);
}
