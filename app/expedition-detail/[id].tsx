import { useMemo, useState, useCallback } from "react";
import { useLoadEffect } from "@/lib/hooks/useLoadEffect";
import { Alert, View, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Linking from "expo-linking";
import { FontAwesome } from "@expo/vector-icons";
import ScreenLayout from "../../components/ScreenLayout";
import LivraisonDetailHeader from "../../components/LivraisonDetailHeader";
import SolarIcon from "../../components/SolarIcon";
import TransactionDetailCardExpedition from "../../components/TransactionDetailCardExpedition";
import { card } from "../../theme/styles";
import { colors, fonts, radii, typography } from "../../theme/tokens";
import { hapticLight } from "@/lib/haptics";
import AppText from "../../components/AppText";
import { getTransactionById, getTransactionNavigationId, mapTxnStatusToUi, type Transaction } from "@/lib/api/transactions";
import { scheduledDeliveryLabelFromTransaction } from "@/lib/api/transactionUi";
import { formatScheduledDeliveryLabel } from "@/lib/scheduling/deliveryDate";
import { isTransactionPushType, matchesOpenTransaction } from "@/lib/push/notificationRouting";
import { usePushRefresh } from "@/lib/push/usePushRefresh";

type Expedition = {
  id: string;
  reference?: string | null;
  receiverPhone: string;
  receiverName?: string | null;
  collectCash: boolean;
  amountXaf: number;
  express: boolean;
  departureCity?: string | null;
  departureStreet?: string | null;
  destinationCity?: string | null;
  destinationStreet?: string | null;
  created_at?: string;
};

function formatFcfa(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v.toLocaleString("fr-FR").replace(/\s/g, " ");
}

function toE164Cameroon(phoneRaw: string): string | null {
  const digits = phoneRaw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  const onlyDigits = digits.replace(/[^\d]/g, "");
  if (onlyDigits.length === 9 && (onlyDigits.startsWith("6") || onlyDigits.startsWith("7"))) return `+237${onlyDigits}`;
  if (onlyDigits.length >= 10) return `+${onlyDigits}`;
  return null;
}

function mapTransactionToExpedition(tx: Transaction): Expedition {
  const id = getTransactionNavigationId(tx);
  const reference = typeof tx.transactionReference === "string" && tx.transactionReference.trim().length ? tx.transactionReference.trim() : null;
  const receiverPhone =
    (typeof tx.receiver_phone === "string" && tx.receiver_phone.trim().length ? tx.receiver_phone.trim() : "") ||
    (typeof tx.receiverData?.phone === "string" ? tx.receiverData.phone.trim() : "");
  const receiverName = typeof tx.receiver_name === "string" && tx.receiver_name.trim().length ? tx.receiver_name.trim() : null;
  const amount = Number(tx.amount ?? 0);
  const collectCash = typeof tx.cash_collect === "boolean" ? tx.cash_collect : typeof tx.collect_cash === "boolean" ? tx.collect_cash : amount > 0;
  const express = Boolean(tx.express);

  const departureCity = typeof tx.departure?.city === "string" ? tx.departure.city : String(tx.departure_city ?? "");
  const departureStreet = typeof tx.departure?.street === "string" ? tx.departure.street : String(tx.departure_street ?? "");
  const destinationCity = typeof tx.destination?.city === "string" ? tx.destination.city : String(tx.destination_city ?? "");
  const destinationStreet = typeof tx.destination?.street === "string" ? tx.destination.street : String(tx.destination_street ?? "");

  return {
    id,
    reference,
    receiverPhone,
    receiverName,
    collectCash,
    amountXaf: Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0,
    express,
    departureCity: departureCity.trim().length ? departureCity.trim() : null,
    departureStreet: departureStreet.trim().length ? departureStreet.trim() : null,
    destinationCity: destinationCity.trim().length ? destinationCity.trim() : null,
    destinationStreet: destinationStreet.trim().length ? destinationStreet.trim() : null,
    created_at: typeof tx.created_at === "string" ? tx.created_at : undefined,
  };
}

export default function ExpeditionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadExpedition = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getTransactionById(String(id));
      setTx(data);
    } catch (e: unknown) {
      setTx(null);
      setLoadError(String(e instanceof Error ? e.message : e ?? "Impossible de charger l'expédition."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useLoadEffect(loadExpedition);

  usePushRefresh(
    useCallback(
      (payload) => isTransactionPushType(String(payload.type)) && matchesOpenTransaction(payload, id),
      [id],
    ),
    useCallback(() => {
      void loadExpedition();
    }, [loadExpedition]),
  );

  const expedition = useMemo(() => (tx ? mapTransactionToExpedition(tx) : null), [tx]);
  const referenceTitle = useMemo(() => {
    if (!expedition) return null;
    return expedition.reference ? expedition.reference : `TR-${expedition.id}`;
  }, [expedition]);
  const createdLabel = useMemo(() => {
    const iso = expedition?.created_at;
    if (!iso) return "Effectuée —";
    try {
      return `Effectuée le ${new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
    } catch {
      return "Effectuée —";
    }
  }, [expedition?.created_at]);

  const trajet = useMemo(() => {
    if (!expedition) return "—";
    const from = expedition.departureCity?.trim() || "—";
    const to = expedition.destinationCity?.trim() || "—";
    return `${from} → ${to}`;
  }, [expedition]);

  const amountHeaderLabel = expedition?.collectCash ? "MONTANT À COLLECTER" : "MONTANT TOTAL";
  const scheduledDeliveryIso =
    typeof tx?.scheduled_delivery_date === "string" && tx.scheduled_delivery_date.trim().length
      ? tx.scheduled_delivery_date.trim()
      : null;
  const scheduledDeliveryLabel = useMemo(() => {
    if (!scheduledDeliveryIso) return null;
    const label = formatScheduledDeliveryLabel(scheduledDeliveryIso);
    return label === "aujourd'hui" ? "aujourd'hui" : `le ${label}`;
  }, [scheduledDeliveryIso]);
  const scheduledCardLabel = useMemo(() => (tx ? scheduledDeliveryLabelFromTransaction(tx) : undefined), [tx]);
  const isPlannedStatus = String(tx?.status ?? "").trim().toLowerCase() === "scheduled";
  const statusUiLabel = mapTxnStatusToUi(tx?.status ?? undefined);
  const deliveryAttempt = Number.isFinite(Number(tx?.delivery_attempt))
    ? Math.max(1, Math.floor(Number(tx?.delivery_attempt)))
    : 1;

  return (
    <ScreenLayout
      header={
        <LivraisonDetailHeader
          referenceLabel={referenceTitle}
        />
      }
    >
      {!expedition ? (
        <View style={{ paddingVertical: 16 }}>
          <AppText style={{ color: "#D32F2F", fontFamily: fonts.bodySemi, marginBottom: 12 }}>
            {loading ? "Chargement…" : loadError ? loadError : "Expédition introuvable"}
          </AppText>
          {!loading && loadError ? (
            <Pressable
              onPress={() => {
                if (!id) return;
                void hapticLight();
                router.replace({ pathname: "/expedition-detail/[id]", params: { id: String(id) } });
              }}
              style={{
                minHeight: 48,
                borderRadius: radii.pill,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                alignSelf: "flex-start",
              }}
            >
              <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={1}>
                Réessayer
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          {scheduledDeliveryIso ? (
            <View style={[card.base, { padding: 18, marginBottom: 16 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                {isPlannedStatus ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: radii.pill,
                      backgroundColor: "rgba(14,165,233,0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(14,165,233,0.20)",
                    }}
                  >
                    <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.6 }} numberOfLines={1}>
                      {statusUiLabel}
                    </AppText>
                  </View>
                ) : null}
                <AppText style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
                  Expédition prévue {scheduledDeliveryLabel}
                </AppText>
              </View>
              {deliveryAttempt > 1 ? (
                <AppText variant="dense" style={{ marginTop: 8, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: colors.muted }} numberOfLines={1}>
                  Tentative n° {deliveryAttempt}
                </AppText>
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: 16 }}>
            <View style={[card.base, { padding: 18 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={{ fontSize: 18, lineHeight: 26, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                    {expedition.receiverName?.trim() || "Destinataire"}
                  </AppText>
                  <AppText variant="dense" style={{ ...typography.subtitle, fontSize: 12, lineHeight: 16, marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                    {trajet}
                  </AppText>
                </View>

                <View style={{ flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable
                    onPress={() => {
                      const e164 = toE164Cameroon(expedition.receiverPhone);
                      void Linking.openURL(`tel:${e164 ?? expedition.receiverPhone}`);
                    }}
                    hitSlop={10}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                  >
                    <SolarIcon name="solar:phone-outline" size={22} color={colors.text} />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const e164 = toE164Cameroon(expedition.receiverPhone);
                      const phoneDigits = (e164 ?? expedition.receiverPhone).replace(/[^\d]/g, "");
                      void Linking.openURL(`https://wa.me/${phoneDigits}`);
                    }}
                    hitSlop={10}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                  >
                    <FontAwesome name="whatsapp" size={24} color={"#25D366"} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 18, gap: 16 }}>
            <TransactionDetailCardExpedition
              amountHeaderLabel={amountHeaderLabel}
              amountXaf={expedition.amountXaf}
              lines={[
                { k: "Type de service", v: "Expédition" },
                { k: "Trajet", v: trajet },
                { k: "Agence (départ)", v: expedition.departureStreet?.trim() || "—" },
                { k: "Adresse destinataire", v: expedition.destinationStreet?.trim() || "—" },
                { k: "Téléphone", v: expedition.receiverPhone?.trim() || "—" },
                { k: "Express", v: expedition.express ? "Oui" : "Non" },
                ...(scheduledCardLabel ? [{ k: "Date de livraison", v: scheduledCardLabel }] : []),
                { k: "Date", v: createdLabel },
              ]}
              showCollectCashBadge={expedition.collectCash}
            />

            <Pressable
              onPress={() => {
                if (!expedition?.id) return;
                void hapticLight();
                router.push({ pathname: "/inbox/[id]", params: { id: String(expedition.id), intent: "report" } });
              }}
              style={{
                minHeight: 56,
                borderRadius: radii.pill,
                backgroundColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
                paddingVertical: 14,
              }}
              hitSlop={10}
            >
              <SolarIcon name="solar:dialog-bold" size={24} color={colors.text} />
              <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold }} numberOfLines={2} ellipsizeMode="tail">
                Signaler un problème
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => Alert.alert("Reçu PDF", "Télécharger le reçu (UI-only).")}
              style={{
                minHeight: 56,
                borderRadius: radii.pill,
                backgroundColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
                paddingVertical: 14,
              }}
              hitSlop={10}
            >
              <SolarIcon name="solar:download-outline" size={22} color={colors.text} />
              <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold }} numberOfLines={2} ellipsizeMode="tail">
                Reçu PDF
              </AppText>
            </Pressable>
          </View>
        </>
      )}
    </ScreenLayout>
  );
}

