// @@iconify-code-gen — injects registered Solar icons (see babel.config.js ICONS)
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

export default function RootLayout() {
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
