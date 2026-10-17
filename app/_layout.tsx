// @@iconify-code-gen — injects registered Solar icons (see babel.config.js ICONS)
import { Stack, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { usePushNotifications } from "@/lib/push/usePushNotifications";
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

  if (showSplash) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
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
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <UnreadCountProvider>
            <LowStockCountProvider>
              <RootLayoutNav />
            </LowStockCountProvider>
          </UnreadCountProvider>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
