import { View } from "react-native";
import AppText from "./AppText";
import SolarIcon from "./SolarIcon";
import { card } from "../theme/styles";
import { colors, fonts, typography } from "../theme/tokens";
import {
  debtCardLines,
  entryKindLabel,
  type ClientBalance,
  type SettlementDebt,
} from "@/lib/reports/debtDisplay";
import { formatXaf } from "@/lib/reports/aggregateReports";

type Props = {
  balance: ClientBalance | null;
  settlement: SettlementDebt | null;
};

const TONE_COLOR = { debt: "#B45309", ok: colors.primary, neutral: colors.text } as const;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Sits under the Solde card. It never replaces or recomputes the Solde: it shows the debt the
 * agency still has to recover and what it takes out of this period's payout.
 */
export default function DebtRecoveryCard({ balance, settlement }: Props) {
  const lines = debtCardLines(balance, settlement);
  const recent = (balance?.entries ?? []).slice(0, 3);

  return (
    <View style={[card.base, { padding: 16, marginTop: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <SolarIcon name="solar:wallet-money-outline" size={22} color={colors.primary} />
        <AppText style={{ ...typography.sectionTitle, fontSize: 14, lineHeight: 20 }} numberOfLines={1}>
          Dette et récupération
        </AppText>
      </View>
      {lines.map((line) => (
        <View
          key={line.label}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4, gap: 12 }}
        >
          <AppText variant="dense" style={{ ...typography.subtitle, fontSize: 13, flexShrink: 1 }}>
            {line.label}
          </AppText>
          <AppText style={{ fontSize: 15, fontFamily: fonts.bodyBold, color: TONE_COLOR[line.tone] }} numberOfLines={1}>
            {line.value}
          </AppText>
        </View>
      ))}
      {recent.length > 0 ? (
        <View style={{ marginTop: 10, gap: 4 }}>
          {recent.map((entry) => (
            <View key={entry.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <AppText variant="dense" style={{ fontSize: 12, color: colors.muted, flexShrink: 1 }} numberOfLines={1}>
                {shortDate(entry.createdAt)} · {entryKindLabel(entry.type)}
                {entry.reversed ? " (annulé)" : ""}
              </AppText>
              <AppText variant="dense" style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
                {entry.amount < 0 ? "-" : "+"}
                {formatXaf(Math.abs(entry.amount))} FCFA
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
