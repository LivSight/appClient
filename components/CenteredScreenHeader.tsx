import { Pressable, View } from "react-native";
import { router } from "expo-router";
import AppText from "./AppText";
import SolarIcon from "./SolarIcon";
import { colors, fonts, typography } from "../theme/tokens";

type Props = {
  title: string;
  subtitle?: string | null;
  /** Tighter row padding — use when subtitle lives in scroll content below. */
  compact?: boolean;
  /**
   * Defaults to true. Use false for tab screens.
   */
  showBack?: boolean;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
};

export default function CenteredScreenHeader({
  title,
  subtitle,
  compact = false,
  showBack = true,
  onBackPress,
  rightSlot,
}: Props) {
  const back =
    onBackPress ??
    (() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      // Deep link / empty stack: land on Accueil instead of a GO_BACK warning.
      router.replace("/(tabs)");
    });

  return (
    <View style={{ paddingBottom: compact ? 4 : 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: compact ? 40 : 44,
          paddingVertical: compact ? 2 : 8,
        }}
      >
        {showBack ? (
          <Pressable onPress={back} hitSlop={10} style={{ width: 44, height: 44, justifyContent: "center" }}>
            <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 44, height: 44 }} />
        )}

        <View style={{ flex: 1, alignItems: "center" }}>
          <AppText style={{ ...typography.sectionTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </AppText>
        </View>

        {rightSlot ? <View style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}>{rightSlot}</View> : <View style={{ width: 44, height: 44 }} />}
      </View>

      {subtitle ? (
        <AppText
          variant="dense"
          style={{
            marginTop: 14,
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
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

