import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../components/AppText";
import CenteredScreenHeader from "../components/CenteredScreenHeader";
import SolarIcon from "../components/SolarIcon";
import { colors, fonts, radii, spacing, typography } from "../theme/tokens";
import type { ReportKind } from "@/lib/api/reports";
import {
  downloadReportPdfToCache,
  getWebViewComponent,
  readReportPdfBase64,
  shareCachedReportPdf,
  type CachedReportPdf,
} from "@/lib/reports/reportPdf";
import { logger } from "@/lib/logger";

const PdfWebView = getWebViewComponent();

const TITLES: Record<ReportKind, string> = {
  settlement: "Relevé de solde",
  deliveries: "Rapport livraisons",
  expeditions: "Rapport expéditions",
  stock: "Rapport stock",
};

function resolveKind(raw: unknown): ReportKind {
  const s = String(raw ?? "").trim();
  if (s === "deliveries" || s === "expeditions" || s === "stock") return s;
  return "settlement";
}

/**
 * Android WebView cannot render PDFs natively, so both platforms go through
 * pdf.js (CDN) rendering each page to a canvas. The base64 payload only
 * contains [A-Za-z0-9+/=], safe to inline in the script.
 */
function buildPdfPreviewHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes" />
<style>
  body { margin: 0; padding: 8px 0 24px; background: #F8F9FA; }
  canvas.page { display: block; margin: 8px auto; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.12); border-radius: 4px; }
  #status { font-family: sans-serif; font-size: 13px; color: #6B7280; text-align: center; padding: 24px 16px; }
</style>
</head>
<body>
<div id="status">Chargement du document…</div>
<div id="pages"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
(function () {
  function fail(message) {
    document.getElementById("status").textContent = message;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage("error:" + message);
  }
  if (!window.pdfjsLib) { fail("Visionneuse PDF indisponible. Vérifiez votre connexion."); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  var raw = atob("__PDF_BASE64__");
  var bytes = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
    document.getElementById("status").style.display = "none";
    var container = document.getElementById("pages");
    var dpr = window.devicePixelRatio || 1;
    var width = document.documentElement.clientWidth;
    function renderPage(num) {
      if (num > pdf.numPages) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage("rendered");
        return;
      }
      pdf.getPage(num).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var scale = (width - 16) / base.width;
        var viewport = page.getViewport({ scale: scale * dpr });
        var canvas = document.createElement("canvas");
        canvas.className = "page";
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = viewport.width / dpr + "px";
        canvas.style.height = viewport.height / dpr + "px";
        container.appendChild(canvas);
        page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise.then(function () {
          renderPage(num + 1);
        });
      });
    }
    renderPage(1);
  }).catch(function (e) {
    fail("Impossible d'afficher le PDF." + (e && e.message ? " (" + e.message + ")" : ""));
  });
})();
</script>
</body>
</html>`.replace("__PDF_BASE64__", base64);
}

export default function RapportPdfPreviewScreen() {
  const params = useLocalSearchParams<{ kind?: string; start?: string; end?: string }>();
  const kind = resolveKind(params.kind);
  const start = typeof params.start === "string" ? params.start : "";
  const end = typeof params.end === "string" ? params.end : "";
  const insets = useSafeAreaInsets();

  const [pdf, setPdf] = useState<CachedReportPdf | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await downloadReportPdfToCache(kind, start, end);
        const base64 = await readReportPdfBase64(cached.fileUri);
        if (!mounted) return;
        setPdf(cached);
        setHtml(buildPdfPreviewHtml(base64));
      } catch (e: unknown) {
        if (!mounted) return;
        logger.warn("reports", "pdf preview load failed", e);
        setError(
          e instanceof Error && e.message.trim().length
            ? e.message
            : "Le rapport PDF n'a pas pu être chargé. Vérifiez votre connexion et réessayez.",
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [kind, start, end, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setHtml(null);
    setPdf(null);
    setAttempt((n) => n + 1);
  }, []);

  async function onShare() {
    if (!pdf || sharing) return;
    setSharing(true);
    try {
      await shareCachedReportPdf(pdf);
    } catch (e: unknown) {
      logger.warn("reports", "pdf share failed", e);
      Alert.alert("Partage impossible", String(e instanceof Error ? e.message : e));
    } finally {
      setSharing(false);
    }
  }

  const body = !PdfWebView ? (
    <View style={{ paddingHorizontal: spacing.screenPaddingX, marginTop: 18 }}>
      <View style={{ padding: 16, backgroundColor: colors.cardBg, borderRadius: radii.card }}>
        <AppText style={typography.bodyRegular} numberOfLines={4}>
          La prévisualisation PDF nécessite une version plus récente de l&apos;application. Utilisez le bouton de téléchargement en haut à droite.
        </AppText>
      </View>
    </View>
  ) : error ? (
    <View style={{ paddingHorizontal: spacing.screenPaddingX, marginTop: 18 }}>
      <View style={{ padding: 16, backgroundColor: colors.cardBg, borderRadius: radii.card }}>
        <AppText style={typography.bodyRegular} numberOfLines={5}>
          {error}
        </AppText>
        <Pressable
          onPress={retry}
          style={{ marginTop: 12, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.primary }}
        >
          <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodySemi, color: colors.white }} numberOfLines={1}>
            Réessayer
          </AppText>
        </Pressable>
      </View>
    </View>
  ) : !html ? (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText style={{ ...typography.subtitle, marginTop: 12 }} numberOfLines={2}>
        Chargement du rapport…
      </AppText>
    </View>
  ) : (
    <View
      style={{
        flex: 1,
        marginTop: 8,
        marginHorizontal: 12,
        marginBottom: Math.max(12, insets.bottom),
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.bg,
      }}
    >
      <PdfWebView
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(event) => {
          const message = String(event?.nativeEvent?.data ?? "");
          if (message.startsWith("error:")) {
            setError(message.slice("error:".length) || "Impossible d'afficher le PDF.");
          }
        }}
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: colors.bg }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: spacing.screenPaddingX }}>
        <CenteredScreenHeader
          title={TITLES[kind]}
          showBack
          compact
          rightSlot={
            <Pressable onPress={() => void onShare()} hitSlop={10} disabled={!pdf || sharing}>
              {sharing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <SolarIcon name="solar:download-outline" size={22} color={pdf ? colors.primary : "rgba(60,74,60,0.35)"} />
              )}
            </Pressable>
          }
        />
      </View>
      {body}
    </View>
  );
}
