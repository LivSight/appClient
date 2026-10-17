import { Alert, View, Pressable, ActivityIndicator, Linking } from "react-native";
import { useCallback, useState } from "react";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import ScreenLayout from "../components/ScreenLayout";
import SolarIcon from "../components/SolarIcon";
import { card } from "../theme/styles";
import { colors, fonts, radii, typography } from "../theme/tokens";
import { hapticLight } from "@/lib/haptics";
import AppText from "../components/AppText";
import type { User } from "@/lib/api/users";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { displayEmail, displayFullName, displayInitials, displayPhone } from "@/lib/userDisplay";
import { logger } from "@/lib/logger";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";

const SUPPORT_EMAIL = "livsight@gmail.com";
const APP_VERSION = Constants.expoConfig?.version;

function SettingRow({
  iconName,
  iconColor,
  title,
  titleColor,
  onPress,
  showChevron = true,
  testID,
}: {
  iconName: string;
  iconColor: string;
  title: string;
  titleColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={async () => {
        await hapticLight();
        onPress?.();
      }}
      disabled={!onPress}
      style={{
        minHeight: 80,
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
        <SolarIcon name={iconName} size={26} color={iconColor} />
      </View>

      <View style={{ flex: 1, minWidth: 0, marginLeft: 16 }}>
        <AppText
          style={{
            fontSize: 15,
            fontFamily: fonts.bodyBold,
            color: titleColor ?? colors.text,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </AppText>
      </View>

      {showChevron ? <SolarIcon name="solar:alt-arrow-right-outline" size={24} color={"rgba(25,28,29,0.25)"} /> : null}
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "rgba(25,28,29,0.06)" }} />;
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadUser = useCallback(async (mode: "initial" | "refresh" = "initial") => {
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
      logger.warn("profile", "loadUser failed", e);
      setUser(null);
      setError("Vérifiez votre connexion internet et réessayez.");
    } finally {
      if (mode === "initial") setLoading(false);
    }
  }, []);

  const { refreshing, onRefresh } = usePullToRefresh(() => loadUser("refresh"));

  useFocusEffect(
    useCallback(() => {
      void loadUser();
    }, [loadUser]),
  );

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch (e: unknown) {
      logger.warn("profile", "logout failed", e);
      Alert.alert("Déconnexion impossible", "Une erreur est survenue. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => void onLogout() },
    ]);
  }

  async function openDeletionRequest() {
    const account = String(user?.email ?? "").trim();
    const subject = encodeURIComponent("Demande de suppression de compte");
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite supprimer définitivement mon compte LivSight${account ? ` (${account})` : ""}.\n\nMerci.`,
    );
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
    } catch (e: unknown) {
      logger.warn("profile", "mailto failed", e);
      Alert.alert("Contact", `Envoyez votre demande de suppression à ${SUPPORT_EMAIL}.`);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Supprimer le compte",
      "Cette action est irréversible. Envoyez-nous votre demande de suppression et nous la traiterons dans les plus brefs délais.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Demander la suppression", style: "destructive", onPress: () => void openDeletionRequest() },
      ],
    );
  }

  const fullName = displayFullName(user);
  const emailLabel = displayEmail(user);
  const phoneLabel = displayPhone(user);
  const initials = displayInitials(user);

  return (
    <ScreenLayout
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <View style={{ minHeight: 44, paddingVertical: 8, flexDirection: "row", alignItems: "center" }}>
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
          <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
            <AppText variant="dense" style={{ ...typography.bodyRegular, fontFamily: fonts.bodyBold, color: "#0F172A" }} numberOfLines={1}>
              Profil
            </AppText>
          </View>
          <View style={{ width: 44 }} />
        </View>
      }
    >
      {loading && !refreshing ? (
        <View style={{ alignItems: "center", paddingVertical: 48 }}>
          <ActivityIndicator color={colors.primary} />
          <AppText style={{ ...typography.subtitle, marginTop: 12 }} numberOfLines={1}>
            Chargement…
          </AppText>
        </View>
      ) : error ? (
        <View style={[card.base, { padding: 20, marginTop: 8 }]}>
          <AppText style={{ ...typography.cardTitle, fontSize: 16, lineHeight: 24 }} numberOfLines={2}>
            Impossible de charger votre profil
          </AppText>
          <AppText style={{ ...typography.subtitle, marginTop: 6 }} numberOfLines={3} ellipsizeMode="tail">
            {error}
          </AppText>
          <Pressable
            onPress={() => {
              void loadUser();
            }}
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
      ) : (
        <>
          <View style={{ alignItems: "center", marginTop: 8, marginBottom: 22 }}>
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 40,
                backgroundColor: "rgba(48,144,192,0.12)",
                borderWidth: 4,
                borderColor: colors.white,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText style={{ fontSize: 36, lineHeight: 44, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                {initials}
              </AppText>
            </View>

            <AppText style={{ marginTop: 12, fontSize: 24, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
              {fullName}
            </AppText>
            <AppText variant="dense" style={{ marginTop: 6, fontSize: 15, fontFamily: fonts.bodySemi, color: colors.muted, opacity: 0.85 }} numberOfLines={1} ellipsizeMode="tail">
              {emailLabel}
            </AppText>
            <AppText variant="dense" style={{ marginTop: 4, fontSize: 16, fontFamily: fonts.bodySemi, color: colors.muted, opacity: 0.7 }} numberOfLines={1} ellipsizeMode="tail">
              {phoneLabel}
            </AppText>
          </View>

          <View style={{ gap: 24 }}>
            <View style={[card.base, { paddingVertical: 0, paddingHorizontal: 0 }]}>
              <SettingRow
                iconName="solar:user-outline"
                iconColor={colors.primary}
                title="Mes informations"
                onPress={() => router.push("/mes-informations")}
              />
              <Divider />
              <SettingRow
                iconName="solar:tag-outline"
                iconColor={colors.primary}
                title="Consulter les tarifs"
                onPress={() => router.push("/tarifs")}
              />
            </View>

            <View style={[card.base, { paddingVertical: 0, paddingHorizontal: 0 }]}>
              <SettingRow
                iconName="solar:logout-2-outline"
                iconColor={"#BA1A1A"}
                title={loggingOut ? "Déconnexion…" : "Déconnexion"}
                titleColor={"#BA1A1A"}
                onPress={loggingOut ? undefined : confirmLogout}
                showChevron
                testID="profile-logout"
              />
            </View>

            <View style={[card.base, { paddingVertical: 0, paddingHorizontal: 0 }]}>
              <SettingRow
                iconName="solar:trash-bin-trash-outline"
                iconColor={"#BA1A1A"}
                title="Supprimer le compte"
                titleColor={"#BA1A1A"}
                onPress={confirmDeleteAccount}
                showChevron={false}
                testID="profile-delete-account"
              />
            </View>
          </View>
        </>
      )}

      <View style={{ marginTop: 22, paddingVertical: 10 }}>
        <AppText
          variant="dense"
          style={{
            textAlign: "center",
            fontSize: 11,
            fontFamily: fonts.bodyBold,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: colors.muted,
            opacity: 0.4,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {`LivSight${APP_VERSION ? ` v${APP_VERSION}` : ""} • © ${new Date().getFullYear()} LivSight`}
        </AppText>
      </View>
    </ScreenLayout>
  );
}
