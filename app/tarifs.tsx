import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import AppText from "@/components/AppText";
import EmptyStateCard from "@/components/EmptyStateCard";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { fetchTariffsCatalog } from "@/lib/api/tariffs";
import TariffFeeHighlightCard from "@/components/TariffFeeHighlightCard";
import {
  buildOtherTariffs,
  cityDisplayLabel,
  formatTariffFcfa,
  isTariffsCatalogEmpty,
  mapZoneToTariffCard,
  pickDefaultCityId,
  resolveDeliveryFeeAmounts,
  zonesForCity,
  type OtherTariffItem,
  type TariffZoneCard,
} from "@/lib/api/tariffUi";
import { card } from "@/theme/styles";
import { colors, fonts, radii, typography } from "@/theme/tokens";

function ZoneCard({ zone, onPress }: { zone: TariffZoneCard; onPress?: () => void }) {
  return (
    <View style={[card.base, { padding: 16 }]}>
      <View
        style={{
          minHeight: 22,
          borderRadius: radii.pill,
          backgroundColor: "rgba(14,165,233,0.10)",
          paddingHorizontal: 10,
          paddingVertical: 3,
          alignSelf: "flex-start",
        }}
      >
        <AppText variant="dense" style={{ fontSize: 10, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 1 }} numberOfLines={1}>
          {zone.zoneLabel}
        </AppText>
      </View>

      <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <AppText style={{ fontSize: 22, lineHeight: 28, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
          {formatTariffFcfa(zone.priceXaf)} FCFA
        </AppText>
        <AppText variant="dense" style={{ ...typography.subtitle, fontSize: 13, lineHeight: 18 }} numberOfLines={1}>
          {zone.distanceLabel}
        </AppText>
      </View>

      <Pressable
        onPress={onPress}
        hitSlop={10}
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "rgba(192,199,210,0.10)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 28,
        }}
      >
        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.3 }} numberOfLines={1}>
          VOIR QUARTIERS
        </AppText>
        <SolarIcon name="solar:alt-arrow-right-outline" size={18} color={"rgba(60,74,60,0.55)"} />
      </Pressable>
    </View>
  );
}

