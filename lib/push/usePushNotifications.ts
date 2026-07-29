import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logger } from "@/lib/logger";
import { registerPushNotificationsAsync } from "@/lib/push/registerPushNotifications";
import { shouldRegisterPushNotifications } from "@/lib/push/pushConfig";
import { emitPushReceived } from "@/lib/push/pushNotificationEvents";
import {
  getDataFromNotification,
  parsePushReceivedPayload,
  resolveClientPushRoute,
} from "@/lib/push/notificationRouting";
import { resolveTransactionDetailPath } from "@/lib/push/resolveTransactionDetailPath";

async function navigateFromNotificationResponse(
  router: ReturnType<typeof useRouter>,
  response: Notifications.NotificationResponse,
) {
  const data = getDataFromNotification(response.notification);
  const route = resolveClientPushRoute(data);
  if (!route) return;

  if (route.screen === "inbox") {
    router.push({ pathname: "/inbox/[id]", params: { id: route.transactionId } });
    return;
  }

  const detailPath = await resolveTransactionDetailPath(route.transactionId);
  router.push(detailPath as `/livraison-detail/${string}` | `/expedition-detail/${string}`);
}

/**
 * Registers push token when logged in; handles notification tap + cold start from notification.
 */
export function usePushNotifications(pathname: string, checking: boolean) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const coldStartHandledRef = useRef(false);

  useEffect(() => {
    if (checking || !isAuthenticated || !shouldRegisterPushNotifications()) return;

    let cancelled = false;
    (async () => {
      if (cancelled) return;
      try {
        await registerPushNotificationsAsync();
      } catch (e) {
        logger.warn("push", "registerPushNotificationsAsync failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checking, isAuthenticated, pathname]);

  useEffect(() => {
    if (checking || !isAuthenticated || !shouldRegisterPushNotifications()) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      void registerPushNotificationsAsync().catch((e) => {
        logger.warn("push", "registerPushNotificationsAsync on resume failed", e);
      });
    });

    return () => subscription.remove();
  }, [checking, isAuthenticated]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const payload = parsePushReceivedPayload(getDataFromNotification(notification));
      if (payload) emitPushReceived(payload);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      void navigateFromNotificationResponse(router, response);
    });

    void (async () => {
      if (coldStartHandledRef.current) return;
      const last = await Notifications.getLastNotificationResponseAsync();
      coldStartHandledRef.current = true;
      if (last) {
        await navigateFromNotificationResponse(router, last);
      }
    })();

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);
}
