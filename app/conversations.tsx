import { useCallback, useMemo, useState } from "react";
import { View, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import AppText from "@/components/AppText";
import AppTextInput from "@/components/AppTextInput";
import FilterDropdown from "@/components/FilterDropdown";
import TransactionCard from "@/components/TransactionCard";
import EmptyStateCard from "@/components/EmptyStateCard";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { colors, fonts, typography } from "@/theme/tokens";
import { conversationSearchText, mapConversationToTransactionCardItem } from "@/lib/api/conversationUi";
import { loadConversationList } from "@/lib/api/inbox";
import { type EnrichedConversationItem } from "@/lib/api/ticketUi";
import {
  dateFilterStartMs,
  TRANSACTION_DATE_FILTERS,
  type TransactionDateFilter,
} from "@/lib/api/transactionUi";
import { shouldRefreshConversations } from "@/lib/push/notificationRouting";
import { usePushRefresh } from "@/lib/push/usePushRefresh";
import { useUnreadCount } from "@/lib/unreadCount";

type ConversationStatusFilter = "Toutes" | "Non lues" | "Livraisons" | "Expéditions";

const CONVERSATION_STATUS_FILTERS: ConversationStatusFilter[] = ["Toutes", "Non lues", "Livraisons", "Expéditions"];

function matchesStatusFilter(c: EnrichedConversationItem, filter: ConversationStatusFilter): boolean {
  if (filter === "Toutes") return true;
  if (filter === "Non lues") return Boolean(c.isUnread || c.unreadCount);
  if (filter === "Livraisons") return c.type === "livraison";
  return c.type === "expedition";
}

function matchesDateFilter(c: EnrichedConversationItem, filter: TransactionDateFilter): boolean {
  const start = dateFilterStartMs(filter);
  if (start == null) return true;
  const activityMs = Date.parse(String(c.lastActivityAt ?? ""));
  return Number.isFinite(activityMs) && activityMs >= start;
}

export default function ConversationsScreen() {
  const { setTotalUnread } = useUnreadCount();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatusFilter>("Toutes");
  // Defaults to today's activity, like Mes Courses; "Toutes dates" is opt-in.
  const [dateFilter, setDateFilter] = useState<TransactionDateFilter>("Aujourd'hui");

  const [conversations, setConversations] = useState<EnrichedConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const { items, totalUnread } = await loadConversationList();
      setConversations(items);
      setTotalUnread(totalUnread);
    } catch (e: unknown) {
      setError(String(e instanceof Error ? e.message : e ?? "Erreur"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setTotalUnread]);

  useFocusEffect(
    useCallback(() => {
      void loadConversations("initial");
    }, [loadConversations]),
  );

  usePushRefresh(
    useCallback((payload) => shouldRefreshConversations(payload), []),
    useCallback(() => {
      void loadConversations("refresh");
    }, [loadConversations]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        (!q || conversationSearchText(c).includes(q)) &&
        matchesStatusFilter(c, statusFilter) &&
        matchesDateFilter(c, dateFilter),
    );
  }, [conversations, query, statusFilter, dateFilter]);

  const hasActiveFilters = query.trim().length > 0 || statusFilter !== "Toutes" || dateFilter !== "Toutes dates";

  return (
    <ScreenLayout
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadConversations("refresh");
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ),
      }}
      header={
        <View style={{ paddingBottom: 14 }}>
          <AppText style={[typography.screenTitle, { fontSize: 26, lineHeight: 34 }]} numberOfLines={1}>
            Conversations
          </AppText>

          <View style={{ marginTop: 16 }}>
            <View
              style={{
                minHeight: 44,
                borderRadius: 14,
                backgroundColor: "#F3F4F5",
                paddingLeft: 14,
                paddingRight: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <SolarIcon name="solar:magnifer-outline" size={18} color={"rgba(107,114,128,1)"} />
              <AppTextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une commande..."
                placeholderTextColor="#6B7280"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 14,
                  fontFamily: fonts.bodyRegular,
                  color: colors.text,
                  paddingVertical: 8,
                }}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                variant="dense"
              />
            </View>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", gap: 12 }}>
            <FilterDropdown<ConversationStatusFilter>
              title="Statut"
              iconName="solar:widget-5-outline"
              value={statusFilter}
              options={CONVERSATION_STATUS_FILTERS}
              defaultValue="Toutes"
              onSelect={setStatusFilter}
            />
            <FilterDropdown<TransactionDateFilter>
              title="Période"
              iconName="solar:calendar-outline"
              value={dateFilter}
              options={TRANSACTION_DATE_FILTERS}
              defaultValue="Toutes dates"
              onSelect={setDateFilter}
            />
          </View>
        </View>
      }
    >
      <View style={{ gap: 24, marginTop: 6, paddingBottom: 8 }}>
        {loading ? (
          <View style={{ paddingVertical: 8 }}>
            <AppText style={{ ...typography.subtitle, fontFamily: fonts.bodySemi }} numberOfLines={2}>
              Chargement…
            </AppText>
          </View>
        ) : error ? (
          <View style={{ paddingVertical: 8 }}>
            <AppText style={{ ...typography.subtitle, fontFamily: fonts.bodySemi }} numberOfLines={3}>
              {error}
            </AppText>
            <Pressable
              onPress={() => {
                void loadConversations("initial");
              }}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
              hitSlop={10}
            >
              <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                Réessayer
              </AppText>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyStateCard
            label={hasActiveFilters ? "RECHERCHE" : "BIENVENUE"}
            iconName="solar:chat-round-dots-bold"
            title={hasActiveFilters ? "Aucun résultat" : "Aucune conversation pour l’instant"}
            subtitle={
              hasActiveFilters
                ? "Essayez avec d'autres filtres ou un autre mot-clé."
                : "Les conversations apparaissent ici une fois qu'un échange a été ouvert sur une commande."
            }
            ctas={
              hasActiveFilters
                ? [
                    {
                      label: "Réinitialiser les filtres",
                      onPress: () => {
                        setQuery("");
                        setStatusFilter("Toutes");
                        setDateFilter("Toutes dates");
                      },
                    },
                  ]
                : [{ label: "Voir mes livraisons", onPress: () => router.push("/(tabs)/livraison") }]
            }
          />
        ) : (
          filtered.map((c) => (
            <TransactionCard
              key={c.id}
              item={mapConversationToTransactionCardItem(c)}
              onPress={() => router.push({ pathname: "/inbox/[id]", params: { id: c.id } })}
            />
          ))
        )}
      </View>
    </ScreenLayout>
  );
}
