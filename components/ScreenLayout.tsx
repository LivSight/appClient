import { RefreshControl, View, type ScrollView, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardInsets } from "@/lib/hooks/useKeyboardVisible";
import { layout } from "../theme/styles";
import { colors, spacing } from "../theme/tokens";
import AppScrollView from "./AppScrollView";
import HeroGridBackground from "./HeroGridBackground";

type Props = {
  children: React.ReactNode;
  /** Use false for screens that shouldn't scroll (e.g. a map screen) */
  scrollable?: boolean;
  /** Rendered above the ScrollView so it stays fixed while content scrolls */
  header?: React.ReactNode;
  /** Less top padding when header is compact (title-only). */
  headerCompact?: boolean;
  /** Rendered below the ScrollView so it stays fixed while content scrolls */
  footer?: React.ReactNode;
  /** Optional props forwarded to the internal ScrollView (e.g. ref/keyboardShouldPersistTaps) */
  scrollViewProps?: Omit<ScrollViewProps, "children">;
  /** Optional ref to the internal ScrollView (for scrollTo on deep-links) */
  scrollViewRef?: React.Ref<ScrollView>;
  /** Pull-to-refresh spinner state (pair with onRefresh) */
  refreshing?: boolean;
  /** Pull-to-refresh handler — wires RefreshControl on the ScrollView */
  onRefresh?: () => void;
};

/**
 * Wraps every screen with the correct background, safe-area padding,
 * and horizontal gutters. Import this instead of writing ScrollView boilerplate.
 */
export default function ScreenLayout({
  children,
  scrollable = true,
  header,
  headerCompact = false,
  footer,
  scrollViewProps,
  scrollViewRef,
  refreshing = false,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();
  const { visible: keyboardVisible, height: keyboardHeight } = useKeyboardInsets();

  const topPadding = headerCompact
    ? insets.top + 8
    : Math.max(spacing.screenPaddingX, insets.top + spacing.screenPaddingX);
  const bottomPadding = Math.max(24, insets.bottom + 24);
  const showFooter = Boolean(footer) && !keyboardVisible;
  const footerSpacer = showFooter ? 120 : 0;
  const scrollBottomPadding = bottomPadding + footerSpacer + keyboardHeight;
  const background = colors.white;

  const scrollViewCommonProps: ScrollViewProps = {
    ref: scrollViewRef,
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: "handled",
    keyboardDismissMode: "interactive",
    ...scrollViewProps,
  };

  if (onRefresh) {
    scrollViewCommonProps.refreshControl = (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    );
  }

  if (header) {
    return (
      <View style={[layout.screen, { backgroundColor: background }]}>
        <HeroGridBackground />
        <View
          style={{
            paddingTop: topPadding,
            paddingHorizontal: spacing.screenPaddingX,
            backgroundColor: "transparent",
          }}
        >
          {header}
        </View>
        <AppScrollView
          {...scrollViewCommonProps}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.screenPaddingX,
            paddingBottom: scrollBottomPadding,
            flexGrow: 1,
          }}
        >
          {children}
        </AppScrollView>
        {showFooter ? footer : null}
      </View>
    );
  }

  const contentStyle = [
    layout.scrollContent,
    { paddingTop: topPadding, paddingBottom: scrollBottomPadding, flexGrow: 1 },
  ];

  if (!scrollable) {
    return (
      <View style={[layout.screen, contentStyle[0], { paddingTop: topPadding, backgroundColor: background }]}>
        <HeroGridBackground />
        {children}
      </View>
    );
  }

  if (footer) {
    return (
      <View style={[layout.screen, { backgroundColor: background }]}>
        <HeroGridBackground />
        <AppScrollView {...scrollViewCommonProps} style={{ flex: 1 }} contentContainerStyle={contentStyle}>
          {children}
        </AppScrollView>
        {showFooter ? footer : null}
      </View>
    );
  }

  return (
    <AppScrollView
      {...scrollViewCommonProps}
      style={[layout.screen, { backgroundColor: background }]}
      contentContainerStyle={contentStyle}
    >
      <HeroGridBackground />
      {children}
    </AppScrollView>
  );
}
