import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenLayout from "@/components/ScreenLayout";
import AppText from "@/components/AppText";
import CenteredScreenHeader from "@/components/CenteredScreenHeader";
import FormButton from "@/components/FormButton";
import DemandeStepColis from "@/components/demande/DemandeStepColis";
import DemandeStepDestination from "@/components/demande/DemandeStepDestination";
import DemandeStepIndicator from "@/components/demande/DemandeStepIndicator";
import DemandeStepWhen from "@/components/demande/DemandeStepWhen";
import StockProductPickerModal from "@/components/demande/StockProductPickerModal";
import { toInventory } from "@/lib/demande/inventory";
import {
  getCompanySettings,
  stockDepartureStreetFromCompanySettings,
} from "@/lib/api/companySettings";
import { listPackages } from "@/lib/api/packages";
import { useLoadEffect } from "@/lib/hooks/useLoadEffect";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { useDeliveryFeeSettings } from "@/lib/hooks/useDeliveryFeeSettings";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import {
  applyLegacyStockItem,
  buildResumeNavigationParams,
  createInitialDemandeFormState,
  resolveInitialWizardStep,
  shouldOpenProductPickerOnMount,
  type DemandeFlow,
  type DemandeFormParams,
  type DemandeFormState,
  type DemandeWizardStep,
} from "@/lib/transactions/demandeFormState";
import type { StockInventoryItem } from "@/lib/transactions/stockCartHelpers";
import {
  getDemandeStep1Error,
  getDemandeStep2Error,
  getDemandeStep3Error,
} from "@/lib/transactions/transactionFormValidation";
import { fonts } from "@/theme/tokens";

type Props = {
  flow: DemandeFlow;
};

export default function DemandeWizard({ flow }: Props) {
  const params = useLocalSearchParams<DemandeFormParams>();
  const { expressFee, pickupFee } = useDeliveryFeeSettings();
  const [step, setStep] = useState<DemandeWizardStep>(() => resolveInitialWizardStep(params.editSection));
  const [state, setState] = useState<DemandeFormState>(() => createInitialDemandeFormState(flow, params));
  const [inventory, setInventory] = useState<StockInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(() => shouldOpenProductPickerOnMount(params.editSection));

  const isExpedition = flow === "expedition";
  const screenTitle = isExpedition ? "Ma demande d'expédition" : "Ma demande de livraison";

  const patchState = useCallback((patch: Partial<DemandeFormState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadInventory = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") setInventoryLoading(true);
        setInventoryError(null);
        const items = await listPackages();
        const inv = toInventory(items);
        setInventory(inv);
        if (mode === "initial") {
          setState((prev) =>
            applyLegacyStockItem(prev, inv, params.stockItemId, params.stockQty),
          );
        }
      } catch (e: unknown) {
        setInventoryError(String(e instanceof Error ? e.message : e ?? "Erreur de chargement"));
        setInventory([]);
      } finally {
        if (mode === "initial") setInventoryLoading(false);
      }
    },
    [params.stockItemId, params.stockQty],
  );

  useLoadEffect(loadInventory);

  useEffect(() => {
    if (!isExpedition) return;
    let mounted = true;
    (async () => {
      const settings = await getCompanySettings();
      if (!mounted) return;
      patchState({ agencyDepartureStreet: stockDepartureStreetFromCompanySettings(settings) });
    })();
    return () => {
      mounted = false;
    };
  }, [isExpedition, patchState]);

  const { refreshing, onRefresh } = usePullToRefresh(() => loadInventory("refresh"));

  const stepError = useMemo(() => {
    if (step === 1) return getDemandeStep1Error(state);
    if (step === 2) return getDemandeStep2Error(state, inventory);
    return getDemandeStep3Error(state, inventory);
  }, [step, state, inventory]);

  const footerLabel = step === 3 ? "Continuer" : "Suivant";

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => (s > 1 ? ((s - 1) as DemandeWizardStep) : s));
      return;
    }
    router.back();
  }, [step]);

  const handleNext = useCallback(async () => {
    if (stepError) {
      await hapticError();
      Alert.alert("Informations manquantes", stepError);
      return;
    }

    if (step < 3) {
      await hapticSuccess();
      setStep((s) => (s < 3 ? ((s + 1) as DemandeWizardStep) : s));
      return;
    }

    await hapticSuccess();
    const nav = buildResumeNavigationParams(state);
    router.push({ pathname: nav.pathname, params: nav.params });
  }, [step, stepError, state]);

  const activeCart = isExpedition ? state.expCart : state.livCart;
  const setActiveCart = useCallback(
    (next: typeof activeCart) => {
      if (isExpedition) patchState({ expCart: next });
      else patchState({ livCart: next });
    },
    [isExpedition, patchState],
  );

  return (
    <>
      <ScreenLayout
        scrollable={!productPickerOpen}
        refreshing={refreshing}
        onRefresh={onRefresh}
        headerCompact
        header={<CenteredScreenHeader title={screenTitle} showBack compact onBackPress={handleBack} />}
        footer={
          productPickerOpen ? null : (
            <View
              style={{
                backgroundColor: "transparent",
                paddingHorizontal: 24,
                paddingTop: 14,
                paddingBottom: 28,
              }}
            >
              <FormButton label={footerLabel} onPress={handleNext} />
              {stepError ? (
                <AppText
                  variant="dense"
                  style={{ textAlign: "center", fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.5)" }}
                  numberOfLines={3}
                >
                  {stepError}
                </AppText>
              ) : null}
            </View>
          )
        }
      >
        <DemandeStepIndicator currentStep={step} />
        {step === 1 ? <DemandeStepWhen state={state} onChange={patchState} /> : null}
        {step === 2 ? (
          <DemandeStepColis
            state={state}
            inventory={inventory}
            onChange={patchState}
            onOpenProductPicker={() => setProductPickerOpen(true)}
          />
        ) : null}
        {step === 3 ? (
          <DemandeStepDestination
            state={state}
            expressFee={expressFee}
            pickupFee={pickupFee}
            onChange={patchState}
          />
        ) : null}
      </ScreenLayout>

      <StockProductPickerModal
        visible={productPickerOpen}
        cart={activeCart}
        inventory={inventory}
        inventoryLoading={inventoryLoading}
        inventoryError={inventoryError}
        onClose={() => setProductPickerOpen(false)}
        onChangeCart={setActiveCart}
      />
    </>
  );
}
