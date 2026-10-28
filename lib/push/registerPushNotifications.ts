import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerPushToken, deletePushToken } from "@/lib/api/pushTokens";
import { getEASProjectId } from "@/lib/config/expoProject";
import { logger } from "@/lib/logger";
import {
  clearRegisteredPushToken,
  getRegisteredPushTokenAsync,
  rememberRegisteredPushToken,
} from "@/lib/push/pushTokenStore";
import { shouldSuppressClientPushPresentation } from "@/lib/push/notificationRouting";

const ANDROID_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const suppress = shouldSuppressClientPushPresentation(
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : undefined,
    );
    if (suppress) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3090C0",
  });
}

/**
 * Requests permission, obtains Expo push token, and registers it with backend_core via gateway.
 */
export async function registerPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) {
    logger.info("push", "Not a physical device, skipping.");
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    logger.warn("push", "Permission not granted", finalStatus);
    return;
  }

  await ensureAndroidChannel();

  const projectId = getEASProjectId();
  if (!projectId) {
    logger.warn("push", "Missing EAS projectId; push token disabled.");
    return;
  }

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  logger.debug("push", "Got Expo push token");

  await registerPushToken(expoPushToken);
  rememberRegisteredPushToken(expoPushToken);
  logger.info("push", "Push token registered with backend");
}

/** Best-effort removal of push token on logout (errors ignored). */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  const token = await getRegisteredPushTokenAsync();
  try {
    if (token) {
      await deletePushToken(token);
    } else {
      logger.warn("push", "unregisterPushNotificationsAsync: no token found, skipping DELETE");
    }
  } catch (e) {
    logger.warn("push", "unregisterPushNotificationsAsync failed", e);
  } finally {
    clearRegisteredPushToken();
  }
}
