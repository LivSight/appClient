import { View } from "react-native";
import AppText from "@/components/AppText";
import type { DemandeWizardStep } from "@/lib/transactions/demandeFormState";
import { colors, fonts } from "@/theme/tokens";

const STEPS: { step: DemandeWizardStep; label: string }[] = [
  { step: 1, label: "Quand" },
  { step: 2, label: "Colis" },
  { step: 3, label: "Livraison" },
];

type Props = {
  currentStep: DemandeWizardStep;
};

export default function DemandeStepIndicator({ currentStep }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
      {STEPS.map(({ step, label }, index) => {
        const active = step === currentStep;
        const done = step < currentStep;
        return (
          <View key={step} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {index > 0 ? (
              <View
                style={{
                  width: 16,
                  height: 1,
                  backgroundColor: done ? colors.primary : "rgba(187,203,184,0.45)",
                }}
              />
            ) : null}
            <View style={{ alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: 24,
                  minHeight: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active || done ? colors.primary : "#E5E7EB",
                }}
              >
                <AppText
                  variant="dense"
                  style={{
                    fontSize: 11,
                    lineHeight: 14,
                    fontFamily: fonts.bodyBold,
                    color: active || done ? colors.white : "rgba(60,74,60,0.55)",
                  }}
                  numberOfLines={1}
                >
                  {step}
                </AppText>
              </View>
              <AppText
                variant="dense"
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  fontFamily: active ? fonts.bodyBold : fonts.bodyMedium,
                  color: active ? colors.primary : "rgba(60,74,60,0.55)",
                }}
                numberOfLines={1}
              >
                {label}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
