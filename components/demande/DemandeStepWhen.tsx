import { View } from "react-native";
import DeliveryDateField from "@/components/DeliveryDateField";
import ModeChoiceCard from "@/components/demande/ModeChoiceCard";
import type { DemandeFlow, DemandeFormState } from "@/lib/transactions/demandeFormState";

type Props = {
  state: DemandeFormState;
  onChange: (patch: Partial<DemandeFormState>) => void;
};

function modeChoiceHint(flow: DemandeFlow): string {
  return flow === "expedition"
    ? "SOURCE DU COLIS (STOCK OU RAMASSAGE)"
    : "CHOISIR OÙ RÉCUPÉRER LE COLIS À LIVRER";
}

export default function DemandeStepWhen({ state, onChange }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <DeliveryDateField
        value={state.scheduledDeliveryDate}
        onChange={(iso) => onChange({ scheduledDeliveryDate: iso })}
        testID="delivery-date-field"
      />
      <ModeChoiceCard
        hint={modeChoiceHint(state.flow)}
        value={state.mode}
        onChange={(mode) => onChange({ mode })}
      />
    </View>
  );
}
