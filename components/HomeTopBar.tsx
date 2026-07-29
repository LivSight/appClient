import { Pressable, View } from "react-native";
import { colors, fonts, radii } from "../theme/tokens";
import AppText from "./AppText";

type Props = {
  onProfilePress?: () => void;
  initials?: string;
};

export default function HomeTopBar({ onProfilePress, initials }: Props) {
  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 14,
      }}
    >
      <Pressable
        hitSlop={10}
        onPress={onProfilePress}
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          backgroundColor: "#EDEEEF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText variant="dense" style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
          {(initials?.trim() || "A").toUpperCase()}
        </AppText>
      </Pressable>
    </View>
  );
}
