import { useCallback, useMemo, useRef, useState } from "react";
import { useLoadEffect } from "@/lib/hooks/useLoadEffect";
import { Alert, View, Pressable, ActivityIndicator, type ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import EmptyStateCard from "../../components/EmptyStateCard";
import LoadingState from "@/components/LoadingState";
import ScreenLayout from "../../components/ScreenLayout";
import StatusChipRow from "@/components/StatusChipRow";
import SolarIcon from "@/components/SolarIcon";
import AppTextInput from "@/components/AppTextInput";
import { colors, fonts, radii, typography } from "../../theme/tokens";
import AppText from "../../components/AppText";
import { listPackages, makeClientId, type Package } from "@/lib/api/packages";
import { toReportDateParam } from "@/lib/api/reports";
import StockProductCard, { type StockProductCardItem } from "@/components/StockProductCard";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { useLowStockCount } from "@/lib/stock/lowStockCountContext";
import { filterStockItems } from "@/lib/stock/filterStockItems";
import { paginateStockList } from "@/lib/stock/paginateStockList";
import {
  downloadAndShareReportPdf,
  isPdfPreviewAvailable,
  PDF_MODULES_UNAVAILABLE_MESSAGE,
} from "@/lib/reports/reportPdf";
import { sortStockItemsByName } from "@/lib/stock/sortStockItems";
import { stockSummaryFromItems } from "@/lib/stock/stockSummary";
import { formatDbText } from "@/lib/formatDisplayText";
import { logger } from "@/lib/logger";

/** Set to true to show the "Ajouter un produit" CTAs again. */
const SHOW_ADD_PRODUCT_BUTTON = false;

type Row = StockProductCardItem;

function toRows(packages: Package[]): Row[] {
  // The backend can return several packages with the same name for a user, and
  // makeClientId is name-based — disambiguate so React keys stay unique.
  const seen = new Map<string, number>();
  return packages
    .map((p) => {
      const name = formatDbText(p?.package_name);
      if (!name) return null;
      const qty = Number.isFinite(Number(p?.quantity)) ? Math.max(0, Math.floor(Number(p.quantity))) : 0;
      const defectiveQty = Number.isFinite(Number(p?.defective_quantity))
        ? Math.max(0, Math.floor(Number(p.defective_quantity)))
        : 0;
      const baseId = makeClientId(p);
      const occurrence = (seen.get(baseId) ?? 0) + 1;
      seen.set(baseId, occurrence);
      return {
        id: occurrence > 1 ? `${baseId}#${occurrence}` : baseId,
        name,
        subtitle: formatDbText(p?.description),
        qty,
        defectiveQty,
        low: qty <= 2,
      } satisfies Row;
    })
    .filter(Boolean) as Row[];
}

export default function StockScreen() {
  const { addedName } = useLocalSearchParams<{ addedName?: string }>();
  const { refreshLowStockCount } = useLowStockCount();
  const scrollViewRef = useRef<ScrollView>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingReport, setOpeningReport] = useState(false);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const goToPage = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      scrollToTop();
    },
    [scrollToTop],
  );

  const openStockReport = useCallback(async () => {
    if (openingReport) return;
    const today = toReportDateParam(new Date());
    if (isPdfPreviewAvailable()) {
      router.push({
        pathname: "/rapport-pdf-preview",
        params: { kind: "stock", start: today, end: today },
      });
      return;
    }
    setOpeningReport(true);
    try {
      await downloadAndShareReportPdf("stock", today, today);
    } catch (e: unknown) {
      logger.warn("stock", "stock report pdf failed", e);
      const message =
        e instanceof Error && e.message === PDF_MODULES_UNAVAILABLE_MESSAGE
          ? e.message
          : "Le rapport de stock n'a pas pu être ouvert. Vérifiez votre connexion et réessayez.";
      Alert.alert("Rapport indisponible", message);
    } finally {
      setOpeningReport(false);
    }
  }, [openingReport]);

  const load = useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    if (mode === "initial") setLoading(true);
    setError(null);
    try {
      const packages = await listPackages();
      setItems(toRows(packages));
      setPage(1);
      await refreshLowStockCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      if (mode === "initial") setLoading(false);
    }
  }, [refreshLowStockCount]);

  const { refreshing, onRefresh } = usePullToRefresh(() => load("refresh"));

  // Full-screen loader only on the very first load; later tab focuses refresh
  // silently so the existing list stays on screen instead of flashing a spinner.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedOnceRef.current ? "silent" : "initial").finally(() => {
        hasLoadedOnceRef.current = true;
      });
      return () => {};
    }, [load]),
  );

  useLoadEffect(
    useCallback(() => {
      if (addedName) void load();
    }, [addedName, load]),
  );

  const stockSummary = useMemo(
    () =>
      stockSummaryFromItems(
        items.map((it) => ({
          quantity: it.qty,
          defectiveQuantity: it.defectiveQty,
        })),
      ),
    [items],
  );

  const sortedItems = useMemo(() => sortStockItemsByName(items), [items]);
  const filteredItems = useMemo(() => filterStockItems(sortedItems, query), [sortedItems, query]);
  const hasActiveSearch = query.trim().length > 0;

  const {
    visible: visibleItems,
    hasPrevious,
    hasNext,
    totalPages,
    page: currentPage,
  } = useMemo(() => paginateStockList(filteredItems, page), [filteredItems, page]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout
        scrollViewRef={scrollViewRef}
        refreshing={refreshing}
        onRefresh={onRefresh}
        header={
          <View style={{ paddingBottom: 10 }}>
            <AppText style={[typography.screenTitle, { fontSize: 26, lineHeight: 34 }]} numberOfLines={2}>
              Mon Stock en magasin
            </AppText>
            <AppText style={[typography.subtitle, { marginTop: 4 }]}>
              Gérez vos produits
            </AppText>
          </View>
        }
      >
        <View style={{ marginBottom: 18 }}>
          <StatusChipRow
            chips={[
              { label: "Produits", count: stockSummary.productsCount, iconName: "solar:box-bold-duotone", color: colors.primary },
              { label: "Quantité totale", count: stockSummary.qtyTotal, iconName: "solar:box-bold", color: colors.primary },
              { label: "En rupture", count: stockSummary.outOfStockCount, iconName: "solar:danger-circle-bold", color: "#DC2626" },
              {
                label: "Défectueux",
                count: stockSummary.defectiveTotal,
                iconName: "solar:danger-circle-bold",
                color: "#B45309",
              },
            ]}
          />
        </View>

        {!loading && !error ? (
          <Pressable
            testID="stock-view-report"
            onPress={() => void openStockReport()}
            disabled={openingReport}
            style={{
              minHeight: 48,
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              opacity: openingReport ? 0.7 : 1,
            }}
          >
            {openingReport ? (
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
                numberOfLines={1}
              >
                Visualiser et télécharger
              </AppText>
            )}
          </Pressable>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <View
            style={{
              minHeight: 48,
              borderRadius: radii.pill,
              backgroundColor: "#F3F4F5",
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <SolarIcon name="solar:magnifer-outline" size={20} color="rgba(60,74,60,0.45)" />
            <AppTextInput
              testID="stock-search-input"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setPage(1);
              }}
              placeholder="Rechercher un produit…"
              placeholderTextColor="rgba(60,74,60,0.4)"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                lineHeight: 20,
                fontFamily: fonts.bodyRegular,
                color: colors.text,
                paddingVertical: 10,
              }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              variant="dense"
            />
          </View>
        ) : null}

        {SHOW_ADD_PRODUCT_BUTTON && !loading && !error && items.length > 0 ? (
          <Pressable
            onPress={() => router.push("/ajouter-au-stock")}
            style={{
              minHeight: 56,
              paddingVertical: 14,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText style={typography.buttonTextInverse} numberOfLines={2} ellipsizeMode="tail">
              Ajouter un produit à votre stock
            </AppText>
          </Pressable>
        ) : null}

        {loading && !refreshing ? (
          <LoadingState label="Chargement du stock…" />
        ) : error ? (
          <View style={{ paddingVertical: 16 }}>
            <AppText style={{ color: "#D32F2F", fontFamily: fonts.bodySemi, marginBottom: 12 }}>
              {error}
            </AppText>
            <Pressable
              onPress={() => void load("initial")}
              style={{
                minHeight: 44,
                paddingVertical: 10,
                borderRadius: radii.pill,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 18,
                alignSelf: "flex-start",
              }}
            >
              <AppText style={typography.buttonTextInverse} numberOfLines={1}>
                Réessayer
              </AppText>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <EmptyStateCard
            label="BIENVENUE"
            iconName="solar:box-bold-duotone"
            title="Votre stock est vide"
            subtitle="Ajoutez vos produits pour les retrouver lors d’une livraison ou d’une expédition."
            ctas={
              SHOW_ADD_PRODUCT_BUTTON
                ? [{ label: "Ajouter un produit", onPress: () => router.push("/ajouter-au-stock") }]
                : []
            }
          />
        ) : filteredItems.length === 0 ? (
          <View style={{ marginTop: 24, paddingVertical: 16 }}>
            <AppText style={{ fontSize: 15, lineHeight: 22, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
              Aucun produit trouvé
            </AppText>
            <AppText
              variant="dense"
              style={{ marginTop: 6, fontSize: 13, lineHeight: 18, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
              numberOfLines={2}
            >
              {hasActiveSearch
                ? `Aucun résultat pour « ${query.trim()} ».`
                : "Modifiez votre recherche."}
            </AppText>
          </View>
        ) : (
          <View style={{ marginTop: 16, gap: 10 }}>
            <AppText
              variant="dense"
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontFamily: fonts.bodyMedium,
                color: "rgba(60,74,60,0.65)",
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              Page {currentPage} sur {totalPages}
            </AppText>
            {visibleItems.map((it) => (
              <StockProductCard key={it.id} item={it} />
            ))}
            {totalPages > 1 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 6,
                  marginBottom: 8,
                }}
              >
                <Pressable
                  testID="stock-page-prev"
                  disabled={!hasPrevious}
                  onPress={() => goToPage(Math.max(1, currentPage - 1))}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    paddingVertical: 10,
                    borderRadius: radii.pill,
                    backgroundColor: hasPrevious ? "#EFF8FF" : "#F3F4F5",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: hasPrevious ? 1 : 0.55,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      fontFamily: fonts.bodySemi,
                      color: hasPrevious ? colors.primary : "rgba(60,74,60,0.45)",
                    }}
                    numberOfLines={1}
                  >
                    Précédent
                  </AppText>
                </Pressable>
                <Pressable
                  testID="stock-page-next"
                  disabled={!hasNext}
                  onPress={() => goToPage(currentPage + 1)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    paddingVertical: 10,
                    borderRadius: radii.pill,
                    backgroundColor: hasNext ? colors.primary : "#F3F4F5",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: hasNext ? 1 : 0.55,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      fontFamily: fonts.bodySemi,
                      color: hasNext ? colors.white : "rgba(60,74,60,0.45)",
                    }}
                    numberOfLines={1}
                  >
                    Suivant
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </ScreenLayout>
    </View>
  );
}
