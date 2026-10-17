import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import ScreenLayout from "@/components/ScreenLayout";
import AppText from "@/components/AppText";
import LottieView from "lottie-react-native";
import { fonts, typography } from "@/theme/tokens";

export default function AnnulationConfirmeeScreen() {
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/(tabs)/livraison");
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <ScreenLayout>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
        <LottieView
          source={require("../assets/lottie/success-check.json")}
          autoPlay
          loop={false}
          colorFilters={[
            { keypath: "Circle.Stroke", color: "#EF4444" },
            { keypath: "Check.Stroke", color: "#EF4444" },
          ]}
          style={{ width: 168, height: 168 }}
        />
        <AppText
          variant="dense"
          style={{
            marginTop: 14,
            ...typography.bodyRegular,
            fontFamily: fonts.bodySemi,
            color: "rgba(60,74,60,0.7)",
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Annulation confirmée
        </AppText>
      </View>
    </ScreenLayout>
  );
}

