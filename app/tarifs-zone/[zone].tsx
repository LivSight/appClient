import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import AppText from "@/components/AppText";
import EmptyStateCard from "@/components/EmptyStateCard";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { getDeliveryFeeZone, listNeighborhoods } from "@/lib/api/tariffs";
import { formatTariffFcfa, neighborhoodsForZone, zoneDisplayLabel } from "@/lib/api/tariffUi";
import { card } from "@/theme/styles";
import { colors, fonts, radii, typography } from "@/theme/tokens";

function ZonePill({ children }: { children: string }) {
  return (
    <View style={{ minHeight: 44, borderRadius: radii.pill, backgroundColor: "#F3F4F5", paddingHorizontal: 20, justifyContent: "center" }}>
      <AppText variant="dense" style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={1}>
        {children}
      </AppText>
    </View>
  );
}

export default function TarifsZoneDetailScreen() {
  const { zone } = useLocalSearchParams<{ zone?: string }>();
  const zoneIdNum = useMemo(() => {
    const parsed = parseInt(String(zone ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [zone]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneData, setZoneData] = useState<Awaited<ReturnType<typeof getDeliveryFeeZone>> | null>(null);
  const [neighborhoodNames, setNeighborhoodNames] = useState<string[]>([]);

  const loadZone = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (zoneIdNum == null) {
        setError("Zone invalide");
        setLoading(false);
        return;
      }

      try {
        if (mode === "initial") setLoading(true);
        if (mode === "refresh") setRefreshing(true);
        setError(null);

        const [z, allNeighborhoods] = await Promise.all([getDeliveryFeeZone(zoneIdNum), listNeighborhoods()]);
        setZoneData(z);
        setNeighborhoodNames(neighborhoodsForZone(allNeighborhoods, zoneIdNum));
      } catch (e: unknown) {
        setError(String(e instanceof Error ? e.message : e ?? "Erreur"));
        setZoneData(null);
        setNeighborhoodNames([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [zoneIdNum],
  );

  useFocusEffect(
    useCallback(() => {
      void loadZone("initial");
    }, [loadZone]),
  );

  const label = zoneData ? zoneDisplayLabel(zoneData) : "ZONE";
  const distanceLabel = zoneData?.distance_label?.trim() && zoneData.distance_label !== "N/A" ? zoneData.distance_label : "—";
  const etaLabel = zoneData?.eta_label?.trim() && zoneData.eta_label !== "N/A" ? zoneData.eta_label : "—";
  const priceXaf = zoneData?.delivery_fee ?? 0;
  const sectorsLabel = `${neighborhoodNames.length} SECTEUR${neighborhoodNames.length === 1 ? "" : "S"}`;

  const body = loading ? (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText style={{ ...typography.subtitle, marginTop: 12 }} numberOfLines={2}>
        Chargement de la zone…
      </AppText>
    </View>
  ) : error ? (
    <View style={{ marginTop: 18, padding: 16, backgroundColor: colors.cardBg, borderRadius: radii.card }}>
      <AppText style={typography.bodyRegular} numberOfLines={4}>
        {error}
      </AppText>
      <Pressable
        onPress={() => void loadZone("initial")}
        style={{ marginTop: 12, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.primary }}
      >
        <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodySemi, color: colors.white }} numberOfLines={1}>
          Réessayer
        </AppText>
      </Pressable>
    </View>
  ) : (
    <>
      <View style={{ marginTop: 18, flexDirection: "row", gap: 16 }}>
        <View style={[card.base, { padding: 24, flex: 1, minWidth: 0 }]}>
          <SolarIcon name="solar:map-point-outline" size={20} color={colors.primary} />
          <AppText variant="dense" style={{ marginTop: 10, fontSize: 10, lineHeight: 15, fontFamily: fonts.bodyBold, color: "#717882", letterSpacing: 0.5 }} numberOfLines={1}>
            IDENTIFIANT
          </AppText>
          <AppText style={{ marginTop: 8, fontSize: 20, lineHeight: 28, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
            {label}
          </AppText>

          <View style={{ marginTop: 16, alignSelf: "flex-start" }}>
            <View style={{ minHeight: 36, borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, justifyContent: "center" }}>
              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={1}>
                {formatTariffFcfa(priceXaf)} FCFA
              </AppText>
            </View>
          </View>
        </View>

        <View style={[card.base, { padding: 24, flex: 1, minWidth: 0, backgroundColor: colors.primary }]}>
          <SolarIcon name="solar:routing-bold-duotone" size={20} color={colors.white} />
          <AppText
            variant="dense"
            style={{ marginTop: 10, fontSize: 10, lineHeight: 15, fontFamily: fonts.bodyBold, color: colors.white, opacity: 0.85, letterSpacing: 0.5 }}
            numberOfLines={2}
          >
            COUVERTURE &{"\n"}TEMPS
          </AppText>

          <AppText style={{ marginTop: 10, fontSize: 24, lineHeight: 24, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={1} ellipsizeMode="tail">
            {distanceLabel}
          </AppText>
          <AppText variant="dense" style={{ marginTop: 8, fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyMedium, color: colors.white, opacity: 0.9 }} numberOfLines={1}>
            {etaLabel}
          </AppText>
        </View>
      </View>

      <View style={{ marginTop: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <AppText style={{ fontSize: 20, lineHeight: 28, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
            Quartiers couverts
          </AppText>
          <View style={{ minHeight: 24, borderRadius: radii.pill, backgroundColor: "rgba(14,165,233,0.10)", paddingHorizontal: 12, paddingVertical: 4, flexShrink: 0 }}>
            <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
              {sectorsLabel}
            </AppText>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          {neighborhoodNames.length === 0 ? (
            <EmptyStateCard
              label="QUARTIERS"
              iconName="solar:map-point-bold-duotone"
              title="Aucun quartier pour cette zone"
              subtitle="Les quartiers couverts par cette zone tarifaire n'ont pas encore été renseignés."
            />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {neighborhoodNames.map((n) => (
                <ZonePill key={n}>{n}</ZonePill>
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <ScreenLayout
      refreshing={refreshing}
      onRefresh={() => void loadZone("refresh")}
      header={
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, paddingVertical: 8, marginBottom: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 44, height: 44, justifyContent: "center" }}>
            <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <AppText style={{ ...typography.sectionTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={1}>
              Détail de la zone
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
