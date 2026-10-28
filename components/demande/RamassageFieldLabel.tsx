import AppText from "@/components/AppText";
import { colors, fonts } from "@/theme/tokens";

export default function RamassageFieldLabel({ children }: { children: string }) {
  return (
    <AppText
      style={{
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fonts.bodySemi,
        color: colors.text,
        marginBottom: 8,
      }}
      numberOfLines={2}
    >
      {children}
    </AppText>
  );
}
