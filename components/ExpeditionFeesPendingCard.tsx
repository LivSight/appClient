import { View } from "react-native";
import AppText from "./AppText";
import SolarIcon from "./SolarIcon";
import { colors, fonts, radii } from "../theme/tokens";

/**
 * Expédition (Phase 2) : pas de tarif auto ni de COD. Les frais transport et
 * main agence sont saisis par l'agent après la facture du transporteur —
 * le total à facturer reste « à confirmer » à la création.
 */
export default function ExpeditionFeesPendingCard() {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
          <SolarIcon name="solar:wallet-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
            Total à facturer
          </AppText>
          <AppText
            variant="dense"
            style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }}
            numberOfLines={2}
          >
            Frais transport + main agence
          </AppText>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: radii.pill,
            backgroundColor: "rgba(180,83,9,0.10)",
            borderWidth: 1,
            borderColor: "rgba(180,83,9,0.25)",
            flexShrink: 0,
          }}
        >
          <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: "#B45309" }} numberOfLines={1}>
            Frais à confirmer
          </AppText>
        </View>
      </View>
      <AppText
        variant="dense"
        style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
        numberOfLines={3}
      >
        Les frais seront confirmés par l&apos;agence après la facture du transporteur. Aucun montant n&apos;est encaissé à la livraison.
      </AppText>
    </View>
  );
}
