import { View } from "react-native";
import AppText from "./AppText";
import { card } from "../theme/styles";
import { colors, fonts, radii, typography } from "../theme/tokens";

export type StockProductCardItem = {
  id: string;
  name: string;
  subtitle: string;
  qty: number;
  low?: boolean;
};

export default function StockProductCard({ item }: { item: StockProductCardItem }) {
  const low = item.low ?? false;

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
      <AppText
        style={{ ...typography.subtitle, flex: 1, fontFamily: fonts.bodySemi, color: colors.text, paddingRight: 12 }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.name}
      </AppText>

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
