import {
  applyLegacyStockItem,
  buildResumeNavigationParams,
  createInitialDemandeFormState,
  resolveInitialWizardStep,
  shouldOpenProductPickerOnMount,
} from "@/lib/transactions/demandeFormState";
import { todayIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";

const todayIso = todayIsoInSchedulingTimezone();

describe("demandeFormState", () => {
  it("creates livraison stock defaults", () => {
    const state = createInitialDemandeFormState("livraison");
    expect(state.flow).toBe("livraison");
    expect(state.mode).toBe("stock");
    expect(state.scheduledDeliveryDate).toBe(todayIso);
    expect(state.livCart).toEqual([]);
  });

  it("restores pickup mode from params", () => {
    const state = createInitialDemandeFormState("livraison", { mode: "pickup" });
    expect(state.mode).toBe("pickup");
  });

  it("builds resume navigation for livraison stock", () => {
    const state = createInitialDemandeFormState("livraison", {
      deliveryQuartier: "Bastos",
    });
    state.livCart = [{ id: "p1", name: "Riz", qty: 2 }];
    state.livPhone = "670000000";

    const nav = buildResumeNavigationParams(state);
    expect(nav.pathname).toBe("/resume-produit-en-stock");
    expect(nav.params.deliveryQuartier).toBe("Bastos");
    expect(nav.params.phone).toBe("670000000");
    expect(JSON.parse(nav.params.selectedItems)).toEqual([{ id: "p1", name: "Riz", qty: 2 }]);
  });

  it("builds resume navigation for expedition stock", () => {
    const state = createInitialDemandeFormState("expedition", {
      quartier: "Douala",
      expeditionClient: JSON.stringify({ clientName: "Jean", phone: "690000000", address: "", notes: "" }),
    });
    state.expAgence = "Agence centrale";
    state.expCart = [{ id: "p1", name: "Riz", qty: 1 }];

    const nav = buildResumeNavigationParams(state);
    expect(nav.pathname).toBe("/resume-produit-en-stock");
    expect(nav.params.service).toBe("expedition");
    expect(nav.params.quartier).toBe("Douala");
  });

  it("applies legacy stock item for livraison", () => {
    const state = createInitialDemandeFormState("livraison");
    const next = applyLegacyStockItem(state, [{ id: "p1", name: "Riz", stockAvailable: 5 }], "p1", "3");
    expect(next.livCart).toEqual([{ id: "p1", name: "Riz", qty: 3 }]);
  });

  it("maps editSection to wizard step", () => {
    expect(resolveInitialWizardStep("items")).toBe(2);
    expect(resolveInitialWizardStep("phone")).toBe(3);
    expect(resolveInitialWizardStep()).toBe(1);
    expect(shouldOpenProductPickerOnMount("items")).toBe(true);
  });
});
