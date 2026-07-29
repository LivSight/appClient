import { Platform } from "react-native";

// ─── Colors ──────────────────────────────────────────────────────────────────
export const colors = {
  bg: "#F8F9FA",
  primary: "#0EA5E9",
  primaryDark: "#0284C7",
  text: "#191C1D",
  muted: "#3C4A3C",
  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  cardStroke: "#E2E8F0",
  iconBg: "#E0F2FE",
  placeholderBg: "#EEF2F7",
  statusPendingBg: "#E9F4FB",
  statusDeliveredBg: "#EAF7EE",
  statusDeliveredFg: "#2E7D32",
  statusCancelledBg: "#FCECEC",
  statusCancelledFg: "#D32F2F",
  tabInactive: {
    commandes: "#64748B",
    rapports: "#94A3B8",
    stock: "#6B7280",
  },
} as const;

// ─── Border Radii ────────────────────────────────────────────────────────────
export const radii = {
  card: 32,
  pill: 9999,
  icon: 20,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  screenPaddingX: 24,
  sectionGap: 40,
  cardPadding: 24,
  gridColGap: 12,
  gridRowGap: 4,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
      borderWidth: 1,
      borderColor: "#E2E8F0", // colors.cardStroke — inlined to avoid forward-reference
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  })!,
};

export const fonts = {
  titleBold: "Palanquin_700Bold",
  titleSemi: "Palanquin_600SemiBold",
  bodyRegular: "Montserrat_400Regular",
  bodyMedium: "Montserrat_500Medium",
  bodySemi: "Montserrat_600SemiBold",
  bodyBold: "Montserrat_700Bold",
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const typography = {
  screenTitle: {
    fontFamily: fonts.titleBold,
    fontWeight: "normal" as const,
    fontSize: 36,
    // Palanquin needs ~1.3x lineHeight or RN clips ascenders/descenders
    lineHeight: 48,
    letterSpacing: -0.9,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontWeight: "normal" as const,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  sectionTitle: {
    fontFamily: fonts.titleSemi,
    fontWeight: "normal" as const,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: colors.text,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontWeight: "normal" as const,
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontWeight: "normal" as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  bodyRegular: {
    fontFamily: fonts.bodyRegular,
    fontWeight: "normal" as const,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontWeight: "normal" as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.white,
  },
  link: {
    fontFamily: fonts.bodyBold,
    fontWeight: "normal" as const,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontWeight: "normal" as const,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  buttonTextInverse: {
    fontFamily: fonts.bodyBold,
    fontWeight: "normal" as const,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
  },
  bannerTitle: {
    fontFamily: fonts.titleBold,
    fontWeight: "normal" as const,
    fontSize: 24,
    lineHeight: 32,
    color: colors.white,
  },
} as const;
