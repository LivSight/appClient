import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenLayout from "../components/ScreenLayout";
import AppText from "../components/AppText";
import FormInput from "../components/FormInput";
import FormButton from "../components/FormButton";
import ExpressToggleCard from "../components/ExpressToggleCard";
import SolarIcon from "../components/SolarIcon";
import { colors, fonts, radii, typography } from "../theme/tokens";
import { hapticSuccess } from "@/lib/haptics";
import { isExpressDeliveryUiEnabled } from "@/lib/config/features";
import { isExpeditionService, parseExpeditionClient, SERVICE_EXPEDITION } from "@/lib/expeditionClient";

type Params = {
  quartier?: string;
  selectedItems?: string; // JSON string
  service?: string;
  expeditionClient?: string;
};

const INPUT_BG = "#F3F4F5";

export default function InfoProduitEnStockScreen() {
  const params = useLocalSearchParams<Params>();
  const quartier = typeof params.quartier === "string" ? params.quartier : "";
  const selectedItems = typeof params.selectedItems === "string" ? params.selectedItems : "[]";
  const forExpedition = isExpeditionService(typeof params.service === "string" ? params.service : undefined);
  const expeditionClient = useMemo(
    () => parseExpeditionClient(typeof params.expeditionClient === "string" ? params.expeditionClient : undefined),
    [params.expeditionClient]
  );

  const [phone, setPhone] = useState(() =>
    parseExpeditionClient(typeof params.expeditionClient === "string" ? params.expeditionClient : undefined)?.phone ?? ""
  );
  const [notes, setNotes] = useState(() =>
    parseExpeditionClient(typeof params.expeditionClient === "string" ? params.expeditionClient : undefined)?.notes ?? ""
  );
  const [express, setExpress] = useState<"yes" | "no">("no");
  const [collectCash, setCollectCash] = useState<"yes" | "no">("no");
  const [amountDueText, setAmountDueText] = useState("");

  const amountDue = useMemo(() => {
    const cleaned = amountDueText.replace(/[^\d.,]/g, "").replace(",", ".");
    const n = cleaned.length ? Number(cleaned) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }, [amountDueText]);

  const needsCashAmount = forExpedition ? false : collectCash === "yes";

  const canContinue = useMemo(() => {
    if (!forExpedition && quartier.trim().length === 0) return false;
    if (phone.trim().length === 0) return false;
    if (!needsCashAmount) return true;
    return Number.isFinite(amountDue) && amountDue > 0;
  }, [forExpedition, quartier, phone, needsCashAmount, amountDue]);

  return (
    <ScreenLayout
      footer={
        <View
          style={{
            backgroundColor: "transparent",
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: 28,
          }}
        >
          <FormButton
            label="Continuer"
            iconName="solar:alt-arrow-right-outline"
            disabled={!canContinue}
            onPress={async () => {
              await hapticSuccess();
              const expeditionParams = forExpedition
                ? {
                    service: SERVICE_EXPEDITION,
                    ...(typeof params.expeditionClient === "string" && params.expeditionClient.length > 0
                      ? { expeditionClient: params.expeditionClient }
                      : {}),
                  }
                : {};

              router.push({
                pathname: "/resume-produit-en-stock",
                params: {
                  quartier,
                  selectedItems,
                  phone,
                  notes,
                  express,
                  collectCash: forExpedition ? "no" : collectCash,
                  amountDueText: forExpedition ? "" : amountDueText,
                  ...expeditionParams,
                },
              });
            }}
          />
          {!canContinue ? (
            <AppText
              variant="dense"
              style={{ marginTop: 8, textAlign: "center", fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.5)" }}
              numberOfLines={2}
            >
              Complétez tous les champs obligatoires pour continuer
            </AppText>
          ) : null}
        </View>
      }
    >
      {/* Top app bar */}
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 41, marginBottom: 18 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
          <AppText variant="dense" style={{ fontSize: 18, lineHeight: 28, fontFamily: fonts.bodySemi, color: "#0F172A" }} numberOfLines={1}>
            {forExpedition ? "Expédition" : "Livraison"}
          </AppText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <AppText style={{ ...typography.screenTitle, fontSize: 30, lineHeight: 40 }} numberOfLines={2}>
        Informations produit en stock
      </AppText>
      <AppText style={{ ...typography.subtitle, lineHeight: 24, marginTop: 10 }}>
        Complétez les informations restantes{"\n"}avant le résumé.
      </AppText>

      {forExpedition && expeditionClient ? (
        <View style={{ marginTop: 18, borderRadius: radii.card, backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 14 }}>
          <AppText variant="dense" style={{ fontSize: 10, lineHeight: 15, fontFamily: fonts.bodyBold, color: "rgba(60,74,60,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }} numberOfLines={1}>
            Destinataire (expédition)
          </AppText>
          <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
            {expeditionClient.clientName}
          </AppText>
          <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyRegular, color: colors.muted, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
            {expeditionClient.address}
          </AppText>
        </View>
      ) : null}

      <View style={{ marginTop: 28, gap: 20 }}>
        {/* Quartier (read-only) */}
        <View>
          <AppText variant="dense" style={{ fontSize: 10, lineHeight: 15, fontFamily: fonts.bodyBold, color: "rgba(60,74,60,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }} numberOfLines={1}>
            QUARTIER
          </AppText>
          <View style={{ minHeight: 56, borderRadius: 24, backgroundColor: INPUT_BG, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "center" }}>
            <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
              {quartier || "—"}
            </AppText>
          </View>
        </View>

        <FormInput
          label="Numéro destinataire"
          value={phone}
          onChangeText={setPhone}
          placeholder="6XXXXXXX"
          keyboardType="phone-pad"
        />

        {isExpressDeliveryUiEnabled() ? (
          <View>
            <AppText variant="dense" style={{ fontSize: 10, lineHeight: 15, fontFamily: fonts.bodyBold, color: "rgba(60,74,60,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }} numberOfLines={1}>
              TYPE DE LIVRAISON
            </AppText>
            <ExpressToggleCard value={express === "yes"} onChange={(next) => setExpress(next ? "yes" : "no")} supplementXaf={1000} />
          </View>
        ) : null}

        <FormInput
          label="Instructions (optionnel)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex: appeler avant d'arriver, laisser au gardien..."
          multiline
        />

        {!forExpedition ? (
          <View>
            <AppText variant="dense" style={{ fontSize: 10, lineHeight: 15, fontFamily: fonts.bodyBold, color: "rgba(60,74,60,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }} numberOfLines={1}>
              Y a-t-il de l&apos;argent à récupérer ?
            </AppText>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setCollectCash("yes")}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: radii.pill,
                  backgroundColor: collectCash === "yes" ? colors.primary : INPUT_BG,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                }}
              >
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: collectCash === "yes" ? colors.white : colors.text }} numberOfLines={1}>
                  Oui
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCollectCash("no");
                  setAmountDueText("");
                }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: radii.pill,
                  backgroundColor: collectCash === "no" ? colors.primary : INPUT_BG,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                }}
              >
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: collectCash === "no" ? colors.white : colors.text }} numberOfLines={1}>
                  Non
                </AppText>
              </Pressable>
            </View>

            {needsCashAmount ? (
              <View style={{ marginTop: 12 }}>
                <FormInput
                  label="Montant à récupérer"
                  value={amountDueText}
                  onChangeText={setAmountDueText}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  trailing={
                    <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                      XAF
                    </AppText>
                  }
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScreenLayout>
  );
}
