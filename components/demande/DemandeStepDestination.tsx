import { useState } from "react";
import { View, Pressable } from "react-native";
import AppText from "@/components/AppText";
import ExpressToggleCard from "@/components/ExpressToggleCard";
import FormInput from "@/components/FormInput";
import RamassageFieldLabel from "@/components/demande/RamassageFieldLabel";
import SolarIcon from "@/components/SolarIcon";
import { isExpressDeliveryUiEnabled } from "@/lib/config/features";
import type { DemandeFormState } from "@/lib/transactions/demandeFormState";
import { formatSupplementFcfaLabel } from "@/lib/api/tariffUi";
import { card } from "@/theme/styles";
import { colors, fonts, radii } from "@/theme/tokens";

const INPUT_BG = "#F3F4F5";

type Props = {
  state: DemandeFormState;
  expressFee: number | null;
  pickupFee: number | null;
  onChange: (patch: Partial<DemandeFormState>) => void;
};

export default function DemandeStepDestination({ state, expressFee, pickupFee, onChange }: Props) {
  const isExpedition = state.flow === "expedition";
  const [showNotes, setShowNotes] = useState(Boolean(state.livNotes.trim()));

  if (isExpedition) {
    return (
      <View style={{ gap: 16 }}>
        <FormInput
          label="Nom du destinataire"
          value={state.expNomDestinataire}
          onChangeText={(expNomDestinataire) => onChange({ expNomDestinataire })}
          placeholder="Nom complet"
          autoCapitalize="words"
        />
        <FormInput
          label="Numéro de téléphone du destinataire"
          keyboardType="phone-pad"
          value={state.expTelephoneDestinataire}
          onChangeText={(expTelephoneDestinataire) => onChange({ expTelephoneDestinataire })}
          placeholder="6XXXXXX"
        />
      </View>
    );
  }

  if (state.mode === "pickup") {
    return (
      <View style={{ gap: 16 }}>
        <FormInput
          label="Quartier de ramassage"
          value={state.pickupPickupQuartierQuery}
          onChangeText={(pickupPickupQuartierQuery) => onChange({ pickupPickupQuartierQuery })}
          placeholder="Quartier de ramassage..."
        />
        <FormInput
          label="Détail ramassage"
          value={state.pickupPickupLandmark}
          onChangeText={(pickupPickupLandmark) => onChange({ pickupPickupLandmark })}
          placeholder="Ex: Bastos, face à la pharmacie"
        />
        <FormInput
          label="Quartier de livraison"
          value={state.pickupDropoffQuartierQuery}
          onChangeText={(pickupDropoffQuartierQuery) => onChange({ pickupDropoffQuartierQuery })}
          placeholder="Quartier de livraison..."
        />
        <FormInput
          label="Détail livraison"
          value={state.pickupDropoffLandmark}
          onChangeText={(pickupDropoffLandmark) => onChange({ pickupDropoffLandmark })}
          placeholder="Ex: Emombo, derrière la station"
        />

        <View style={[card.base, { padding: 20 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SolarIcon name="solar:hand-shake-bold" size={28} color="#B45309" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2}>
                Ramassage hors stock
              </AppText>
              <AppText variant="dense" style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }} numberOfLines={2}>
                Le colis sera récupéré à votre adresse
              </AppText>
            </View>
            <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: "#B45309" }} numberOfLines={1}>
              {formatSupplementFcfaLabel(pickupFee)}
            </AppText>
          </View>
        </View>

        {isExpressDeliveryUiEnabled() ? (
          <View>
            <RamassageFieldLabel>Type de livraison</RamassageFieldLabel>
            <ExpressToggleCard
              value={state.pickupExpress === "yes"}
              onChange={(next) => onChange({ pickupExpress: next ? "yes" : "no" })}
              supplementXaf={expressFee ?? undefined}
            />
          </View>
        ) : null}

        <FormInput label="Téléphone" keyboardType="phone-pad" value={state.pickupPhone} onChangeText={(pickupPhone) => onChange({ pickupPhone })} placeholder="6XXXXXXX" />

        <View>
          <RamassageFieldLabel>Y a-t-il de l&apos;argent à récupérer ?</RamassageFieldLabel>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => onChange({ pickupCollectCash: "yes" })}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: radii.pill,
                backgroundColor: state.pickupCollectCash === "yes" ? colors.primary : INPUT_BG,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
              }}
            >
              <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: state.pickupCollectCash === "yes" ? colors.white : colors.text }} numberOfLines={1}>
                Oui
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => onChange({ pickupCollectCash: "no", pickupAmount: "" })}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: radii.pill,
                backgroundColor: state.pickupCollectCash === "no" ? colors.primary : INPUT_BG,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
              }}
            >
              <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: state.pickupCollectCash === "no" ? colors.white : colors.text }} numberOfLines={1}>
                Non
              </AppText>
            </Pressable>
          </View>
          {state.pickupCollectCash === "yes" ? (
            <View style={{ marginTop: 12 }}>
              <FormInput
                label="Montant à encaisser"
                leadingIconName="solar:wallet-outline"
                leadingIconSize={24}
                keyboardType="number-pad"
                value={state.pickupAmount}
                onChangeText={(pickupAmount) => onChange({ pickupAmount: pickupAmount.replace(/[^\d]/g, "") })}
                placeholder="Ex: 5 000"
                trailing={
                  <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                    FCFA
                  </AppText>
                }
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <FormInput label="Numéro destinataire" keyboardType="phone-pad" value={state.livPhone} onChangeText={(livPhone) => onChange({ livPhone })} placeholder="6XXXXXXX" />
      <FormInput
        label="Quartier de livraison"
        value={state.livQuartierQuery}
        onChangeText={(livQuartierQuery) => onChange({ livQuartierQuery })}
        placeholder="Ex: Bastos"
      />
      <FormInput
        label="Détail (optionnel)"
        value={state.livDeliveryLandmark}
        onChangeText={(livDeliveryLandmark) => onChange({ livDeliveryLandmark })}
        placeholder="Ex: Face à la pharmacie, portail rouge"
      />

      {isExpressDeliveryUiEnabled() ? (
        <View>
          <RamassageFieldLabel>Type de livraison</RamassageFieldLabel>
          <ExpressToggleCard
            value={state.livExpress === "yes"}
            onChange={(next) => onChange({ livExpress: next ? "yes" : "no" })}
            supplementXaf={expressFee ?? undefined}
          />
        </View>
      ) : null}

      <Pressable onPress={() => setShowNotes((v) => !v)}>
        <AppText style={{ fontSize: 13, lineHeight: 18, fontFamily: fonts.bodySemi, color: colors.primary }} numberOfLines={1}>
          {showNotes ? "Masquer les instructions" : "Ajouter des instructions (optionnel)"}
        </AppText>
      </Pressable>
      {showNotes ? (
        <FormInput
          label="Instructions"
          multiline
          value={state.livNotes}
          onChangeText={(livNotes) => onChange({ livNotes })}
          placeholder="Ex: appeler avant d'arriver, laisser au gardien..."
        />
      ) : null}

      <View>
        <RamassageFieldLabel>Y a-t-il de l&apos;argent à récupérer ?</RamassageFieldLabel>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => onChange({ livCollectCash: "yes" })}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: radii.pill,
              backgroundColor: state.livCollectCash === "yes" ? colors.primary : INPUT_BG,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
            }}
          >
            <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: state.livCollectCash === "yes" ? colors.white : colors.text }} numberOfLines={1}>
              Oui
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => onChange({ livCollectCash: "no", livAmountDueText: "" })}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: radii.pill,
              backgroundColor: state.livCollectCash === "no" ? colors.primary : INPUT_BG,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
            }}
          >
            <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: state.livCollectCash === "no" ? colors.white : colors.text }} numberOfLines={1}>
              Non
            </AppText>
          </Pressable>
        </View>
        {state.livCollectCash === "yes" ? (
          <View style={{ marginTop: 12 }}>
            <FormInput
              label="Montant à encaisser"
              leadingIconName="solar:wallet-outline"
              leadingIconSize={24}
              keyboardType="number-pad"
              value={state.livAmountDueText}
              onChangeText={(livAmountDueText) => onChange({ livAmountDueText })}
              placeholder="Ex: 5 000"
              trailing={
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                  FCFA
                </AppText>
              }
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
