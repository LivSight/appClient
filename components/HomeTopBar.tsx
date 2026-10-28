import { Pressable, View } from "react-native";
import { colors, fonts, radii } from "../theme/tokens";
import AppText from "./AppText";
import SolarIcon from "./SolarIcon";

type Props = {
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
  unreadNotificationCount?: number;
  initials?: string;
};

export default function HomeTopBar({
  onProfilePress,
  onNotificationsPress,
  unreadNotificationCount = 0,
  initials,
}: Props) {
  const badgeLabel =
    unreadNotificationCount > 99 ? "99+" : unreadNotificationCount > 0 ? String(unreadNotificationCount) : null;

  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <Pressable
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={onNotificationsPress}
        style={{
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          backgroundColor: "#EDEEEF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SolarIcon name="solar:bell-outline" size={22} color={colors.text} />
        {badgeLabel ? (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              minHeight: 16,
              paddingHorizontal: 4,
              borderRadius: radii.pill,
              backgroundColor: colors.statusCancelledFg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText
              variant="dense"
              style={{ fontSize: 9, lineHeight: 12, fontFamily: fonts.bodyBold, color: colors.white }}
              numberOfLines={1}
            >
              {badgeLabel}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Profil"
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
