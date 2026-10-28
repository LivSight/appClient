import { View, Pressable } from "react-native";
import AppText from "@/components/AppText";
import SolarIcon from "@/components/SolarIcon";
import type { DemandeMode } from "@/lib/transactions/demandeFormState";
import { colors, fonts } from "@/theme/tokens";

const INPUT_BG = "#F3F4F5";

type Props = {
  hint: string;
  value: DemandeMode;
  onChange: (next: DemandeMode) => void;
};

export default function ModeChoiceCard({ hint, value, onChange }: Props) {
  const segments: { key: DemandeMode; label: string; iconName: string }[] = [
    { key: "pickup", label: "Ramassage", iconName: "solar:hand-shake-bold" },
    { key: "stock", label: "Colis en stock", iconName: "solar:box-bold" },
  ];

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: "rgba(187,203,184,0.22)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
      }}
    >
      <AppText
        variant="dense"
        style={{
          fontSize: 10,
          lineHeight: 15,
          fontFamily: fonts.bodyBold,
          color: "rgba(60,74,60,0.7)",
          letterSpacing: 1,
          textTransform: "uppercase",
          textAlign: "center",
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {hint}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: INPUT_BG,
          borderRadius: 12,
          padding: 3,
          gap: 3,
        }}
      >
        {segments.map((seg) => {
          const active = value === seg.key;
          return (
            <Pressable
              key={seg.key}
              onPress={() => onChange(seg.key)}
              hitSlop={4}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 9,
                backgroundColor: active ? colors.primary : "transparent",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                paddingHorizontal: 6,
                paddingVertical: 6,
              }}
            >
              <SolarIcon name={seg.iconName} size={15} color={active ? colors.white : colors.primary} />
              <AppText
                variant="dense"
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontFamily: active ? fonts.bodyBold : fonts.bodySemi,
                  color: active ? colors.white : colors.text,
                }}
                numberOfLines={1}
              >
                {seg.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
