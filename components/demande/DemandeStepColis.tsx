import { View, Pressable } from "react-native";
import AppText from "@/components/AppText";
import FormInput from "@/components/FormInput";
import RamassageFieldLabel from "@/components/demande/RamassageFieldLabel";
import StockCartList from "@/components/demande/StockCartList";
import type { DemandeFormState } from "@/lib/transactions/demandeFormState";
import { stockCartSummaryLabel, type StockInventoryItem } from "@/lib/transactions/stockCartHelpers";
import { card } from "@/theme/styles";
import { colors, fonts, radii } from "@/theme/tokens";

type Props = {
  state: DemandeFormState;
  inventory: StockInventoryItem[];
  onChange: (patch: Partial<DemandeFormState>) => void;
  onOpenProductPicker: () => void;
};

export default function DemandeStepColis({ state, inventory, onChange, onOpenProductPicker }: Props) {
  const isExpedition = state.flow === "expedition";
  const cart = isExpedition ? state.expCart : state.livCart;

  if (state.mode === "pickup" && !isExpedition) {
    return (
      <View style={{ gap: 16 }}>
        <FormInput
          label="Description du colis"
          value={state.pickupName}
          onChangeText={(pickupName) => onChange({ pickupName })}
          placeholder="Ex: Documents, petit carton..."
        />
        <FormInput
          label="Quantité"
          leadingIconName="solar:hashtag-outline"
          leadingIconSize={24}
          keyboardType="number-pad"
          value={state.pickupQty}
          onChangeText={(pickupQty) => onChange({ pickupQty: pickupQty.replace(/[^\d]/g, "") })}
          placeholder="1"
        />
      </View>
    );
  }

  if (state.mode === "pickup" && isExpedition) {
    return (
      <View style={{ gap: 16 }}>
        <FormInput label="Ville de l'expédition" value={state.expVille} onChangeText={(expVille) => onChange({ expVille })} placeholder="Ex. Douala" />
        <FormInput label="Agence de voyage" value={state.expAgence} onChangeText={(expAgence) => onChange({ expAgence })} placeholder="Ex. Général Express" />
        <FormInput
          label="Point de départ (adresse du client)"
          value={state.expPickupAddress}
          onChangeText={(expPickupAddress) => onChange({ expPickupAddress })}
          placeholder="Ex. Rue, repère, quartier…"
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {isExpedition ? (
        <>
          <FormInput label="Ville de l'expédition" value={state.expVille} onChangeText={(expVille) => onChange({ expVille })} placeholder="Ex. Douala" />
          <FormInput label="Agence de voyage" value={state.expAgence} onChangeText={(expAgence) => onChange({ expAgence })} placeholder="Ex. Général Express" />
          <View>
            <FormInput label="Point de départ (adresse agence)" value={state.agencyDepartureStreet} editable={false} />
            <AppText
              variant="dense"
              style={{ marginTop: 6, fontSize: 11, lineHeight: 15, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.6)" }}
              numberOfLines={2}
            >
              Colis en stock : le départ se fait depuis l&apos;agence.
            </AppText>
          </View>
        </>
      ) : null}

      <View>
        <RamassageFieldLabel>
          {isExpedition ? "Colis en stock" : "Sélectionner des produits de mon stock"}
        </RamassageFieldLabel>
        <View style={[card.base, { padding: 16, gap: 12 }]}>
          <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
            {stockCartSummaryLabel(cart)}
          </AppText>
          <StockCartList cart={cart} inventory={inventory} onChange={() => undefined} compact />
          <Pressable
            onPress={onOpenProductPicker}
            style={{
              minHeight: 48,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
            }}
          >
            <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={1}>
              {cart.length ? "Modifier les produits" : "Choisir des produits"}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
