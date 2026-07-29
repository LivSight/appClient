import { useMemo } from "react";
import { Alert, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenLayout from "../components/ScreenLayout";
import AppText from "../components/AppText";
import FormButton from "../components/FormButton";
import SolarIcon from "../components/SolarIcon";
import CenteredScreenHeader from "../components/CenteredScreenHeader";
import { card } from "../theme/styles";
import { colors, fonts, typography } from "../theme/tokens";
import { hapticSuccess } from "@/lib/haptics";
import { buildExpeditionDepartureStreet, isExpeditionService, parseExpeditionClient } from "@/lib/expeditionClient";
import { createTransaction, buildPayloadFromPickupResume } from "@/lib/api/transactions";
import DeliveryFeeTotalCard from "../components/DeliveryFeeTotalCard";
import ExpeditionFeesPendingCard from "../components/ExpeditionFeesPendingCard";
import { useDeliveryFeeEstimate } from "@/lib/hooks/useDeliveryFeeEstimate";
import {
  formatScheduledDeliveryDisplayLabel,
  isScheduledDeliveryDateValid,
  todayIsoInSchedulingTimezone,
} from "@/lib/scheduling/deliveryDate";

type Params = {
  quartier?: string; // legacy
  deliveryAddress?: string;
  pickupPhone?: string;
  pickupAddress?: string;
  pickupPickupQuartier?: string;
  pickupPickupLandmark?: string;
  pickupDropoffQuartier?: string;
  pickupDropoffLandmark?: string;
  pickupExpress?: "yes" | "no";
  pickupName?: string;
  pickupQty?: string;
  pickupCollectCash?: "yes" | "no";
  pickupAmount?: string;
  service?: string;
  expeditionClient?: string;
  expAgence?: string;
  expPickupAddress?: string;
  scheduledDeliveryDate?: string;
};

function parseIntSafe(input: string | undefined): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d]/g, "");
  const n = cleaned.length ? Number(cleaned) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function formatFcfa(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v.toLocaleString("fr-FR").replace(/\s/g, " ");
}

