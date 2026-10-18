import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, View, type ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router/react-navigation";
import AppText from "@/components/AppText";
import AppTextInput from "@/components/AppTextInput";
import EmptyStateCard from "@/components/EmptyStateCard";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { fetchTariffsCatalog } from "@/lib/api/tariffs";
import {
  buildNeighborhoodTariffRows,
  buildOtherTariffs,
  buildTariffSupplementRows,
  cityHeaderLabel,
  filterNeighborhoodTariffRows,
  isTariffsCatalogEmpty,
  pickDefaultCityId,
  resolveDeliveryFeeAmounts,
  zonesForCity,
  type OtherTariffItem,
  type TariffNeighborhoodRow,
  type TariffSupplementRow,
} from "@/lib/api/tariffUi";
import { paginateStockList } from "@/lib/stock/paginateStockList";
import { colors, fonts, radii, shadows, typography } from "@/theme/tokens";

/** Outer shadow only; inner clip so overflow doesn't kill the shadow on iOS. */
function TariffsCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.cardBg,
          borderRadius: radii.card,
          ...shadows.card,
          // Override Android `shadows.card` stroke — page uses shadow, not border.
          borderWidth: 0,
        },
        style,
      ]}
    >
      <View style={{ overflow: "hidden", borderRadius: radii.card }}>{children}</View>
    </View>
  );
}

function NeighborhoodTariffTable({ rows }: { rows: TariffNeighborhoodRow[] }) {
  return (
    <TariffsCard>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: "rgba(14,165,233,0.08)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(226,232,240,0.9)",
        }}
      >
        <AppText
          variant="dense"
          style={{ flex: 1.2, minWidth: 0, fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.6 }}
          numberOfLines={1}
        >
          QUARTIER
        </AppText>
        <AppText
          variant="dense"
          style={{ flex: 0.7, minWidth: 0, fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.6 }}
          numberOfLines={1}
        >
          ZONE
        </AppText>
        <AppText
          variant="dense"
          style={{ flex: 0.9, minWidth: 0, fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.6, textAlign: "right" }}
          numberOfLines={1}
        >
          MONTANT
        </AppText>
      </View>

      {rows.map((row, index) => (
        <View
          key={row.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: "rgba(226,232,240,0.85)",
          }}
        >
          <AppText
            style={{ flex: 1.2, minWidth: 0, fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {row.neighborhoodName}
          </AppText>
          <AppText
            variant="dense"
            style={{ flex: 0.7, minWidth: 0, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.7)" }}
            numberOfLines={1}
          >
            {row.zoneLabel}
          </AppText>
          <AppText
            style={{ flex: 0.9, minWidth: 0, fontSize: 13, lineHeight: 18, fontFamily: fonts.bodyBold, color: colors.text, textAlign: "right" }}
            numberOfLines={1}
          >
            {row.amountLabel}
          </AppText>
        </View>
      ))}
    </TariffsCard>
  );
}

function SupplementRows({ rows }: { rows: TariffSupplementRow[] }) {
  if (!rows.length) return null;
  return (
    <TariffsCard style={{ marginTop: 12 }}>
      {rows.map((row, index) => (
        <View
          key={row.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: "rgba(226,232,240,0.85)",
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={1}>
              {row.label}
            </AppText>
            {row.detail ? (
              <AppText
                variant="dense"
                style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
                numberOfLines={1}
              >
                {row.detail}
              </AppText>
            ) : null}
          </View>
          <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.primary, flexShrink: 0 }} numberOfLines={1}>
            {row.amountLabel}
          </AppText>
        </View>
      ))}
    </TariffsCard>
  );
}

function OtherTariffRow({ item, isFirst }: { item: OtherTariffItem; isFirst: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: "rgba(226,232,240,0.85)",
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText
          variant="dense"
          style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
          numberOfLines={2}
        >
          {item.description}
        </AppText>
      </View>
      <AppText
        style={{
          fontSize: 13,
          lineHeight: 18,
          fontFamily: fonts.bodyBold,
          color: item.valueKind === "pillGreen" ? "#15803D" : colors.primary,
          flexShrink: 0,
          maxWidth: "42%",
          textAlign: "right",
        }}
        numberOfLines={2}
      >
        {item.valueLabel}
      </AppText>
    </View>
  );
}

