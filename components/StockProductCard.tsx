import { View } from "react-native";
import AppText from "./AppText";
import { card } from "../theme/styles";
import { colors, fonts, radii, typography } from "../theme/tokens";

export type StockProductCardItem = {
  id: string;
  name: string;
  subtitle: string;
  qty: number;
  /** Damaged units (always shown, including 0). */
  defectiveQty?: number;
  low?: boolean;
};

export default function StockProductCard({ item }: { item: StockProductCardItem }) {
  const low = item.low ?? false;
  const defectiveQty = Number.isFinite(Number(item.defectiveQty))
    ? Math.max(0, Math.floor(Number(item.defectiveQty)))
    : 0;

  return (
    <View
      style={[
        card.base,
        {
          paddingHorizontal: 22,
          paddingVertical: 18,
          flexDirection: "row",
          alignItems: "center",
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <AppText
          style={{ ...typography.subtitle, fontFamily: fonts.bodySemi, color: colors.text }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </AppText>
        <AppText
          variant="dense"
          style={{
            ...typography.cardSubtitle,
            marginTop: 4,
            fontFamily: fonts.bodyMedium,
            color: defectiveQty > 0 ? "#B45309" : colors.muted,
          }}
          numberOfLines={1}
        >
          {defectiveQty} défectueux
        </AppText>
      </View>

      <View
        style={{
          minWidth: 44,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radii.pill,
          backgroundColor: low ? "#FEF2F2" : "#EFF8FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText
          variant="dense"
          style={{
            ...typography.subtitle,
            fontFamily: fonts.bodyBold,
            color: low ? "#DC2626" : colors.primary,
          }}
        >
          {item.qty}
        </AppText>
      </View>
    </View>
  );
}