function SectionRow({ label, onEdit }: { label: string; onEdit?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          variant="dense"
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontFamily: fonts.bodyBold,
            color: "rgba(60,74,60,0.7)",
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
          numberOfLines={2}
        >
          {label}
        </AppText>
      </View>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={10}>
          <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
            Modifier
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={[card.base, { padding: 20 }]}>{children}</View>;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.75)" }} numberOfLines={2}>
          {label}
        </AppText>
      </View>
      <View style={{ flexShrink: 0, maxWidth: 220 }}>
        <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text, textAlign: "right" }} numberOfLines={2} ellipsizeMode="tail">
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default function ResumeProduitRamasseScreen() {
  const params = useLocalSearchParams<Params>();

  const quartierLivraison = typeof params.quartier === "string" ? params.quartier : "";
  const deliveryAddress = typeof params.deliveryAddress === "string" ? params.deliveryAddress : "";
  const phone = typeof params.pickupPhone === "string" ? params.pickupPhone : "";
  const ramassageAddress = typeof params.pickupAddress === "string" ? params.pickupAddress : "";
  const pickupPickupQuartier = typeof params.pickupPickupQuartier === "string" ? params.pickupPickupQuartier : "";
  const pickupPickupLandmark = typeof params.pickupPickupLandmark === "string" ? params.pickupPickupLandmark : "";
  const pickupDropoffQuartier = typeof params.pickupDropoffQuartier === "string" ? params.pickupDropoffQuartier : "";
  const pickupDropoffLandmark = typeof params.pickupDropoffLandmark === "string" ? params.pickupDropoffLandmark : "";
  const express = params.pickupExpress === "yes" ? "yes" : "no";
  const itemName = typeof params.pickupName === "string" ? params.pickupName : "";
  const qty = parseIntSafe(typeof params.pickupQty === "string" ? params.pickupQty : "");
  const collectCash = params.pickupCollectCash === "yes" ? "yes" : "no";
  const amount = parseIntSafe(typeof params.pickupAmount === "string" ? params.pickupAmount : "");
  const forExpedition = isExpeditionService(typeof params.service === "string" ? params.service : undefined);
  const expAgence = typeof params.expAgence === "string" ? params.expAgence : "";
  const expPickupAddress = typeof params.expPickupAddress === "string" ? params.expPickupAddress : "";
  const expeditionClient = useMemo(
    () => parseExpeditionClient(typeof params.expeditionClient === "string" ? params.expeditionClient : undefined),
    [params.expeditionClient]
  );
  const scheduledDeliveryDate = useMemo(() => {
    const raw = typeof params.scheduledDeliveryDate === "string" ? params.scheduledDeliveryDate.trim() : "";
    if (raw.length && isScheduledDeliveryDateValid(raw)) return raw;
    return todayIsoInSchedulingTimezone();
  }, [params.scheduledDeliveryDate]);
  const scheduledDeliveryDisplay = useMemo(
    () => formatScheduledDeliveryDisplayLabel(scheduledDeliveryDate),
    [scheduledDeliveryDate],
  );

  const paymentLine = useMemo(() => {
    if (collectCash === "no") return "Pas d'argent à récupérer";
    return `${formatFcfa(amount)} FCFA à récupérer`;
  }, [amount, collectCash]);

  const phoneDisplay = useMemo(() => {
    const digits = phone.replace(/[^\d]/g, "");
    if (!digits.length) return "—";

    let local9 = digits;
    if (digits.length === 10 && digits.startsWith("0")) local9 = digits.slice(1);
    if (digits.length === 12 && digits.startsWith("237")) local9 = digits.slice(3);
    if (digits.length > 9) local9 = digits.slice(-9);

    if (local9.length === 9) {
      return `${local9.slice(0, 3)} ${local9.slice(3, 5)} ${local9.slice(5, 7)} ${local9.slice(7, 9)}`;
    }

    return phone.trim().length ? phone.trim() : digits;
  }, [phone]);

  // Expédition : départ au format backend "Agence | adresse client" (destination = copie du départ).
  const expeditionDepartureStreet = useMemo(
    () => buildExpeditionDepartureStreet(expAgence, expPickupAddress) || ramassageAddress.trim(),
    [expAgence, expPickupAddress, ramassageAddress],
  );

  const pickupAddressV2 = useMemo(() => {
    if (forExpedition) return expeditionDepartureStreet || "—";
    const q = pickupPickupQuartier.trim();
    const l = pickupPickupLandmark.trim();
    return [q, l].filter(Boolean).join(" — ") || ramassageAddress || "—";
  }, [forExpedition, expeditionDepartureStreet, pickupPickupQuartier, pickupPickupLandmark, ramassageAddress]);

  const dropoffAddressV2 = useMemo(() => {
    const q = pickupDropoffQuartier.trim();
    const l = pickupDropoffLandmark.trim();
    const v2 = [q, l].filter(Boolean).join(" — ");
    return v2 || deliveryAddress || quartierLivraison || "—";
  }, [pickupDropoffQuartier, pickupDropoffLandmark, deliveryAddress, quartierLivraison]);

  const destinationQuartier = useMemo(
    () => (pickupDropoffQuartier.trim() || dropoffAddressV2.trim()),
    [pickupDropoffQuartier, dropoffAddressV2],
  );
  // Pas de tarif auto sur une expédition : les frais (transport + main) sont saisis par l'agent.
  const { estimate: deliveryFeeEstimate, loading: deliveryFeeLoading } = useDeliveryFeeEstimate(
    forExpedition ? "" : destinationQuartier,
    express,
  );

  function goEdit(editSection: string) {
    router.push({
      pathname: forExpedition ? "/ma-demande-expedition" : "/ma-demande-livraison",
      params: {
        mode: "pickup",
        editSection,
        ...(forExpedition
          ? {
              quartier: typeof params.quartier === "string" ? params.quartier : "",
              expeditionClient: typeof params.expeditionClient === "string" ? params.expeditionClient : "",
              expAgence,
              expPickupAddress,
              pickupPhone: phone,
              pickupExpress: express,
              pickupCollectCash: collectCash,
              pickupAmount: typeof params.pickupAmount === "string" ? params.pickupAmount : "",
              pickupName: itemName,
              pickupQty: typeof params.pickupQty === "string" ? params.pickupQty : "",
              pickupPickupQuartier,
              pickupPickupLandmark,
              pickupDropoffQuartier,
              pickupDropoffLandmark,
              service: typeof params.service === "string" ? params.service : "",
              scheduledDeliveryDate,
            }
          : {
              pickupPhone: phone,
              pickupExpress: express,
              pickupCollectCash: collectCash,
              pickupAmount: typeof params.pickupAmount === "string" ? params.pickupAmount : "",
              pickupName: itemName,
              pickupQty: typeof params.pickupQty === "string" ? params.pickupQty : "",
              pickupPickupQuartier,
              pickupPickupLandmark,
              pickupDropoffQuartier,
              pickupDropoffLandmark,
              scheduledDeliveryDate,
            }),
      },
    });
  }

  // No useCallback: the React Compiler memoizes this; manual deps with member
  // expressions (deliveryFeeEstimate.total, expeditionClient?.clientName) block compilation.
  const handleConfirm = async () => {
    await hapticSuccess();
    const pickupStreet = pickupAddressV2.trim();
    const dropoffStreet = dropoffAddressV2.trim();
    const descriptionToSend = pickupStreet ? `Ramassage: ${pickupStreet}` : "Aucune description donnée";
    const amountDueNumber = collectCash === "yes" ? Math.max(0, Math.round(amount)) : 0;
    const amountDueFallback =
      deliveryFeeEstimate.available && deliveryFeeEstimate.total != null
        ? Math.max(0, Math.round(deliveryFeeEstimate.total))
        : 0;
    const amountDueToSend = amountDueNumber > 0 ? amountDueNumber : amountDueFallback;

    try {
      const created = await createTransaction(
        buildPayloadFromPickupResume({
          forExpedition,
          packageName: itemName.trim().length ? itemName.trim() : "Colis",
          description: descriptionToSend,
          phone: phone.trim(),
          receiverName: expeditionClient?.clientName,
          express: forExpedition ? "no" : express,
          collectCash: forExpedition ? "no" : collectCash,
          amount: forExpedition ? 0 : amountDueToSend,
          quantity: qty > 0 ? qty : 1,
          pickupStreet: pickupStreet || "—",
          pickupLandmark: forExpedition ? undefined : pickupPickupLandmark.trim() || undefined,
          dropoffStreet: dropoffStreet || "—",
          dropoffLandmark: forExpedition ? undefined : pickupDropoffLandmark.trim() || undefined,
          city: forExpedition ? quartierLivraison.trim() || undefined : undefined,
          scheduledDeliveryDate,
        }),
      );
      const createdId = created?.id ?? created?.data?.id ?? created?.transactionReference;
      router.push({
        pathname: "/confirmee",
        params: {
          id: createdId ? String(createdId) : "",
          scheduledDeliveryDate,
          ...(forExpedition ? { flow: "expedition" } : {}),
        },
      });
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        String(e?.message ?? e ?? (forExpedition ? "Impossible de créer l'expédition." : "Impossible de créer la livraison.")),
      );
    }
  };

  return (
    <ScreenLayout
      headerCompact
      header={
        <CenteredScreenHeader
          title={forExpedition ? "Résumé expédition (ramassage)" : "Résumé produit ramassé"}
          showBack
          compact
        />
      }
    >
      <AppText
        variant="dense"
        style={{
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
        Vérifiez les informations avant de confirmer
      </AppText>

      <View style={{ gap: 18, marginTop: 16 }}>
        <View>
          <SectionRow label="DATE DE LIVRAISON" />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <SolarIcon name="solar:calendar-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
                  {scheduledDeliveryDisplay}
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {forExpedition && expeditionClient ? (
          <View>
            <SectionRow label="CLIENT EXPÉDITION" />
            <Card>
              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                {expeditionClient.clientName}
              </AppText>
              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyRegular, color: colors.muted, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
                {expeditionClient.address}
              </AppText>
              {expeditionClient.phone ? (
                <AppText variant="dense" style={{ marginTop: 8, fontSize: 13, lineHeight: 18, fontFamily: fonts.bodyMedium, color: colors.text }} numberOfLines={1}>
                  {expeditionClient.phone}
                </AppText>
              ) : null}
            </Card>
          </View>
        ) : null}

        <View>
          <SectionRow label={forExpedition ? "CONTACT RAMASSAGE" : "DESTINATAIRE"} onEdit={() => goEdit("recipient")} />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <SolarIcon name="solar:phone-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                  {phoneDisplay}
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {!forExpedition ? (
          <View>
            <SectionRow label="ADRESSE DE LIVRAISON" onEdit={() => goEdit("deliveryAddress")} />
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                  <SolarIcon name="solar:map-point-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                    {dropoffAddressV2}
                  </AppText>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        {!forExpedition ? (
          <View>
            <SectionRow label="TYPE DE LIVRAISON" onEdit={() => goEdit("deliveryType")} />
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                  {express === "yes" ? (
                    <SolarIcon name="solar:lightning-bold-duotone" size={24} color={colors.primary} />
                  ) : (
                    <SolarIcon name="solar:clock-circle-outline" size={24} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
                    {express === "yes" ? "Express" : "Normal"}
                  </AppText>
                  <AppText variant="dense" style={{ marginTop: 4, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }} numberOfLines={1}>
                    {express === "yes" ? "Livraison estimée sous 45 min" : "Livraison estimée sous 2h"}
                  </AppText>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionRow label="MODE DE RÉCUPÉRATION" onEdit={() => goEdit("mode")} />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "rgba(14,165,233,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(14,165,233,0.20)",
                }}
              >
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.6 }} numberOfLines={1}>
                  RAMASSAGE
                </AppText>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                  Collecte à une adresse
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        <View>
          <SectionRow label={forExpedition ? "POINT DE DÉPART" : "ADRESSE DE RAMASSAGE"} onEdit={() => goEdit("pickupAddress")} />
          <Card>
            <Line label={forExpedition ? "Agence de voyage | adresse" : "Adresse / quartier exact"} value={pickupAddressV2} />
            {forExpedition && quartierLivraison.trim().length ? (
              <Line label="Ville" value={quartierLivraison.trim()} />
            ) : null}
          </Card>
        </View>

        <View>
          <SectionRow label="ARTICLE" onEdit={() => goEdit("items")} />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <SolarIcon name="solar:bag-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                  {itemName || "—"}
                </AppText>
                <AppText variant="dense" style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }} numberOfLines={1}>
                  {qty > 0 ? `Quantité: x${qty}` : "Quantité: —"}
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {!forExpedition ? (
          <View>
            <SectionRow label="PAIEMENT" onEdit={() => goEdit("payment")} />
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                  <SolarIcon name="solar:wallet-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2}>
                    {paymentLine}
                  </AppText>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionRow label={forExpedition ? "FRAIS D'EXPÉDITION" : "TOTAL"} />
          <Card>
            {forExpedition ? (
              <ExpeditionFeesPendingCard />
            ) : (
              <DeliveryFeeTotalCard estimate={deliveryFeeEstimate} loading={deliveryFeeLoading} />
            )}
          </Card>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <FormButton label="Confirmer la commande" onPress={handleConfirm} />
      </View>
    </ScreenLayout>
  );
}
