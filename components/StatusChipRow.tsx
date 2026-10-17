import { View, useWindowDimensions } from "react-native";
import AppText from "@/components/AppText";
import SolarIcon from "@/components/SolarIcon";
import { colors, fonts, radii, shadows, spacing } from "@/theme/tokens";

export type StatusChip = {
  label: string;
  count: number;
  iconName: string;
  color: string;
};

export default function StatusChipRow({ chips }: { chips: StatusChip[] }) {
  const { width } = useWindowDimensions();
  const totalGap = spacing.gridColGap * (chips.length - 1);
  const cardWidth = (width - spacing.screenPaddingX * 2 - totalGap) / chips.length;

  return (
    <View style={{ flexDirection: "row", gap: spacing.gridColGap }}>
      {chips.map((chip) => (
        <View
          key={chip.label}
          style={{
            width: cardWidth,
            backgroundColor: colors.cardBg,
            borderRadius: radii.card,
            paddingVertical: 14,
            paddingHorizontal: 4,
            alignItems: "center",
            ...shadows.card,
          }}
        >
          <SolarIcon name={chip.iconName} size={22} color={chip.color} />
          <AppText
            style={{ marginTop: 6, fontSize: 18, lineHeight: 24, fontFamily: fonts.bodyBold, color: colors.text }}
            numberOfLines={1}
          >
            {String(chip.count)}
          </AppText>
          <AppText
            variant="dense"
            style={{
              marginTop: 2,
              fontSize: 10,
              lineHeight: 14,
              fontFamily: fonts.bodySemi,
              color: "rgba(60,74,60,0.6)",
              textAlign: "center",
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {chip.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}
