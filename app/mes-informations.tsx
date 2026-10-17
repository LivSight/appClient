import { useCallback, useMemo, useState } from "react";
import { useLoadEffect } from "@/lib/hooks/useLoadEffect";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import AppText from "@/components/AppText";
import FormInput from "@/components/FormInput";
import PillButton from "@/components/PillButton";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { card } from "@/theme/styles";
import { colors, fonts, radii, spacing, typography } from "@/theme/tokens";
import type { User } from "@/lib/api/users";
import { updateCurrentUser } from "@/lib/api/users";
import { getCurrentUser, resetCurrentUserIdCache } from "@/lib/auth/currentUser";
import { displayFullName, displayInitials } from "@/lib/userDisplay";
import { formatDbText } from "@/lib/formatDisplayText";
import { logger } from "@/lib/logger";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dateOfBird: string;
  city: string;
  region: string;
  street: string;
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  dateOfBird: "",
  city: "",
  region: "",
  street: "",
};

function formFromUser(user: User | null): FormState {
  return {
    first_name: String(user?.first_name ?? "").trim(),
    last_name: String(user?.last_name ?? "").trim(),
    email: String(user?.email ?? "").trim(),
    phone: String(user?.phone ?? "").trim(),
    dateOfBird: String(user?.dateOfBird ?? "").trim().slice(0, 10),
    city: String(user?.city ?? "").trim(),
    region: String(user?.region ?? "").trim(),
    street: String(user?.street ?? "").trim(),
  };
}

function formatInfoValue(label: string, value?: string | null): string {
  const v = String(value ?? "").trim();
  if (!v) return "—";
  if (label === "Email" || label === "Téléphone" || label === "Date de naissance") return v;
  return formatDbText(v);
}

