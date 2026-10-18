import { ActivityIndicator, View } from "react-native";
import AppText from "@/components/AppText";
import { colors, typography } from "@/theme/tokens";

type Props = {
  /** Optional text under the spinner (e.g. "Chargement des rapports…"). */
  label?: string;
  /** Fills the available space and centers — for splash/redirect screens. */
  fullScreen?: boolean;
};

/**
 * The app's single loading indicator: large primary spinner, centered.
 * Use this everywhere instead of ad-hoc ActivityIndicator / "Chargement…" cards
 * so every screen loads with the same animation. In-button spinners (small,
 * white, inside a Pressable) are the one allowed exception.
 */
export default function LoadingState({ label, fullScreen = false }: Props) {
  return (
    <View
      testID="loading-state"
      style={
        fullScreen
          ? { flex: 1, alignItems: "center", justifyContent: "center" }
          : { paddingVertical: 40, alignItems: "center", justifyContent: "center" }
      }
    >
      <ActivityIndicator testID="loading-state-spinner" size="large" color={colors.primary} />
      {label ? (
        <AppText style={{ ...typography.subtitle, marginTop: 12, textAlign: "center" }} numberOfLines={2}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}
