import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View, useWindowDimensions } from "react-native";
import type { ScrollView } from "react-native-gesture-handler";
import AppScrollView from "@/components/AppScrollView";
import AppText from "@/components/AppText";
import SolarIcon from "@/components/SolarIcon";
import {
  shouldPlayStatusChipScrollHint,
  statusChipExtraCount,
  STATUS_CHIP_SCROLL_HINT_CHIP_WIDTH,
  STATUS_CHIP_SCROLL_HINT_DELAY_MS,
  statusChipScrollHintDurationMs,
  statusChipScrollHintOffsetX,
} from "@/lib/ui/statusChipScrollHint";
import { colors, fonts, radii, shadows, spacing } from "@/theme/tokens";

export type StatusChip = {
  label: string;
  count: number;
  iconName: string;
  color: string;
};

export default function StatusChipRow({
  chips,
  /** Force horizontal scroll; defaults to true when there are more than 4 chips. */
  scrollable,
  /**
   * When set (e.g. report period), slowly reveal every extra chip once, then stay.
   * Replays when the key changes.
   */
  scrollHintKey,
}: {
  chips: StatusChip[];
  scrollable?: boolean;
  scrollHintKey?: string;
}) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const userInteractedRef = useRef(false);
  const hintAnim = useMemo(() => new Animated.Value(0), []);
  const shouldScroll = scrollable ?? chips.length > 4;
  const extraCount = statusChipExtraCount(chips.length);
  const totalGap = spacing.gridColGap * Math.max(0, chips.length - 1);
  const equalWidth =
    chips.length > 0 ? (width - spacing.screenPaddingX * 2 - totalGap) / chips.length : 0;
  const cardWidth = shouldScroll ? STATUS_CHIP_SCROLL_HINT_CHIP_WIDTH : equalWidth;

  useEffect(() => {
    userInteractedRef.current = false;
    hintAnim.stopAnimation();
    hintAnim.setValue(0);

    if (
      !shouldPlayStatusChipScrollHint({
        scrollable: shouldScroll,
        hintKey: scrollHintKey,
        extraCount,
      })
    ) {
      return;
    }

    const targetX = statusChipScrollHintOffsetX(extraCount);
    const duration = statusChipScrollHintDurationMs(extraCount);
    let listenerId: string | undefined;
    let animation: Animated.CompositeAnimation | undefined;

    const startTimer = setTimeout(() => {
      if (userInteractedRef.current) return;

      listenerId = hintAnim.addListener(({ value }) => {
        if (userInteractedRef.current) {
          animation?.stop();
          return;
        }
        scrollRef.current?.scrollTo({ x: value, animated: false });
      });

      animation = Animated.timing(hintAnim, {
        toValue: targetX,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      animation.start(({ finished }) => {
        if (listenerId) hintAnim.removeListener(listenerId);
        if (finished && !userInteractedRef.current) {
          scrollRef.current?.scrollTo({ x: targetX, animated: false });
        }
      });
    }, STATUS_CHIP_SCROLL_HINT_DELAY_MS);

    return () => {
      clearTimeout(startTimer);
      animation?.stop();
      if (listenerId) hintAnim.removeListener(listenerId);
      hintAnim.stopAnimation();
    };
  }, [shouldScroll, scrollHintKey, extraCount, hintAnim]);

  const markInteracted = () => {
    userInteractedRef.current = true;
    hintAnim.stopAnimation();
  };

  const row = chips.map((chip) => (
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
  ));

  if (shouldScroll) {
    return (
      <AppScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onScrollBeginDrag={markInteracted}
        onTouchStart={markInteracted}
        contentContainerStyle={{
          flexDirection: "row",
          gap: spacing.gridColGap,
          paddingRight: spacing.screenPaddingX,
        }}
      >
        {row}
      </AppScrollView>
    );
  }

  return <View style={{ flexDirection: "row", gap: spacing.gridColGap }}>{row}</View>;
}
