import { useCallback, useMemo, useRef, useState } from "react";
import LoadingState from "@/components/LoadingState";
import {
  Alert,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { track } from "@/lib/analytics/events";
import { errorLabel, reachedScrollMilestones } from "@/lib/analytics/mappers";
import { useFocusEffect } from "expo-router/react-navigation";
import ScreenLayout from "../../components/ScreenLayout";
import MetricCard from "../../components/MetricCard";
import SolarIcon from "../../components/SolarIcon";
import StatusChipRow from "@/components/StatusChipRow";
import { colors, fonts, radii, shadows, typography } from "../../theme/tokens";
import AppText from "../../components/AppText";
import ReportCustomDateRange from "@/components/ReportCustomDateRange";
import {
  fetchDeliveryReport,
  fetchExpeditionReport,
  fetchSettlementReport,
  sourceCountsFromDeliveries,
  statusChipsFromSummary,
  toReportDateParam,
  type DeliveryReport,
  type ExpeditionReport,
  type ReportKind,
  type SettlementReport,
} from "@/lib/api/reports";
import { downloadAndShareReportPdf, isPdfPreviewAvailable, PDF_MODULES_UNAVAILABLE_MESSAGE } from "@/lib/reports/reportPdf";
import {
  dateRangeLabel,
  formatDeltaPct,
  formatPeriodLabel,
  formatXaf,
  parseReportRangeParam,
  reportPdfActionLabel,
  resolveReportPeriodBounds,
  type ReportRange,
} from "@/lib/reports/aggregateReports";
import { logger } from "@/lib/logger";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function safeCount(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

/** Montant signé : net_a_reverser peut être négatif (frais expédition > solde livraisons). */
function safeAmount(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

function formatXafSigned(n: number): string {
  return n < 0 ? `-${formatXaf(-n)}` : formatXaf(n);
}

const REPORT_RANGE_OPTIONS: ReportRange[] = ["Journalier", "Hier", "Hebdo", "Mensuel", "Personnalisé"];

function RangeToggle({
  value,
  onChange,
}: {
  value: ReportRange;
  onChange: (v: ReportRange) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 14 }}
      contentContainerStyle={{ gap: 6, paddingRight: 4 }}
    >
      {REPORT_RANGE_OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={{
              minHeight: 48,
              minWidth: 88,
              borderRadius: radii.pill,
              backgroundColor: active ? colors.white : "#F1F3F5",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <AppText
              variant="dense"
              style={{
                fontSize: 12,
                lineHeight: 17,
                fontFamily: active ? fonts.bodyBold : fonts.bodySemi,
                color: colors.text,
              }}
              numberOfLines={1}
            >
              {dateRangeLabel(option)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Same primary pill CTA pattern as Stock “Visualiser et télécharger”. */
function PdfButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      disabled={busy}
      style={{
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <AppText
          style={{
            fontSize: 14,
            lineHeight: 20,
            fontFamily: fonts.bodySemi,
            color: colors.white,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

export default function RapportsScreen() {
  const { range: rangeParam } = useLocalSearchParams<{ range?: string }>();
  const [range, setRange] = useState<ReportRange>(() => parseReportRangeParam(rangeParam) ?? "Journalier");
  const [customStart, setCustomStart] = useState(() => startOfMonth(new Date()));
  const [customEnd, setCustomEnd] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  // Deep link / notification: apply Journalier | Mensuel | … when `range` query is present.
  // State adjusted during render (React "adjusting state when a prop changes" pattern).
  const parsedRangeParam = parseReportRangeParam(Array.isArray(rangeParam) ? rangeParam[0] : rangeParam);
  const [appliedRangeParam, setAppliedRangeParam] = useState(parsedRangeParam);
  if (parsedRangeParam && parsedRangeParam !== appliedRangeParam) {
    setAppliedRangeParam(parsedRangeParam);
    setRange(parsedRangeParam);
  }
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementReport | null>(null);
  const [previousSettlement, setPreviousSettlement] = useState<SettlementReport | null>(null);
  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [previousReport, setPreviousReport] = useState<DeliveryReport | null>(null);
  const [expeditionReport, setExpeditionReport] = useState<ExpeditionReport | null>(null);
  const [previousExpeditionReport, setPreviousExpeditionReport] = useState<ExpeditionReport | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<ReportKind | null>(null);

  const period = useMemo(() => {
    const bounds = resolveReportPeriodBounds({ range, now: new Date(), customStart, customEnd });
    return {
      start: toReportDateParam(bounds.current.start),
      end: toReportDateParam(bounds.current.end),
      prevStart: toReportDateParam(bounds.previous.start),
      prevEnd: toReportDateParam(bounds.previous.end),
    };
  }, [range, customStart, customEnd]);

  const loadReports = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      try {
        if (mode === "initial") setLoading(true);
        if (mode === "refresh") setRefreshing(true);
        setError(null);

        // Relevé de solde : un seul appel porte livraisons + expéditions + net à reverser.
        // Best-effort : un backend sans /api/reports/settlement ne doit pas casser la page.
        const fetchSettlementSafe = (start: string, end: string) =>
          fetchSettlementReport(start, end).catch((e: unknown) => {
            logger.warn("rapports", "settlement report unavailable", e);
            return null;
          });

        const [settlementCurrent, settlementPrevious] = await Promise.all([
          fetchSettlementSafe(period.start, period.end),
          fetchSettlementSafe(period.prevStart, period.prevEnd),
        ]);

        if (settlementCurrent) {
          setSettlement(settlementCurrent);
          setPreviousSettlement(settlementPrevious);
          setReport(settlementCurrent.deliveries ?? null);
          setPreviousReport(settlementPrevious?.deliveries ?? null);
          setExpeditionReport(settlementCurrent.expeditions ?? null);
          setPreviousExpeditionReport(settlementPrevious?.expeditions ?? null);
        } else {
          // Fallback pré-settlement : rapports séparés (expéditions best-effort).
          const fetchExpeditionsSafe = (start: string, end: string) =>
            fetchExpeditionReport(start, end).catch((e: unknown) => {
              logger.warn("rapports", "expedition report unavailable", e);
              return null;
            });

          const [current, previous, expeditions, previousExpeditions] = await Promise.all([
            fetchDeliveryReport(period.start, period.end),
            fetchDeliveryReport(period.prevStart, period.prevEnd),
            fetchExpeditionsSafe(period.start, period.end),
            fetchExpeditionsSafe(period.prevStart, period.prevEnd),
          ]);
          setSettlement(null);
          setPreviousSettlement(null);
          setReport(current);
          setPreviousReport(previous);
          setExpeditionReport(expeditions);
          setPreviousExpeditionReport(previousExpeditions);
        }
      } catch (e: unknown) {
        logger.warn("rapports", "load failed", e);
        setError("Impossible de charger vos rapports. Vérifiez votre connexion et réessayez.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  const scrollMilestonesRef = useRef<Set<number>>(new Set());

  // Full loader only on the first load of a given period; refocusing the tab with
  // the same period refreshes silently so the content doesn't flash a spinner.
  const loadedPeriodRef = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      scrollMilestonesRef.current = new Set();
      const periodKey = `${period.start}|${period.end}`;
      const mode = loadedPeriodRef.current === periodKey ? "silent" : "initial";
      void loadReports(mode).finally(() => {
        loadedPeriodRef.current = periodKey;
      });
    }, [loadReports, period.start, period.end]),
  );

  function onReportScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    for (const milestone of reachedScrollMilestones(
      contentOffset.y,
      layoutMeasurement.height,
      contentSize.height,
    )) {
      if (!scrollMilestonesRef.current.has(milestone)) {
        scrollMilestonesRef.current.add(milestone);
        track("rapport_scroll", { profondeur: milestone });
      }
    }
  }

  const periodLabel = useMemo(
    () => formatPeriodLabel(range, new Date(), { start: customStart, end: customEnd }),
    [range, customStart, customEnd],
  );

  const statusChips = useMemo(
    () => statusChipsFromSummary(report?.status_summary),
    [report?.status_summary],
  );
  const sources = useMemo(() => sourceCountsFromDeliveries(report?.deliveries), [report?.deliveries]);

  // Sections conditionnées aux données (comme le PDF) : livraisons et expéditions
  // ne s'affichent que si la période en contient ; sinon état vide.
  const hasDeliveries = safeCount(report?.delivery_count) > 0;
  const hasExpeditions = safeCount(expeditionReport?.expedition_count) > 0;
  const hasActivity = hasDeliveries || hasExpeditions;

  const pdfPreviewAvailable = useMemo(() => isPdfPreviewAvailable(), []);

  async function onDownloadPdf(kind: ReportKind) {
    // Prévisualisation in-app quand le build le permet ; sinon partage direct (ancien flux).
    if (pdfPreviewAvailable) {
      router.push({
        pathname: "/rapport-pdf-preview",
        params: { kind, start: period.start, end: period.end, range },
      });
      return;
    }
    if (downloadingPdf) return;
    setDownloadingPdf(kind);
    try {
      await downloadAndShareReportPdf(kind, period.start, period.end);
      track("document_telecharge", { type_rapport: kind, periode: range, action: "telechargement" });
    } catch (e: unknown) {
      track("document_echec", { type_rapport: kind, erreur: errorLabel(e) });
      logger.warn("rapports", "pdf download failed", e);
      const message =
        e instanceof Error && e.message === PDF_MODULES_UNAVAILABLE_MESSAGE
          ? e.message
          : "Le rapport PDF n'a pas pu être téléchargé. Vérifiez votre connexion et réessayez.";
      Alert.alert("Téléchargement impossible", message);
    } finally {
      setDownloadingPdf(null);
    }
  }

  const body = loading ? (
    <LoadingState label="Chargement des rapports…" />
  ) : error ? (
    <View style={{ marginTop: 18, padding: 16, backgroundColor: colors.cardBg, borderRadius: radii.card }}>
      <AppText style={typography.bodyRegular} numberOfLines={4}>
        {error}
      </AppText>
      <Pressable
        onPress={() => void loadReports("initial")}
        style={{ marginTop: 12, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.primary }}
      >
        <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodySemi, color: colors.white }} numberOfLines={1}>
          Réessayer
        </AppText>
      </Pressable>
    </View>
  ) : (
    <>
      {!hasActivity ? (
        <View
          style={{
            marginTop: 18,
            paddingVertical: 32,
            paddingHorizontal: 24,
            backgroundColor: colors.cardBg,
            borderRadius: radii.card,
            alignItems: "center",
            ...shadows.card,
          }}
        >
          <SolarIcon name="solar:delivery-bold-duotone" size={40} color={"rgba(60,74,60,0.35)"} />
          <AppText
            style={{ marginTop: 12, fontSize: 15, lineHeight: 21, fontFamily: fonts.bodyBold, color: colors.text, textAlign: "center" }}
            numberOfLines={2}
          >
            Aucune activité sur cette période
          </AppText>
          <AppText
            variant="dense"
            style={{ marginTop: 6, fontSize: 12, lineHeight: 17, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)", textAlign: "center" }}
            numberOfLines={3}
          >
            Aucune livraison ni expédition entre ces dates. Modifiez la période pour voir vos rapports.
          </AppText>
        </View>
      ) : null}

      {hasDeliveries ? (
        <>
          <View style={{ marginTop: 18 }}>
            <AppText style={{ ...typography.sectionTitle, fontSize: 14, lineHeight: 20, marginBottom: 12 }} numberOfLines={1}>
              Livraisons enregistrées
            </AppText>
            <StatusChipRow
              chips={[
                { label: "Total", count: safeCount(report?.delivery_count), iconName: "solar:delivery-bold-duotone", color: colors.primary },
                { label: "En stock", count: sources.stock, iconName: "solar:box-bold-duotone", color: colors.primary },
                { label: "Ramassage", count: sources.pickup, iconName: "solar:hand-shake-bold", color: colors.primary },
              ]}
            />
          </View>

          <View style={{ marginTop: 18 }}>
            <AppText style={{ ...typography.sectionTitle, fontSize: 14, lineHeight: 20, marginBottom: 12 }} numberOfLines={1}>
              Statuts
            </AppText>
            <StatusChipRow
              chips={statusChips}
              scrollHintKey={statusChips.length > 4 ? `${period.start}_${period.end}` : undefined}
            />
          </View>
        </>
      ) : null}

      {hasDeliveries || (settlement && hasActivity) ? (
        <View style={{ marginTop: 18 }}>
          <AppText style={{ ...typography.sectionTitle, fontSize: 14, lineHeight: 20, marginBottom: 12 }} numberOfLines={1}>
            Comptabilité
          </AppText>
        </View>
      ) : null}
      {settlement && hasActivity ? (
        <View style={{ marginBottom: 16 }}>
          <MetricCard
            title="Montant à vous reverser"
            value={formatXafSigned(safeAmount(settlement.net_a_reverser))}
            suffix="FCFA"
            delta={formatDeltaPct(safeAmount(settlement.net_a_reverser), safeAmount(previousSettlement?.net_a_reverser))}
            iconName="solar:banknote-outline"
          />
        </View>
      ) : null}
      {hasDeliveries ? (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <MetricCard
              title="Total encaissé"
              value={formatXaf(safeCount(report?.total_encaisse))}
              suffix="FCFA"
              delta={formatDeltaPct(safeCount(report?.total_encaisse), safeCount(previousReport?.total_encaisse))}
              iconName="solar:wallet-bold-duotone"
              compact
            />
          </View>
          <View style={{ flex: 1 }}>
            <MetricCard
              title="Frais de livraison"
              value={formatXaf(safeCount(report?.total_tarifs))}
              suffix="FCFA"
              delta={formatDeltaPct(safeCount(report?.total_tarifs), safeCount(previousReport?.total_tarifs))}
              iconName="solar:hashtag-outline"
              compact
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <MetricCard
              title="Total commandes"
              value={formatXaf(safeCount(report?.total_commande))}
              suffix="FCFA"
              delta={formatDeltaPct(safeCount(report?.total_commande), safeCount(previousReport?.total_commande))}
              iconName="solar:notes-outline"
              compact
            />
          </View>
          <View style={{ flex: 1 }}>
            <MetricCard
              title="Solde"
              value={formatXaf(safeCount(report?.reste_a_percevoir))}
              suffix="FCFA"
              delta={formatDeltaPct(safeCount(report?.reste_a_percevoir), safeCount(previousReport?.reste_a_percevoir))}
              iconName="solar:banknote-outline"
              compact
            />
          </View>
        </View>
      </View>
      ) : null}

      {expeditionReport && hasExpeditions ? (
        <>
          <View style={{ marginTop: 18 }}>
            <AppText style={{ ...typography.sectionTitle, fontSize: 14, lineHeight: 20, marginBottom: 12 }} numberOfLines={1}>
              Expéditions
            </AppText>
            <StatusChipRow
              chips={[
                { label: "Total", count: safeCount(expeditionReport.expedition_count), iconName: "solar:box-bold-duotone", color: colors.primary },
                { label: "Frais à confirmer", count: safeCount(expeditionReport.fees_pending_count), iconName: "solar:danger-circle-bold", color: "#B45309" },
              ]}
            />
          </View>
          {/* Dette client envers l'agence (transport + main) — à ne pas combiner avec le solde livraisons. */}
          <View style={{ marginTop: 16, gap: 16 }}>
            <MetricCard
              title="Total à facturer (expéditions)"
              value={formatXaf(safeCount(expeditionReport.total_a_facturer))}
              suffix="FCFA"
              delta={formatDeltaPct(safeCount(expeditionReport.total_a_facturer), safeCount(previousExpeditionReport?.total_a_facturer))}
              iconName="solar:banknote-outline"
            />
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <MetricCard
                  title="Frais transport"
                  value={formatXaf(safeCount(expeditionReport.total_transport))}
                  suffix="FCFA"
                  delta={formatDeltaPct(safeCount(expeditionReport.total_transport), safeCount(previousExpeditionReport?.total_transport))}
                  iconName="solar:delivery-bold-duotone"
                  compact
                />
              </View>
              <View style={{ flex: 1 }}>
                <MetricCard
                  title="Main agence"
                  value={formatXaf(safeCount(expeditionReport.total_main_agence))}
                  suffix="FCFA"
                  delta={formatDeltaPct(safeCount(expeditionReport.total_main_agence), safeCount(previousExpeditionReport?.total_main_agence))}
                  iconName="solar:wallet-bold-duotone"
                  compact
                />
              </View>
            </View>
          </View>
        </>
      ) : null}

      <View style={{ marginTop: 22, gap: 12 }}>
        {hasDeliveries ? (
          <PdfButton
            label={reportPdfActionLabel(range, "deliveries")}
            busy={downloadingPdf === "deliveries"}
            onPress={() => void onDownloadPdf("deliveries")}
          />
        ) : null}
        {hasExpeditions ? (
          <PdfButton
            label={reportPdfActionLabel(range, "expeditions")}
            busy={downloadingPdf === "expeditions"}
            onPress={() => void onDownloadPdf("expeditions")}
          />
        ) : null}
      </View>
    </>
  );

  return (
    <ScreenLayout
      refreshing={refreshing && !loading}
      onRefresh={() => void loadReports("refresh")}
      scrollViewProps={{ onScroll: onReportScroll, scrollEventThrottle: 250 }}
      header={
        <View style={{ paddingBottom: 10 }}>
          <AppText style={[typography.screenTitle, { fontSize: 26, lineHeight: 34 }]} numberOfLines={2}>
            Rapports d&apos;activité
          </AppText>
          <AppText style={[typography.subtitle, { marginTop: 4 }]} numberOfLines={2} ellipsizeMode="tail">
            {periodLabel}
          </AppText>
          <RangeToggle value={range} onChange={setRange} />
          {range === "Personnalisé" ? (
            <ReportCustomDateRange
              startDate={customStart}
              endDate={customEnd}
              onChangeStart={setCustomStart}
              onChangeEnd={setCustomEnd}
              maximumDate={new Date()}
            />
          ) : null}
        </View>
      }
    >
      {body}
    </ScreenLayout>
  );
}
