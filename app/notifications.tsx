import { useCallback, useRef, useState } from "react";
import LoadingState from "@/components/LoadingState";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import AppText from "@/components/AppText";
import CenteredScreenHeader from "@/components/CenteredScreenHeader";
import EmptyStateCard from "@/components/EmptyStateCard";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { formatRelativeActivityTime } from "@/lib/api/ticketUi";
import {
  listInAppNotifications,
  markInAppNotificationRead,
} from "@/lib/notifications/inAppNotifications";
import {
  iconForNotificationKind,
  routeForNotification,
  type InAppNotification,
} from "@/lib/notifications/notificationUi";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { logger } from "@/lib/logger";
import { colors, fonts, radii } from "@/theme/tokens";

function NotificationRow({
  item,
  onPress,
}: {
  item: InAppNotification;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(226,232,240,0.9)",
        backgroundColor: item.read ? "transparent" : "rgba(14,165,233,0.04)",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <SolarIcon name={iconForNotificationKind(item.kind)} size={24} color={colors.primary} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <AppText
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              lineHeight: 20,
              fontFamily: item.read ? fonts.bodySemi : fonts.bodyBold,
              color: colors.text,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.title}
          </AppText>
          <AppText
            variant="dense"
            style={{
              fontSize: 11,
              lineHeight: 16,
              fontFamily: fonts.bodyMedium,
              color: "rgba(60,74,60,0.55)",
              flexShrink: 0,
              maxWidth: 88,
              textAlign: "right",
            }}
            numberOfLines={1}
          >
            {formatRelativeActivityTime(item.createdAt)}
          </AppText>
        </View>
        {item.body ? (
          <AppText
            style={{
              marginTop: 4,
              fontSize: 13,
              lineHeight: 18,
              fontFamily: fonts.bodyRegular,
              color: "rgba(60,74,60,0.72)",
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.body}
          </AppText>
        ) : null}
      </View>

      {!item.read ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            marginTop: 6,
            flexShrink: 0,
          }}
        />
      ) : (
        <View style={{ width: 8, flexShrink: 0 }} />
      )}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial" && !hasLoadedOnceRef.current) setLoading(true);
      setError(null);
      setItems(await listInAppNotifications());
    } catch (e: unknown) {
      logger.warn("notifications", "load failed", e);
      setError(String(e instanceof Error ? e.message : e ?? "Erreur"));
      if (!hasLoadedOnceRef.current) setItems([]);
    } finally {
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, []);

  const { refreshing, onRefresh } = usePullToRefresh(() => load("refresh"));

  useFocusEffect(
    useCallback(() => {
      void load("initial");
    }, [load]),
  );

  const onItemPress = useCallback(async (item: InAppNotification) => {
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    try {
      await markInAppNotificationRead(item.id);
    } catch (e) {
      logger.warn("notifications", "mark read failed", e);
    }

    const route = routeForNotification(item);
    if (!route) return;
    if (route.params) {
      router.navigate({ pathname: route.pathname, params: route.params });
    } else {
      router.navigate(route.pathname);
    }
  }, []);

  return (
    <ScreenLayout
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={<CenteredScreenHeader title="Notifications" />}
    >
      {loading && !hasLoadedOnce ? (
        <LoadingState />
      ) : error && items.length === 0 ? (
        <View style={{ gap: 12 }}>
          <AppText
            style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyRegular, color: colors.statusCancelledFg }}
            numberOfLines={4}
          >
            Impossible de charger vos notifications. Vérifiez votre connexion et réessayez.
          </AppText>
          <Pressable
            onPress={() => void load("initial")}
            style={{
              alignSelf: "flex-start",
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: 16,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
            }}
          >
            <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.white }}>
              Réessayer
            </AppText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <EmptyStateCard
          label="NOTIFICATIONS"
          iconName="solar:bell-outline"
          title="Aucune notification pour le moment"
          subtitle="Les mises à jour stock, rapports et promotions apparaîtront ici."
        />
      ) : (
        <View style={{ marginTop: 4 }}>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onPress={() => void onItemPress(item)} />
          ))}
        </View>
      )}
    </ScreenLayout>
  );
}