function InfoRow({ label, value, iconName }: { label: string; value?: string | null; iconName?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 }}>
      {iconName ? (
        <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          <SolarIcon name={iconName} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="dense" style={{ fontSize: 11, lineHeight: 16, fontFamily: fonts.bodyBold, color: "rgba(60,74,60,0.6)", letterSpacing: 1.1 }} numberOfLines={1}>
          {label.toUpperCase()}
        </AppText>
        <AppText style={{ fontSize: 16, lineHeight: 22, fontFamily: fonts.bodySemi, color: colors.text, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
          {formatInfoValue(label, value)}
        </AppText>
      </View>
    </View>
  );
}

function SectionHeading({ iconName, title }: { iconName: string; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(48,144,192,0.10)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SolarIcon name={iconName} size={20} color={colors.primary} />
      </View>
      <AppText style={{ ...typography.sectionTitle, fontSize: 18, lineHeight: 26 }} numberOfLines={1}>
        {title}
      </AppText>
    </View>
  );
}

function formatDateFr(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function MesInformationsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const fullName = useMemo(() => displayFullName(user), [user]);
  const initials = useMemo(() => displayInitials(user), [user]);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      setError(null);
      const data = await getCurrentUser();
      if (!data) {
        setUser(null);
        setError("Vos informations sont introuvables. Veuillez vous reconnecter.");
        return;
      }
      setUser(data);
    } catch (e: unknown) {
      logger.warn("mesInformations", "load failed", e);
      setUser(null);
      setError("Vérifiez votre connexion internet et réessayez.");
    } finally {
      if (mode === "initial") setLoading(false);
    }
  }, []);

  const { refreshing, onRefresh } = usePullToRefresh(() => load("refresh"));

  useLoadEffect(load);

  function setField(key: keyof FormState) {
    return (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEditing() {
    setForm(formFromUser(user));
    setEditing(true);
  }

  async function onSave() {
    if (saving) return;

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dateOfBird: form.dateOfBird.trim(),
      city: form.city.trim(),
      region: form.region.trim(),
      street: form.street.trim(),
    };

    if (!payload.first_name || !payload.last_name) {
      Alert.alert("Champs requis", "Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      Alert.alert("Email invalide", "Veuillez saisir une adresse email valide.");
      return;
    }
    if (payload.dateOfBird && !/^\d{4}-\d{2}-\d{2}$/.test(payload.dateOfBird)) {
      Alert.alert("Date invalide", "La date de naissance doit être au format AAAA-MM-JJ.");
      return;
    }

    setSaving(true);
    try {
      await updateCurrentUser(payload);
      resetCurrentUserIdCache();
      await load();
      setEditing(false);
    } catch (e: unknown) {
      logger.warn("mesInformations", "update failed", e);
      Alert.alert(
        "Enregistrement impossible",
        "Vos informations n'ont pas pu être enregistrées. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenLayout
      refreshing={refreshing}
      onRefresh={onRefresh}
      scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
      header={
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44, paddingVertical: 8, marginBottom: 12 }}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
            hitSlop={10}
            style={{ width: 44, height: 44, justifyContent: "center" }}
          >
            <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <AppText style={{ ...typography.sectionTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={1}>
              Mes informations
            </AppText>
          </View>
          {!editing && !loading && !error && user ? (
            <Pressable
              testID="mes-informations-edit"
              onPress={startEditing}
              hitSlop={10}
              style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}
            >
              <SolarIcon name="solar:pen-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 44, height: 44 }} />
          )}
        </View>
      }
    >
      {loading && !refreshing ? (
        <View style={[card.base, { padding: 20 }]}>
          <AppText style={{ ...typography.cardTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={2}>
            Chargement…
          </AppText>
        </View>
      ) : error ? (
        <View style={[card.base, { padding: 20 }]}>
          <AppText style={{ ...typography.cardTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={2}>
            Impossible de charger vos informations
          </AppText>
          <AppText style={{ ...typography.subtitle, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
            {error}
          </AppText>
          <Pressable
            onPress={load}
            hitSlop={10}
            style={{
              marginTop: 14,
              minHeight: 44,
              borderRadius: radii.pill,
              paddingHorizontal: 16,
              alignSelf: "flex-start",
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
            }}
          >
            <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.white }} numberOfLines={1}>
              Réessayer
            </AppText>
          </Pressable>
        </View>
      ) : editing ? (
        <View style={{ gap: 16 }}>
          <View style={[card.base, { padding: 20 }]}>
            <SectionHeading iconName="solar:user-id-bold-duotone" title="Identité" />
            <View style={{ marginTop: 16, gap: 14 }}>
              <FormInput label="Prénom" value={form.first_name} onChangeText={setField("first_name")} autoCapitalize="words" testID="input-first-name" />
              <FormInput label="Nom" value={form.last_name} onChangeText={setField("last_name")} autoCapitalize="words" testID="input-last-name" />
              <FormInput
                label="Email"
                value={form.email}
                onChangeText={setField("email")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-email"
              />
              <FormInput label="Téléphone" value={form.phone} onChangeText={setField("phone")} keyboardType="phone-pad" testID="input-phone" />
              <FormInput
                label="Date de naissance"
                value={form.dateOfBird}
                onChangeText={setField("dateOfBird")}
                placeholder="AAAA-MM-JJ"
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-date-of-birth"
              />
            </View>
          </View>

          <View style={[card.base, { padding: 20 }]}>
            <SectionHeading iconName="solar:map-point-bold-duotone" title="Adresse" />
            <View style={{ marginTop: 16, gap: 14 }}>
              <FormInput label="Ville" value={form.city} onChangeText={setField("city")} autoCapitalize="words" testID="input-city" />
              <FormInput label="Région" value={form.region} onChangeText={setField("region")} autoCapitalize="words" testID="input-region" />
              <FormInput label="Rue" value={form.street} onChangeText={setField("street")} autoCapitalize="words" testID="input-street" />
            </View>
          </View>

          <PillButton
            label={saving ? "Enregistrement…" : "Enregistrer"}
            onPress={saving ? undefined : () => void onSave()}
            style={{ alignSelf: "center" }}
          />
          <Pressable
            testID="mes-informations-cancel"
            onPress={saving ? undefined : () => setEditing(false)}
            style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <AppText style={{ fontSize: 15, lineHeight: 22, fontFamily: fonts.bodySemi, color: colors.muted }} numberOfLines={1}>
              Annuler
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={[card.base, { padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }]}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(48,144,192,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText style={{ fontSize: 22, lineHeight: 28, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                {initials}
              </AppText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={{ fontSize: 18, lineHeight: 24, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                {fullName}
              </AppText>
              <AppText style={{ ...typography.subtitle, marginTop: 4 }} numberOfLines={2} ellipsizeMode="tail">
                {String(user?.email ?? "").trim() || "—"}
              </AppText>
            </View>
          </View>

          <View style={[card.base, { padding: 20 }]}>
            <SectionHeading iconName="solar:user-id-bold-duotone" title="Identité" />
            <View style={{ marginTop: 10 }}>
              <InfoRow iconName="solar:user-outline" label="Nom" value={fullName} />
              <InfoRow iconName="solar:letter-outline" label="Email" value={String(user?.email ?? "")} />
              <InfoRow iconName="solar:phone-outline" label="Téléphone" value={String(user?.phone ?? "")} />
              <InfoRow iconName="solar:calendar-outline" label="Date de naissance" value={formatDateFr(String(user?.dateOfBird ?? ""))} />
            </View>
          </View>

          <View style={[card.base, { padding: 20 }]}>
            <SectionHeading iconName="solar:map-point-bold-duotone" title="Adresse" />
            <View style={{ marginTop: 10 }}>
              <InfoRow iconName="solar:map-point-outline" label="Ville" value={String(user?.city ?? "")} />
              <InfoRow iconName="solar:map-point-outline" label="Région" value={String(user?.region ?? "")} />
              <InfoRow iconName="solar:map-point-outline" label="Rue" value={String(user?.street ?? "")} />
            </View>
          </View>
        </View>
      )}

      <View style={{ height: spacing.sectionGap }} />
    </ScreenLayout>
  );
}
