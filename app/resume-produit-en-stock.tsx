import { useMemo } from "react";
import { Alert, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenLayout from "../components/ScreenLayout";
import AppText from "../components/AppText";
import FormButton from "../components/FormButton";
import SolarIcon from "../components/SolarIcon";
import CenteredScreenHeader from "../components/CenteredScreenHeader";
import { card } from "../theme/styles";
import { colors, fonts, radii, typography } from "../theme/tokens";
import { hapticSuccess } from "@/lib/haptics";
import { buildExpeditionDepartureStreet, isExpeditionService, parseExpeditionClient } from "@/lib/expeditionClient";
import { createTransaction, buildPayloadFromStockResume, type TransactionLineItem } from "@/lib/api/transactions";
import { STOCK_DEPARTURE_STREET } from "@/lib/api/companySettings";
import DeliveryFeeTotalCard from "../components/DeliveryFeeTotalCard";
import ExpeditionFeesPendingCard from "../components/ExpeditionFeesPendingCard";
import { useDeliveryFeeEstimate } from "@/lib/hooks/useDeliveryFeeEstimate";
import {
  formatScheduledDeliveryDisplayLabel,
  isScheduledDeliveryDateValid,
  todayIsoInSchedulingTimezone,
} from "@/lib/scheduling/deliveryDate";

type SelectedItem = { id: string; name: string; qty: number };

type Params = {
  quartier?: string; // legacy
  deliveryAddress?: string;
  deliveryQuartier?: string;
  deliveryLandmark?: string;
  expAgence?: string;
  expPickupAddress?: string;
  selectedItems?: string; // JSON string of SelectedItem[]
  phone?: string;
  notes?: string;
  express?: "yes" | "no";
  collectCash?: "yes" | "no";
  amountDueText?: string;
  service?: string;
  expeditionClient?: string;
  scheduledDeliveryDate?: string;
};

function SectionRow({
  label,
  onEdit,
}: {
  label: string;
  onEdit?: () => void;
}) {
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
          numberOfLines={1}
          ellipsizeMode="tail"
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

function formatCmPhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits.length) return "—";

  // Accept common Cameroon inputs:
  // - 9 digits: 6XXXXXXXX / 7XXXXXXXX
  // - 10 digits with leading 0: 06XXXXXXXX → keep last 9
  // - E.164 with country code: 2376XXXXXXXX → keep last 9
  let local9 = digits;
  if (digits.length === 10 && digits.startsWith("0")) local9 = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("237")) local9 = digits.slice(3);
  if (digits.length > 9) local9 = digits.slice(-9);

  if (local9.length === 9) {
    return `${local9.slice(0, 3)} ${local9.slice(3, 5)} ${local9.slice(5, 7)} ${local9.slice(7, 9)}`;
  }

  // Fallback: show user input (trimmed) instead of hiding it
  return input.trim().length ? input.trim() : digits;
}

