import { useState } from "react";
import { Pressable, View } from "react-native";
import AppText from "./AppText";
import SolarIcon from "./SolarIcon";
import { card } from "../theme/styles";
import { colors, fonts, typography } from "../theme/tokens";
import {
  debtCardLines,
  debtHeadline,
  entryRows,
  type ClientBalance,
  type DebtTone,
  type SettlementDebt,
} from "@/lib/reports/debtDisplay";

type Props = {
  balance: ClientBalance | null;
  settlement: SettlementDebt | null;
};

/** Red = a debt owed, amber = a deduction taken, green = settled. */
const TONE_COLOR: Record<DebtTone, string> = {
  debt: "#C62828",
  deduction: "#B45309",
  ok: "#2E7D32",
  neutral: colors.text,
};

const TONE_TINT: Record<"debt" | "ok", string> = {
  debt: "rgba(198,40,40,0.08)",
  ok: "rgba(46,125,50,0.08)",
};

const COLLAPSED_ROWS = 5;

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Sits under the Solde card. It never replaces or recomputes the Solde: it shows the debt the
 * agency still has to recover, what it takes out of this period's payout, and how the debt built
 * up (deficit days, overpayments, deductions and repayments).
 */
export default function DebtRecoveryCard({ balance, settlement }: Props) {
  const [showAll, setShowAll] = useState(false);
  const headline = debtHeadline(balance, settlement);
  const lines = debtCardLines(balance, settlement);
  const rows = entryRows(balance?.entries ?? []);
  const visible = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);
  const accent = TONE_COLOR[headline.tone];

  return (
    <View style={[card.base, { padding: 16, marginTop: 16, borderLeftWidth: 4, borderLeftColor: accent }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: TONE_TINT[headline.tone],
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 10,
        }}
      >
        <SolarIcon
          name={headline.tone === "debt" ? "solar:danger-circle-bold" : "solar:check-circle-bold"}
          size={22}
          color={accent}
        />
        <AppText style={{ fontSize: 15, fontFamily: fonts.bodyBold, color: accent, flexShrink: 1 }} numberOfLines={2}>
          {headline.text}
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

      {rows.length > 0 ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <AppText variant="dense" style={{ ...typography.subtitle, fontSize: 12 }}>
            Comment la dette s&apos;est formée
          </AppText>
          {visible.map((row) => (
            <View key={row.id} style={{ opacity: row.reversed ? 0.55 : 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <AppText variant="dense" style={{ fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                  {shortDate(row.createdAt)} · {row.title}
                  {row.automatic ? " (automatique)" : ""}
                  {row.reversed ? " · annulé" : ""}
                </AppText>
                <AppText
                  variant="dense"
                  style={{
                    fontSize: 13,
                    fontFamily: fonts.bodyBold,
                    color: TONE_COLOR[row.tone],
                    textDecorationLine: row.reversed ? "line-through" : "none",
                  }}
                  numberOfLines={1}
                >
                  {row.amountLabel}
                </AppText>
              </View>
              {row.reason ? (
                <AppText variant="dense" style={{ fontSize: 12, color: colors.muted }} numberOfLines={2}>
                  {row.reason}
                </AppText>
              ) : null}
            </View>
          ))}
          {rows.length > COLLAPSED_ROWS ? (
            <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={10} style={{ paddingVertical: 6 }}>
              <AppText variant="dense" style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.primary }}>
                {showAll ? "Réduire" : `Voir tout l'historique (${rows.length})`}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
