import { useCallback, useMemo, useState } from "react";
import { useLoadEffect } from "@/lib/hooks/useLoadEffect";
import { Alert, Platform, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenLayout from "@/components/ScreenLayout";
import AppText from "@/components/AppText";
import AppTextInput from "@/components/AppTextInput";
import SolarIcon from "@/components/SolarIcon";
import {
  cancelTransaction,
  canClientCancelTransaction,
  CLIENT_CANCEL_BLOCKED_MESSAGE,
  getTransactionById,
} from "@/lib/api/transactions";
import { hapticSuccess } from "@/lib/haptics";
import { colors, fonts, radii, shadows, spacing, typography } from "@/theme/tokens";

type ReasonId = "unreachable" | "damaged" | "changed_mind" | "other";

const REASONS: { id: ReasonId; label: string }[] = [
  { id: "unreachable", label: "Client injoignable" },
  { id: "damaged", label: "Colis endommagé ou manquant" },
  { id: "changed_mind", label: "Changement d'avis du client" },
  { id: "other", label: "Autre motif" },
];

function ReasonRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 64,
        borderRadius: 24,
        backgroundColor: colors.white,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...shadows.card,
        borderWidth: selected ? 2 : undefined,
        borderColor: selected ? colors.primary : undefined,
      }}
      hitSlop={8}
    >
      <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <AppText style={{ fontSize: 15, lineHeight: 22, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
          {label}
        </AppText>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: "rgba(126, 162, 124, 0.55)",
          backgroundColor: colors.white,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "rgba(126, 162, 124, 0.9)",
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function AnnulationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [reason, setReason] = useState<ReasonId>("unreachable");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [cancelAllowed, setCancelAllowed] = useState(false);

  const checkCancelEligibility = useCallback(async () => {
    const deliveryId = typeof id === "string" ? id.trim() : "";
    if (!deliveryId) {
      Alert.alert("Erreur", "Identifiant de livraison manquant.", [{ text: "OK", onPress: () => router.back() }]);
      setCheckingStatus(false);
      return;
    }

    try {
      const tx = await getTransactionById(deliveryId);
      const allowed = canClientCancelTransaction(tx.status);
      setCancelAllowed(allowed);
      if (!allowed) {
        Alert.alert("Annulation impossible", CLIENT_CANCEL_BLOCKED_MESSAGE, [{ text: "OK", onPress: () => router.back() }]);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible de charger cette livraison.";
      Alert.alert("Erreur", message, [{ text: "OK", onPress: () => router.back() }]);
    } finally {
      setCheckingStatus(false);
    }
  }, [id]);

  useLoadEffect(checkCancelEligibility);

  const canConfirm = useMemo(
    () => cancelAllowed && Boolean(reason) && !submitting && !checkingStatus,
    [cancelAllowed, reason, submitting, checkingStatus],
  );
  const reasonLabel = useMemo(() => REASONS.find((r) => r.id === reason)?.label ?? reason, [reason]);

  return (
    <ScreenLayout
      header={
        <View style={{ paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}>
            <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: "center" }} hitSlop={10}>
              <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ fontSize: 16, lineHeight: 24, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                Annulation de commande
              </AppText>
            </View>
          </View>
        </View>
      }
      footer={
        <View
          style={{
            borderTopWidth: 0,
            paddingHorizontal: spacing.screenPaddingX,
            paddingTop: 14,
            paddingBottom: 24,
            backgroundColor: "rgba(248,249,250,0.92)",
          }}
        >
          <Pressable
            disabled={!canConfirm}
            onPress={() => {
              void (async () => {
                const deliveryId = typeof id === "string" ? id.trim() : "";
                if (!deliveryId) {
                  Alert.alert("Erreur", "Identifiant de livraison manquant.");
                  return;
                }
                if (!cancelAllowed) {
                  Alert.alert("Annulation impossible", CLIENT_CANCEL_BLOCKED_MESSAGE);
                  return;
                }
                setSubmitting(true);
                try {
                  await hapticSuccess();
                  await cancelTransaction(deliveryId, {
                    reason: reasonLabel,
                    details: details.trim() || undefined,
                  });
                  router.replace({
                    pathname: "/annulation-confirmee",
                    params: { id: deliveryId },
                  });
                } catch (e: unknown) {
                  const message =
                    e instanceof Error ? e.message : "Impossible d'annuler cette livraison.";
                  Alert.alert("Erreur", message);
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
            style={{
              minHeight: 64,
              borderRadius: radii.pill,
              backgroundColor: "#EF4444",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 8,
              opacity: canConfirm ? 1 : 0.6,
            }}
          >
            <AppText style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={1}>
              {submitting ? "Annulation…" : "Confirmer l'annulation"}
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View style={{ marginTop: 14 }}>
        <AppText style={{ ...typography.screenTitle, fontSize: 34, lineHeight: 44 }} numberOfLines={2} ellipsizeMode="tail">
          Dites-nous pourquoi
        </AppText>
        <AppText style={{ ...typography.subtitle, marginTop: 8 }} numberOfLines={2} ellipsizeMode="tail">
          Vous souhaitez annuler cette livraison.
        </AppText>
      </View>

      <View style={{ marginTop: 18, gap: 14 }}>
        {REASONS.map((r) => (
          <ReasonRow key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>

      <View style={{ marginTop: 22 }}>
        <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: "rgba(60,74,60,0.7)" }} numberOfLines={2}>
          Détails supplémentaires (facultatif)
        </AppText>

        <View
          style={{
            marginTop: 10,
            minHeight: 140,
            borderRadius: 24,
            backgroundColor: "#F3F4F5",
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <AppTextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Précisez la situation ici..."
            placeholderTextColor={"rgba(60,74,60,0.45)"}
            multiline
            style={{ ...typography.bodyRegular, fontSize: 14, lineHeight: 20, color: colors.text, minHeight: 110 }}
          />
        </View>
      </View>

      <View
        style={{
          marginTop: 18,
          borderRadius: 18,
          backgroundColor: "rgba(239,68,68,0.07)",
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.18)",
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <SolarIcon name="solar:danger-circle-bold" size={22} color={"#EF4444"} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            variant="dense"
            style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodySemi, color: "#B91C1C" }}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            L&apos;annulation entraînera la clôture définitive de cette mission.
          </AppText>
          {typeof id === "string" && id.trim().length ? (
            <AppText variant="dense" style={{ marginTop: 6, fontSize: 11, lineHeight: 15, fontFamily: fonts.bodyMedium, color: "rgba(185,28,28,0.75)" }} numberOfLines={1}>
              Livraison #{id}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={{ height: 18 }} />
    </ScreenLayout>
  );
}