export default function ResumeProduitEnStockScreen() {
  const params = useLocalSearchParams<Params>();
  const quartier = typeof params.quartier === "string" ? params.quartier : "";
  const deliveryAddress = typeof params.deliveryAddress === "string" ? params.deliveryAddress : "";
  const deliveryQuartier = typeof params.deliveryQuartier === "string" ? params.deliveryQuartier : "";
  const deliveryLandmark = typeof params.deliveryLandmark === "string" ? params.deliveryLandmark : "";
  const expAgence = typeof params.expAgence === "string" ? params.expAgence : "";
  const expPickupAddress = typeof params.expPickupAddress === "string" ? params.expPickupAddress : "";
  const selectedItemsRaw = typeof params.selectedItems === "string" ? params.selectedItems : "[]";
  const phone = typeof params.phone === "string" ? params.phone : "";
  const notes = typeof params.notes === "string" ? params.notes : "";
  const express = params.express === "yes" ? "yes" : "no";
  const collectCash = params.collectCash === "yes" ? "yes" : "no";
  const amountDueText = typeof params.amountDueText === "string" ? params.amountDueText : "";
  const forExpedition = isExpeditionService(typeof params.service === "string" ? params.service : undefined);
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

  const amountDue = useMemo(() => {
    const cleaned = amountDueText.replace(/[^\d.,]/g, "").replace(",", ".");
    const n = cleaned.length ? Number(cleaned) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }, [amountDueText]);

  const phoneDisplay = useMemo(() => formatCmPhone(phone), [phone]);

  const items = useMemo<SelectedItem[]>(() => {
    try {
      const parsed = JSON.parse(selectedItemsRaw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((it) => ({
          id: String(it?.id ?? ""),
          name: String(it?.name ?? ""),
          qty: Number.isFinite(Number(it?.qty)) ? Number(it.qty) : 0,
        }))
        .filter((it) => it.id && it.name && it.qty > 0);
    } catch {
      return [];
    }
  }, [selectedItemsRaw]);

  const destinationQuartier = useMemo(
    () => (deliveryQuartier || deliveryAddress || quartier || "").trim(),
    [deliveryQuartier, deliveryAddress, quartier],
  );
  // Pas de tarif auto sur une expédition : les frais (transport + main) sont saisis par l'agent.
  const { estimate: deliveryFeeEstimate, loading: deliveryFeeLoading } = useDeliveryFeeEstimate(
    forExpedition ? "" : destinationQuartier,
    express,
  );

  const expeditionDepartureStreet = useMemo(
    () =>
      buildExpeditionDepartureStreet(expAgence, expPickupAddress) ||
      expeditionClient?.address?.trim() ||
      STOCK_DEPARTURE_STREET,
    [expAgence, expPickupAddress, expeditionClient],
  );

  function goEdit(editSection: string) {
    router.push({
      pathname: forExpedition ? "/ma-demande-expedition" : "/ma-demande-livraison",
      params: {
        mode: "stock",
        editSection,
        ...(forExpedition
          ? {
              quartier: typeof params.quartier === "string" ? params.quartier : "",
              expeditionClient: typeof params.expeditionClient === "string" ? params.expeditionClient : "",
              expAgence,
              expPickupAddress,
              phone,
              express,
              collectCash,
              amountDueText,
              notes,
              deliveryQuartier,
              deliveryLandmark,
              selectedItems: typeof params.selectedItems === "string" ? params.selectedItems : "[]",
              service: typeof params.service === "string" ? params.service : "",
              scheduledDeliveryDate,
            }
          : {
              livPhone: phone,
              livExpress: express,
              livCollectCash: collectCash,
              livAmountDueText: amountDueText,
              livNotes: notes,
              deliveryQuartier,
              deliveryLandmark,
              selectedItems: typeof params.selectedItems === "string" ? params.selectedItems : "[]",
              scheduledDeliveryDate,
            }),
      },
    });
  }

  // No useCallback: the React Compiler memoizes this; manual deps with member
  // expressions (deliveryFeeEstimate.total, expeditionClient?.address) block compilation.
  const handleConfirm = async () => {
    await hapticSuccess();
    const lineItems: TransactionLineItem[] = items.map((it) => ({
      package_name: it.name,
      quantity: it.qty,
    }));
    const itemsLine = lineItems.map((it) => `${it.package_name} x${it.quantity}`).join(", ");
    const quartierLine = (deliveryQuartier || deliveryAddress || quartier || "").trim();
    const amountDueNumber =
      collectCash === "yes" && Number.isFinite(amountDue) ? Math.max(0, Math.round(amountDue)) : 0;
    const amountDueFallback =
      deliveryFeeEstimate.available && deliveryFeeEstimate.total != null
        ? Math.max(0, Math.round(deliveryFeeEstimate.total))
        : 0;
    const amountDueToSend = amountDueNumber > 0 ? amountDueNumber : amountDueFallback;
    const descriptionToSend = notes.trim().length ? notes.trim() : "Aucune description donnée";
    const departureStreet = forExpedition ? expeditionDepartureStreet : STOCK_DEPARTURE_STREET;
    const city = forExpedition ? quartier.trim() || "Yaoundé" : "Yaoundé";

    try {
      const created = await createTransaction(
        buildPayloadFromStockResume({
          forExpedition,
          lineItems,
          itemsLine,
          description: forExpedition ? "Aucune description donnée" : descriptionToSend,
          phone: phone.trim(),
          receiverName: expeditionClient?.clientName,
          express: forExpedition ? "no" : express,
          collectCash: forExpedition ? "no" : collectCash,
          amount: forExpedition ? 0 : amountDueToSend,
          destinationQuartier: quartierLine || "—",
          destinationLandmark: deliveryLandmark.trim(),
          departureCity: city,
          departureStreet,
          destinationCity: city,
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
          title={forExpedition ? "Résumé expédition (stock)" : "Résumé produit en stock"}
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

      <View style={{ marginTop: 16, gap: 18 }}>
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
            </Card>
          </View>
        ) : null}

        <View>
          <SectionRow label={forExpedition ? "CONTACT LIVRAISON" : "DESTINATAIRE"} onEdit={() => goEdit("recipient")} />
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
                  borderRadius: radii.pill,
                  backgroundColor: "rgba(14,165,233,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(14,165,233,0.20)",
                }}
              >
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.6 }} numberOfLines={1}>
                  EN STOCK
                </AppText>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                  {forExpedition
                    ? (expeditionClient?.address?.trim() || "Colis en stock")
                    : "Colis sélectionné dans votre catalogue"}
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        <View>
          <SectionRow label="ARTICLES" onEdit={() => goEdit("items")} />
          <Card>
            {items.length ? (
              <View style={{ gap: 10 }}>
                {items.map((it) => (
                  <View key={it.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                      <SolarIcon name="solar:bag-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                        {it.name}
                      </AppText>
                    </View>
                    <View style={{ flexShrink: 0 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: "rgba(14,165,233,0.18)" }}>
                        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                          x{it.qty}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={2}>
                Aucun article sélectionné.
              </AppText>
            )}
          </Card>
        </View>

        <View>
          <SectionRow label={forExpedition ? "POINT DE DÉPART" : "ADRESSE DE LIVRAISON"} onEdit={() => goEdit(forExpedition ? "pickupAddress" : "address")} />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                <SolarIcon name="solar:map-point-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                  {forExpedition ? expeditionDepartureStreet : deliveryQuartier || deliveryAddress || quartier || "—"}
                </AppText>
                {forExpedition && quartier.trim().length ? (
                  <AppText variant="dense" style={{ marginTop: 4, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }} numberOfLines={1} ellipsizeMode="tail">
                    {`Ville : ${quartier.trim()}`}
                  </AppText>
                ) : null}
                {!forExpedition && deliveryLandmark.trim().length ? (
                  <AppText variant="dense" style={{ marginTop: 4, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }} numberOfLines={2} ellipsizeMode="tail">
                    {deliveryLandmark}
                  </AppText>
                ) : null}
              </View>
            </View>
          </Card>
        </View>

        {notes.trim().length ? (
          <View>
            <SectionRow label="AUTRES DÉTAILS / INSTRUCTIONS" onEdit={() => goEdit("notes")} />
            <Card>
              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.9)" }}>
                {notes}
              </AppText>
            </Card>
          </View>
        ) : null}

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
                    {collectCash === "no"
                      ? "Pas d'argent à récupérer"
                      : Number.isFinite(amountDue) && amountDue > 0
                        ? `${Math.round(amountDue).toLocaleString("fr-FR").replace(/\\s/g, " ")} FCFA à récupérer`
                        : "Montant à récupérer"}
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

