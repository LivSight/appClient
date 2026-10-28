import { forwardRef } from "react";
import type { ScrollViewProps } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

/**
 * App-wide ScrollView with native drag-to-scroll gestures (RNGH).
 * Use this instead of react-native ScrollView for consistent scrolling on all screens.
 */
const AppScrollView = forwardRef<ScrollView, ScrollViewProps>(function AppScrollView(
  {
    showsVerticalScrollIndicator = false,
    keyboardShouldPersistTaps = "handled",
    keyboardDismissMode = "interactive",
    nestedScrollEnabled = true,
    ...rest
  },
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      nestedScrollEnabled={nestedScrollEnabled}
      {...rest}
    />
  );
});

export default AppScrollView;
