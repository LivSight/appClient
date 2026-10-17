import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import ScreenLayout from "../components/ScreenLayout";
import AppText from "../components/AppText";
import { formatDbText } from "@/lib/formatDisplayText";
import { colors, fonts, radii, typography } from "../theme/tokens";

type Params = {
  addedName?: string;
  addedQty?: string;
  addedSubtitle?: string;
};

export default function ConfirmationAjoutStockScreen() {
  const params = useLocalSearchParams<Params>();

  const addedName = typeof params.addedName === "string" ? params.addedName : "";
  const addedQty = typeof params.addedQty === "string" ? params.addedQty : "";
  const addedSubtitle = typeof params.addedSubtitle === "string" ? params.addedSubtitle : "";

  const subtitle = useMemo(() => {
    const parts = [formatDbText(addedName), formatDbText(addedSubtitle)].filter(Boolean);
    const base = parts.join(" • ");
    const qty = addedQty.trim() ? `Qté: ${addedQty.trim()}` : "";
    return [base, qty].filter(Boolean).join(" — ");
  }, [addedName, addedQty, addedSubtitle]);

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace({
        pathname: "/(tabs)/stock",
        params: {
          addedName,
          addedQty,
          addedSubtitle,
        },
      });
    }, 1700);
    return () => clearTimeout(t);
  }, [addedName, addedQty, addedSubtitle]);

  return (
    <ScreenLayout>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <LottieView
          source={require("../assets/lottie/success-check.json")}
          autoPlay
          loop={false}
          style={{ width: 160, height: 160, marginBottom: 24 }}
        />

        <AppText style={{ ...typography.screenTitle, fontSize: 24, lineHeight: 32, textAlign: "center" }} numberOfLines={2}>
          Ajout au stock effectué
        </AppText>
        <AppText
          variant="dense"
          style={{ marginTop: 10, fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.muted, textAlign: "center" }}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {subtitle || "Redirection vers le stock..."}
        </AppText>
      </View>
    </ScreenLayout>
  );
}