export default function TarifsScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof fetchTariffsCatalog>> | null>(null);

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

  const loadTariffs = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const data = await fetchTariffsCatalog();
      setCatalog(data);
      setPage(1);
      setCityId((prev) => {
        if (prev && data.cities.some((c) => c.id === prev)) return prev;
        return pickDefaultCityId(data.cities);
      });
    } catch (e: unknown) {
      setError(String(e instanceof Error ? e.message : e ?? "Erreur"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTariffs("initial");
    }, [loadTariffs]),
  );

  const activeCity = useMemo(() => {
    if (!catalog || cityId == null) return null;
    return catalog.cities.find((c) => c.id === cityId) ?? null;
  }, [catalog, cityId]);

  const cityZones = useMemo(() => {
    if (!catalog || cityId == null) return [];
    return zonesForCity(catalog.zones, cityId);
  }, [catalog, cityId]);

  const neighborhoodRows = useMemo(() => {
    if (!catalog) return [];
    return buildNeighborhoodTariffRows({
      neighborhoods: catalog.neighborhoods,
      zones: cityZones,
    });
  }, [catalog, cityZones]);

  const filteredNeighborhoodRows = useMemo(
    () => filterNeighborhoodTariffRows(neighborhoodRows, query),
    [neighborhoodRows, query],
  );

  const {
    visible: visibleNeighborhoodRows,
    hasPrevious,
    hasNext,
    totalPages,
    page: currentPage,
  } = useMemo(
    () => paginateStockList(filteredNeighborhoodRows, page),
    [filteredNeighborhoodRows, page],
  );

  const { pickupFee, expressFee } = useMemo(
    () => resolveDeliveryFeeAmounts(catalog?.settings),
    [catalog?.settings],
  );

  const supplementRows = useMemo(
    () => buildTariffSupplementRows({ expressFee, pickupFee }),
    [expressFee, pickupFee],
  );

  const otherTariffs = useMemo(
    () => buildOtherTariffs(catalog?.settings ?? null, catalog?.neighborhoods ?? []),
    [catalog],
  );

  const cityHeader = activeCity ? cityHeaderLabel(activeCity) : null;
  const catalogIsEmpty = catalog != null && isTariffsCatalogEmpty(catalog);
  const hasActiveSearch = query.trim().length > 0;

  const body = loading ? (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText style={{ ...typography.subtitle, marginTop: 12 }} numberOfLines={2}>
        Chargement des tarifs…
      </AppText>
    </View>
  ) : error ? (
    <View style={{ marginTop: 18, padding: 16, backgroundColor: colors.cardBg, borderRadius: radii.card }}>
      <AppText style={typography.bodyRegular} numberOfLines={4}>
        {error}
      </AppText>
      <Pressable
        onPress={() => void loadTariffs("initial")}
        style={{ marginTop: 12, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.primary }}
      >
        <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodySemi, color: colors.white }} numberOfLines={1}>
          Réessayer
        </AppText>
      </Pressable>
    </View>
  ) : catalogIsEmpty ? (
    <EmptyStateCard
      label="TARIFICATION"
      iconName="solar:tag-outline"
      title="Aucun tarif disponible"
      subtitle="Les tarifs de livraison n'ont pas encore été configurés. Revenez plus tard ou actualisez la page."
      ctas={[{ label: "Actualiser", onPress: () => void loadTariffs("refresh") }]}
    />
  ) : (
    <>
      {neighborhoodRows.length > 0 ? (
        <View
          style={{
            minHeight: 48,
            borderRadius: radii.pill,
            backgroundColor: "#F3F4F5",
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <SolarIcon name="solar:magnifer-outline" size={20} color="rgba(60,74,60,0.45)" />
          <AppTextInput
            testID="tarifs-search-input"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setPage(1);
            }}
            placeholder="Rechercher un quartier…"
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

      {neighborhoodRows.length === 0 ? (
        <AppText style={typography.subtitle} numberOfLines={3}>
          Aucun quartier tarifaire pour cette ville.
        </AppText>
      ) : filteredNeighborhoodRows.length === 0 ? (
        <View style={{ paddingVertical: 16 }}>
          <AppText style={{ fontSize: 15, lineHeight: 22, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
            Aucun quartier trouvé
          </AppText>
          <AppText
            variant="dense"
            style={{ marginTop: 6, fontSize: 13, lineHeight: 18, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
            numberOfLines={2}
          >
            {hasActiveSearch ? `Aucun résultat pour « ${query.trim()} ».` : "Modifiez votre recherche."}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {totalPages > 1 ? (
            <AppText
              variant="dense"
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontFamily: fonts.bodyMedium,
                color: "rgba(60,74,60,0.65)",
              }}
              numberOfLines={1}
            >
              Page {currentPage} sur {totalPages}
            </AppText>
          ) : null}
          <NeighborhoodTariffTable rows={visibleNeighborhoodRows} />
          {totalPages > 1 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                testID="tarifs-page-prev"
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
                testID="tarifs-page-next"
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

      <SupplementRows rows={supplementRows} />

      {otherTariffs.length > 0 ? (
        <View style={{ marginTop: 20 }}>
          <AppText
            style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text, marginBottom: 10 }}
            numberOfLines={1}
          >
            Autres tarifications
          </AppText>
          <TariffsCard>
            {otherTariffs.map((it, i) => (
              <OtherTariffRow key={it.title} item={it} isFirst={i === 0} />
            ))}
          </TariffsCard>
        </View>
      ) : null}

      <AppText
        style={{
          marginTop: 16,
          fontSize: 12,
          lineHeight: 18,
          fontFamily: fonts.bodyRegular,
          color: "rgba(60,74,60,0.65)",
        }}
        numberOfLines={4}
      >
        Les tarifs affichés sont basés sur une livraison standard. Des frais supplémentaires peuvent s&apos;appliquer.
      </AppText>
    </>
  );

  return (
    <ScreenLayout
      scrollViewRef={scrollViewRef}
      refreshing={refreshing}
      onRefresh={() => void loadTariffs("refresh")}
      header={
        <View style={{ paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AppText
              style={[typography.screenTitle, { flex: 1, minWidth: 0, fontSize: 26, lineHeight: 34 }]}
              numberOfLines={1}
            >
              Nos Tarifs
            </AppText>
            {cityHeader ? (
              <View
                style={{
                  maxWidth: "42%",
                  minHeight: 32,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  backgroundColor: "rgba(14,165,233,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 1,
                }}
              >
                <AppText
                  variant="dense"
                  style={{ fontSize: 13, lineHeight: 18, fontFamily: fonts.bodySemi, color: colors.primary }}
                  numberOfLines={1}
                >
                  {cityHeader}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText style={[typography.subtitle, { marginTop: 4 }]} numberOfLines={2}>
            Consultez vos zones et frais de livraison
          </AppText>
        </View>
      }
    >
      {body}
    </ScreenLayout>
  );
}