function OtherTariffCard({ item }: { item: OtherTariffItem }) {
  const valueNode = (() => {
    if (item.valueKind === "pillGreen") {
      return (
        <View
          style={{
            minHeight: 36,
            borderRadius: radii.pill,
            backgroundColor: "#DCFCE7",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: "#15803D" }} numberOfLines={1}>
            {item.valueLabel}
          </AppText>
        </View>
      );
    }

    if (item.valueKind === "pillMuted") {
      return (
        <View
          style={{
            minHeight: 28,
            borderRadius: 6,
            backgroundColor: "#ECEEF4",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <AppText variant="dense" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={1}>
            {item.valueLabel}
          </AppText>
        </View>
      );
    }

    const fg = item.valueKind === "rightAmountPrimary" ? colors.primary : colors.text;
    return (
      <AppText style={{ fontSize: 18, lineHeight: 28, fontFamily: fonts.bodyBold, color: fg }} numberOfLines={1} ellipsizeMode="tail">
        {item.valueLabel}
      </AppText>
    );
  })();

  return (
    <View style={[card.base, { padding: 20 }]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={{ fontSize: 16, lineHeight: 24, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </AppText>
          <AppText variant="dense" style={{ ...typography.subtitle, fontSize: 12, lineHeight: 16, marginTop: 2 }} numberOfLines={3} ellipsizeMode="tail">
            {item.description}
          </AppText>
        </View>
        <View style={{ flexShrink: 0, alignItems: "flex-end" }}>{valueNode}</View>
      </View>
    </View>
  );
}

export default function TarifsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof fetchTariffsCatalog>> | null>(null);

  const loadTariffs = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const data = await fetchTariffsCatalog();
      setCatalog(data);
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

  const zones = useMemo(() => {
    if (!catalog || cityId == null) return [];
    return zonesForCity(catalog.zones, cityId).map(mapZoneToTariffCard);
  }, [catalog, cityId]);

  const { pickupFee, expressFee } = useMemo(
    () => resolveDeliveryFeeAmounts(catalog?.settings),
    [catalog?.settings],
  );

  const otherTariffs = useMemo(
    () => buildOtherTariffs(catalog?.settings ?? null, catalog?.neighborhoods ?? []),
    [catalog],
  );

  const cityLabel = activeCity ? cityDisplayLabel(activeCity) : "—";
  const catalogIsEmpty = catalog != null && isTariffsCatalogEmpty(catalog);

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
      iconName="solar:tag-price-bold-duotone"
      title="Aucun tarif disponible"
      subtitle="Les tarifs de livraison n'ont pas encore été configurés. Revenez plus tard ou actualisez la page."
      ctas={[{ label: "Actualiser", onPress: () => void loadTariffs("refresh") }]}
    />
  ) : (
    <>
      <View style={{ marginBottom: 18 }}>
        <AppText style={{ ...typography.subtitle }} numberOfLines={2} ellipsizeMode="tail">
          Répartition par zones géographiques.
        </AppText>
      </View>

      <View style={{ marginTop: 18, gap: 16 }}>
        <View style={[card.base, { padding: 24, overflow: "hidden" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="dense" style={{ fontSize: 12, lineHeight: 24, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 1.6 }} numberOfLines={1}>
                VILLE ACTIVE
              </AppText>
              <AppText style={{ fontSize: 30, lineHeight: 36, fontFamily: fonts.bodyBold, color: colors.text, marginTop: 8 }} numberOfLines={2} ellipsizeMode="tail">
                {cityLabel}
              </AppText>
            </View>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.02)", alignItems: "center", justifyContent: "center" }}>
              <SolarIcon name="solar:chart-2-outline" size={28} color={"rgba(60,74,60,0.35)"} />
            </View>
          </View>
        </View>

        <TariffFeeHighlightCard variant="express" feeXaf={expressFee} />
        <TariffFeeHighlightCard variant="pickup" feeXaf={pickupFee} />
      </View>

      <View style={{ marginTop: 24, gap: 24 }}>
        {zones.length === 0 ? (
          <AppText style={typography.subtitle} numberOfLines={3}>
            Aucune zone tarifaire pour cette ville.
          </AppText>
        ) : (
          zones.map((z) => (
            <ZoneCard
              key={z.zoneId}
              zone={z}
              onPress={() => {
                router.push(`/tarifs-zone/${z.zoneId}`);
              }}
            />
          ))
        )}
      </View>

      <View style={{ marginTop: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <SolarIcon name="solar:hashtag-outline" size={22} color={colors.primary} />
          <AppText style={{ fontSize: 24, lineHeight: 32, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
            Autres Tarifications
          </AppText>
        </View>

        <View style={{ gap: 16 }}>
          {otherTariffs.map((it) => (
            <OtherTariffCard key={it.title} item={it} />
          ))}
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <View style={[card.base, { padding: 24 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 16, lineHeight: 24, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
              Information sur la tarification
            </AppText>
            <AppText style={{ ...typography.subtitle, fontSize: 14, lineHeight: 22.75, marginTop: 6 }} numberOfLines={6} ellipsizeMode="tail">
              Les tarifs affichés sont basés sur une livraison standard. Des frais supplémentaires peuvent s&apos;appliquer.
            </AppText>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <ScreenLayout
      refreshing={refreshing}
      onRefresh={() => void loadTariffs("refresh")}
      header={
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, paddingVertical: 8, marginBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }}>
            <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <AppText style={{ ...typography.sectionTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={1}>
              Nos Tarifs
            </AppText>
          </View>
          <View style={{ width: 44, height: 44 }} />
        </View>
      }
    >
      {body}
    </ScreenLayout>
  );
}
