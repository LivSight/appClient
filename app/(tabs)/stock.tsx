import { useCallback, useState } from "react";
import { useLoadEffect } from "@/lib/hooks/useLoadEffect";
import { View, Pressable, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import EmptyStateCard from "../../components/EmptyStateCard";
import ScreenLayout from "../../components/ScreenLayout";
import { colors, fonts, radii, typography } from "../../theme/tokens";
import AppText from "../../components/AppText";
import { listPackages, makeClientId, type Package } from "@/lib/api/packages";
import StockProductCard, { type StockProductCardItem } from "@/components/StockProductCard";

type Row = StockProductCardItem;

function toSentenceCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function toRows(packages: Package[]): Row[] {
  // The backend can return several packages with the same name for a user, and
  // makeClientId is name-based — disambiguate so React keys stay unique.
  const seen = new Map<string, number>();
  return packages
    .map((p) => {
      const name = toSentenceCase(String(p?.package_name ?? "").trim());
      if (!name) return null;
      const qty = Number.isFinite(Number(p?.quantity)) ? Math.max(0, Math.floor(Number(p.quantity))) : 0;
      const baseId = makeClientId(p);
      const occurrence = (seen.get(baseId) ?? 0) + 1;
      seen.set(baseId, occurrence);
      return {
        id: occurrence > 1 ? `${baseId}#${occurrence}` : baseId,
        name,
        subtitle: String(p?.description ?? ""),
        qty,
        low: qty <= 2,
      } satisfies Row;
    })
    .filter(Boolean) as Row[];
}

export default function StockScreen() {
  const { addedName } = useLocalSearchParams<{ addedName?: string }>();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const packages = await listPackages();
      setItems(toRows(packages));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, [load]),
  );

  useLoadEffect(
    useCallback(() => {
      if (addedName) void load();
    }, [addedName, load]),
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout
        header={
          <View style={{ paddingBottom: 10 }}>
            <AppText style={[typography.screenTitle, { fontSize: 26, lineHeight: 34 }]} numberOfLines={2}>
              Mon Stock
            </AppText>
            <AppText style={[typography.subtitle, { marginTop: 4 }]}>
              Gérez vos produits
            </AppText>
          </View>
        }
      >
        {!loading && !error && items.length > 0 ? (
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

        {loading ? (
          <View style={{ paddingVertical: 28, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={{ paddingVertical: 16 }}>
            <AppText style={{ color: "#D32F2F", fontFamily: fonts.bodySemi, marginBottom: 12 }}>
              {error}
            </AppText>
            <Pressable
              onPress={load}
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
            ctas={[
              { label: "Ajouter un produit", onPress: () => router.push("/ajouter-au-stock") },
            ]}
          />
        ) : (
          <View style={{ marginTop: 32, gap: 32 }}>
            {items.map((it) => (
              <StockProductCard key={it.id} item={it} />
            ))}
          </View>
        )}
      </ScreenLayout>
    </View>
  );
}
