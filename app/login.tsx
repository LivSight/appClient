import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, View } from "react-native";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import AppText from "@/components/AppText";
import AppTextInput from "@/components/AppTextInput";
import FormButton from "@/components/FormButton";
import FormInput from "@/components/FormInput";
import ScreenLayout from "@/components/ScreenLayout";
import SolarIcon from "@/components/SolarIcon";
import { AuthError } from "@/lib/auth/authApi";
import { useAuth } from "@/lib/auth/AuthProvider";
import { hapticError, hapticLight, hapticSuccess } from "@/lib/haptics";
import { card } from "@/theme/styles";
import { colors, fonts, radii, typography } from "@/theme/tokens";

export default function LoginScreen() {
  const isStaging = Constants.expoConfig?.name?.includes("Staging") ?? false;
  const { login } = useAuth();
  const passwordRef = useRef<ComponentRef<typeof AppTextInput>>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !isSubmitting,
    [email, password, isSubmitting],
  );

  async function handleSubmit() {
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await hapticLight();
      await login({ username: email.trim(), password });
      await hapticSuccess();
      router.replace("/(tabs)");
    } catch (e: unknown) {
      await hapticError();
      if (e instanceof AuthError && e.status === 401) {
        setError("Identifiants incorrects. Vérifiez votre e-mail et mot de passe.");
      } else if (e instanceof AuthError) {
        setError(e.message);
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenLayout scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}>
      <View style={{ flexGrow: 1, justifyContent: "center", alignSelf: "stretch", gap: 24 }}>
        <View style={{ alignItems: "center", alignSelf: "stretch" }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: colors.cardStroke,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <Image
              testID="login-logo"
              source={require("../assets/images/logo.png")}
              style={{ width: 60, height: 60 }}
              contentFit="contain"
              accessibilityLabel="Livsight"
            />
          </View>
          {isStaging ? (
            <View
              testID="login-staging-badge"
              style={{
                backgroundColor: colors.statusPendingBg,
                borderRadius: radii.pill,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 12,
              }}
            >
              <AppText
                variant="dense"
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontFamily: fonts.bodySemi,
                  color: colors.primary,
                }}
                numberOfLines={1}
              >
                Staging
              </AppText>
            </View>
          ) : null}
          <AppText
            style={{
              ...typography.screenTitle,
              fontSize: 32,
              lineHeight: 44,
              textAlign: "center",
              alignSelf: "stretch",
            }}
            numberOfLines={2}
          >
            Bienvenue
          </AppText>
          <AppText
            style={{ ...typography.subtitle, marginTop: 10, textAlign: "center", alignSelf: "stretch" }}
            numberOfLines={3}
          >
            Connectez-vous pour suivre vos livraisons et expéditions.
          </AppText>
        </View>

        {error ? (
          <View
            testID="login-error"
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: colors.statusCancelledBg,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 14,
              alignSelf: "stretch",
            }}
          >
            <SolarIcon name="solar:danger-circle-bold" size={20} color={colors.statusCancelledFg} />
            <AppText
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                lineHeight: 20,
                fontFamily: fonts.bodyMedium,
                color: colors.statusCancelledFg,
              }}
              numberOfLines={4}
            >
              {error}
            </AppText>
          </View>
        ) : null}

        <View style={[card.base, { gap: 20, alignSelf: "stretch" }]}>
          <FormInput
            testID="login-email"
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            leadingIconName="solar:letter-outline"
          />
          <FormInput
            ref={passwordRef}
            testID="login-password"
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
            leadingIconName="solar:lock-keyhole-minimalistic-outline"
            trailing={
              <Pressable
                testID="login-password-toggle"
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <SolarIcon
                  name={showPassword ? "solar:eye-closed-outline" : "solar:eye-outline"}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            }
          />
        </View>

        <FormButton
          label={isSubmitting ? "Connexion…" : "Se connecter"}
          iconName="solar:alt-arrow-right-outline"
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={{ alignSelf: "stretch" }}
        />

        <AppText
          variant="dense"
          style={{
            textAlign: "center",
            fontSize: 11,
            lineHeight: 16,
            fontFamily: fonts.bodyBold,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: colors.muted,
            opacity: 0.35,
          }}
          numberOfLines={1}
        >
          {`LivSight${Constants.expoConfig?.version ? ` v${Constants.expoConfig.version}` : ""}`}
        </AppText>
      </View>
    </ScreenLayout>
  );
}
