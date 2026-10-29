import { useCallback, useMemo, useRef, useState } from "react";
import LoadingState from "@/components/LoadingState";
import { track } from "@/lib/analytics/events";
import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import EmptyStateCard from "../../components/EmptyStateCard";
import FilterDropdown from "../../components/FilterDropdown";
import ScreenLayout from "../../components/ScreenLayout";
import TransactionCard, { type TransactionCardItem } from "../../components/TransactionCard";
import { colors, fonts, radii, spacing, typography } from "../../theme/tokens";
import AppText from "../../components/AppText";
import { listTransactions } from "@/lib/api/transactions";
import {
  filterCardItemsByDate,
  filterCardItemsByStatus,
  transactionsToCardItems,
  TRANSACTION_DATE_FILTERS,
  type TransactionDateFilter,
  type TransactionStatusFilter,
} from "@/lib/api/transactionUi";
import { shouldRefreshLivraisonList } from "@/lib/push/notificationRouting";
import { usePushRefresh } from "@/lib/push/usePushRefresh";
import { logger } from "@/lib/logger";

export default function LivraisonScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [active, setActive] = useState<TransactionStatusFilter>(() => {
    if (filter === "Planifiée") return "Planifiée";
    if (filter === "En cours") return "En cours";
    if (filter === "Livré") return "Livré";
    if (filter === "Annulé") return "Annulé";
    return "Tout";
  });
  // Defaults to today's orders; "Toutes dates" is opt-in via the dropdown or the reset action.
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>("Aujourd'hui");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<TransactionCardItem[]>([]);

  const loadTransactions = useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    const t0 = Date.now();
    logger.info("perf", "livraison:loadTransactions start", { mode });
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      // Latest 200 (backend page cap) — status/date filters stay client-side over this window.
      const data = await listTransactions({ limit: 200 });
      const tFetch = Date.now();
      setAllOrders(transactionsToCardItems(data));
      logger.info("perf", "livraison:loadTransactions done", {
        mode,
        fetchMs: tFetch - t0,
        mapMs: Date.now() - tFetch,
        totalMs: Date.now() - t0,
        count: data.length,
      });
    } catch (e: unknown) {
      logger.info("perf", "livraison:loadTransactions failed", { mode, totalMs: Date.now() - t0 });
      setError(String(e instanceof Error ? e.message : e ?? "Erreur"));
    } finally {
      if (mode === "initial") setLoading(false);
      if (mode === "refresh") setRefreshing(false);
    }
  }, []);

  // Full loader only on the very first load; later tab focuses refresh silently
  // so the existing list stays on screen instead of flashing a spinner.
  const hasLoadedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void loadTransactions(hasLoadedOnceRef.current ? "silent" : "initial").finally(() => {
        hasLoadedOnceRef.current = true;
      });
    }, [loadTransactions]),
  );

  const shouldRefreshFromPush = useCallback((payload: Parameters<typeof shouldRefreshLivraisonList>[0]) => {
    return shouldRefreshLivraisonList(payload);
  }, []);

  usePushRefresh(
    shouldRefreshFromPush,
    useCallback(() => {
      void loadTransactions("refresh");
    }, [loadTransactions]),
  );

  const orders = useMemo(
    () => filterCardItemsByDate(filterCardItemsByStatus(allOrders, active), dateFilter),
    [active, allOrders, dateFilter],
  );
  const hasAnyOrders = allOrders.length > 0;
  const isFilteredEmpty = hasAnyOrders && orders.length === 0;

  return (
    <ScreenLayout
      refreshing={refreshing}
      onRefresh={() => {
        void loadTransactions("refresh");
      }}
      header={
        <View style={{ paddingBottom: 10 }}>
          <AppText style={[typography.screenTitle, { fontSize: 26, lineHeight: 34 }]} numberOfLines={2}>
            Mes Courses
          </AppText>
          <AppText style={[typography.subtitle, { marginTop: 4 }]}>
            Consultez toutes vos courses
          </AppText>
        </View>
      }
    >
      {hasAnyOrders ? (
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
          <FilterDropdown<TransactionStatusFilter>
            title="Statut"
            iconName="solar:widget-5-outline"
            value={active}
            options={["Tout", "Planifiée", "En cours", "Livré", "Annulé"] as const}
            defaultValue="Tout"
            onSelect={(next) => {
              setActive(next);
              track("courses_filtrees", { filtre_statut: next, filtre_periode: dateFilter });
            }}
          />
          <FilterDropdown<TransactionDateFilter>
            title="Période"
            iconName="solar:calendar-outline"
            value={dateFilter}
            options={TRANSACTION_DATE_FILTERS}
            defaultValue="Toutes dates"
            onSelect={(next) => {
              setDateFilter(next);
              track("courses_filtrees", { filtre_statut: active, filtre_periode: next });
            }}
          />
        </View>
      ) : null}

      {hasAnyOrders ? (
        <View style={{ marginBottom: spacing.sectionGap / 2 }}>
          <Pressable
            onPress={() => router.push("/ma-demande-livraison")}
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
              Demander une nouvelle livraison
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={{ marginTop: 6, borderRadius: radii.card, backgroundColor: colors.white, padding: 20 }}>
          <LoadingState />
        </View>
      ) : error ? (
        <View style={{ marginTop: 6, borderRadius: radii.card, backgroundColor: colors.white, padding: 20 }}>
          <AppText style={{ ...typography.cardTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={2}>
            Impossible de charger vos livraisons
          </AppText>
          <AppText style={{ ...typography.subtitle, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
            {error}
          </AppText>
          <Pressable
            onPress={() => {
              void loadTransactions("initial");
            }}
            style={{
              marginTop: 14,
              minHeight: 56,
              paddingVertical: 14,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText style={typography.buttonTextInverse} numberOfLines={1}>
              Réessayer
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {isFilteredEmpty ? (
        <View style={{ marginTop: 6, borderRadius: radii.card, backgroundColor: colors.white, padding: 20 }}>
          <AppText style={{ ...typography.cardTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={2}>
            Aucune course trouvée
          </AppText>
          <AppText style={{ ...typography.subtitle, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
            {dateFilter === "Toutes dates"
              ? `Aucune course « ${active} ». Essayez un autre filtre.`
              : `Aucune course ne correspond à vos filtres (${active === "Tout" ? "toutes" : active.toLowerCase()} · ${dateFilter.toLowerCase()}).`}
          </AppText>
          <Pressable
            onPress={() => {
              setActive("Tout");
              setDateFilter("Toutes dates");
            }}
            style={{ marginTop: 14, alignSelf: "flex-start" }}
            hitSlop={10}
          >
            <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
              Réinitialiser les filtres
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && orders.length === 0 && !isFilteredEmpty ? (
        <EmptyStateCard
          label={
            active === "Planifiée"
              ? "PLANIFIÉE"
              : active === "En cours"
              ? "EN COURS"
              : active === "Livré"
                ? "LIVRÉ"
                : active === "Annulé"
                  ? "ANNULÉ"
                  : "BIENVENUE"
          }
          iconName="solar:delivery-bold-duotone"
          title={
            active === "Planifiée"
              ? "Aucune livraison planifiée"
              : active === "En cours"
              ? "Aucune livraison en cours"
              : active === "Livré"
                ? "Aucune livraison livrée pour le moment"
                : active === "Annulé"
                  ? "Aucune livraison annulée"
                  : "Vous n’avez pas encore de livraison"
          }
          subtitle={active === "Tout" ? "Créez votre première livraison ou expédition en 30 secondes." : undefined}
          ctas={
            active === "Tout" || active === "En cours"
              ? [
                  { label: "Livraison", onPress: () => router.push("/ma-demande-livraison") },
                  {
                    label: "Expédition",
                    variant: "white",
                    onPress: () => router.push({ pathname: "/ma-demande-expedition", params: { quartier: "" } }),
                  },
                ]
              : []
          }
        />
      ) : orders.length > 0 ? (
        <View style={{ gap: 24, paddingBottom: 8 }}>
          {orders.map((o) => (
            <TransactionCard key={o.id} item={o} />
          ))}
        </View>
      ) : null}
    </ScreenLayout>
  );
}
