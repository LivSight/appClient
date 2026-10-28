import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { track } from "@/lib/analytics/events";
import { errorLabel } from "@/lib/analytics/mappers";
import ScreenLayout from "../components/ScreenLayout";
import SolarIcon from "../components/SolarIcon";
import CenteredScreenHeader from "../components/CenteredScreenHeader";
import LottieView from "lottie-react-native";
import { colors, fonts, radii, typography } from "../theme/tokens";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import { createPackage } from "@/lib/api/packages";

function Label({ children }: { children: string }) {
  return (
    <AppText
      variant="dense"
      style={{
        fontSize: 11,
        fontFamily: fonts.bodyBold,
        letterSpacing: 1.1,
        textTransform: "uppercase",
        color: "rgba(60,74,60,0.8)",
        marginBottom: 10,
      }}
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      {children}
    </AppText>
  );
}

function QtyCounter({
  value,
  onDec,
  onInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View
      style={{
        minHeight: 56,
        borderRadius: radii.pill,
        backgroundColor: "#F3F4F5",
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
      }}
    >
      <Pressable
        onPress={async () => {
          await hapticLight();
          onDec();
        }}
        hitSlop={10}
        style={{
          width: 40,
          height: 40,
          borderRadius: 16,
          backgroundColor: "#E1E3E4",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SolarIcon name="solar:minus-square-outline" size={24} color={colors.primary} />
      </Pressable>

      <AppText style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
        {value}
      </AppText>

      <Pressable
        onPress={async () => {
          await hapticLight();
          onInc();
        }}
        hitSlop={10}
        style={{
          width: 40,
          height: 40,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SolarIcon name="solar:add-square-bold" size={24} color={colors.white} />
      </Pressable>
    </View>
  );
}

export default function AjouterAuStockScreen() {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await hapticSuccess();
      const description_to_send = description.trim() || "Aucune description";
      await createPackage({
        package_name: name.trim(),
        description: description_to_send,
        quantity: qty,
      });
      track("ajout_stock_soumis", { nb_produits: qty });
      router.replace({
        pathname: "/confirmation-ajout-stock",
        params: {
          addedName: name.trim(),
          addedQty: String(qty),
          addedSubtitle: description_to_send,
        },
      });
    } catch (e) {
      track("ajout_stock_echoue", { erreur: errorLabel(e) });
      setError(e instanceof Error ? e.message : "Erreur lors de l&apos;ajout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenLayout>
      <CenteredScreenHeader
        title="Ajouter un produit"
        subtitle="Complétez les détails pour gérer le stock de cet article"
        showBack
        onBackPress={() => router.back()}
      />

      <View style={{ marginTop: 28 }}>
        <Label>Nom du produit</Label>
        <View
          style={{
            minHeight: 55,
            borderRadius: 24,
            backgroundColor: "#F3F4F5",
            paddingHorizontal: 20,
            justifyContent: "center",
            paddingVertical: 10,
          }}
        >
          <AppTextInput
            value={name}
            onChangeText={setName}
            placeholder="Farine de Blé"
            placeholderTextColor="rgba(60,74,60,0.35)"
            style={[typography.bodyRegular, { color: colors.text }]}
          />
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <Label>Quantité initiale</Label>
        <QtyCounter value={qty} onDec={() => setQty((q) => Math.max(0, q - 1))} onInc={() => setQty((q) => q + 1)} />
      </View>

      <View style={{ marginTop: 28 }}>
        <Label>Description produit</Label>
        <View
          style={{
            minHeight: 104,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "#F3F4F5",
            paddingHorizontal: 20,
            paddingTop: 14,
          }}
        >
          <AppTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Courte description du produit"
            placeholderTextColor="rgba(60,74,60,0.40)"
            multiline
            style={[typography.bodyRegular, { color: colors.text }]}
          />
        </View>
      </View>

      {error ? (
        <AppText style={{ color: "#D32F2F", fontFamily: fonts.bodySemi, marginTop: 16 }}>{error}</AppText>
      ) : null}

      <View style={{ marginTop: 28 }}>
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{
            minHeight: 68,
            borderRadius: 24,
            backgroundColor: canSubmit ? colors.primary : "rgba(14,165,233,0.45)",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            paddingVertical: 14,
          }}
        >
          {submitting ? (
            <View pointerEvents="none" style={{ width: 28, height: 28 }}>
              <LottieView
                source={require("../assets/lottie/loading-dots.json")}
                autoPlay
                loop
                style={{ width: 28, height: 28 }}
              />
            </View>
          ) : (
            <SolarIcon name="solar:add-square-bold" size={24} color={colors.white} />
          )}
          <AppText style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={2} ellipsizeMode="tail">
            Ajouter au stock
          </AppText>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

