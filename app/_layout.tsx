// @@iconify-code-gen — injects registered Solar icons (see babel.config.js ICONS)
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import { Stack, usePathname } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import LoadingState from "@/components/LoadingState";
import "../global.css";
import { usePushNotifications } from "@/lib/push/usePushNotifications";
import { AnalyticsProvider } from "@/lib/analytics/AnalyticsProvider";
import { useAnalyticsIdentity } from "@/lib/analytics/useAnalyticsIdentity";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { useAuthGuard } from "@/lib/auth/useAuthGuard";
import AppBackground from "@/components/AppBackground";
import { UnreadCountProvider } from "@/lib/unreadCount";
import { LowStockCountProvider } from "@/lib/stock/lowStockCountContext";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import {
  Palanquin_600SemiBold,
  Palanquin_700Bold,
} from "@expo-google-fonts/palanquin";

Sentry.init({
  dsn:
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    "https://7a9185c6060be1dfca455d8dd7969c54@o4512335711436800.ingest.de.sentry.io/4512335818719312",
  sendDefaultPii: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  // Slow/frozen frames need the native SDK, absent in Expo Go
  enableNativeFramesTracking: !isRunningInExpoGo(),
  environment: __DEV__ ? "development" : "production",
});

function RootLayoutNav() {
  const pathname = usePathname();
  const { showSplash } = useAuthGuard(pathname);

  usePushNotifications(pathname, showSplash);
  useAnalyticsIdentity();

  if (showSplash) {
    return <LoadingState fullScreen />;
  }

  return (
    <AppBackground opacity={0.12}>
      <Stack screenOptions={{ headerShown: false }} />
    </AppBackground>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Palanquin_600SemiBold,
    Palanquin_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingState fullScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AnalyticsProvider>
          <AuthProvider>
            <UnreadCountProvider>
              <LowStockCountProvider>
                <RootLayoutNav />
              </LowStockCountProvider>
            </UnreadCountProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
