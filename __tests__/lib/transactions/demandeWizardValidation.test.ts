import {
  getDemandeStep1Error,
  getDemandeStep2Error,
  getDemandeStep3Error,
} from "@/lib/transactions/transactionFormValidation";
import { createInitialDemandeFormState } from "@/lib/transactions/demandeFormState";
import { todayIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";

const todayIso = todayIsoInSchedulingTimezone();
const inventory = [{ id: "p1", name: "Riz", stockAvailable: 5 }];

describe("demande wizard step validation", () => {
  it("step 1 requires valid date", () => {
    const state = createInitialDemandeFormState("livraison");
    state.scheduledDeliveryDate = "2000-01-01";
    expect(getDemandeStep1Error(state)).toMatch(/date de livraison/i);
    state.scheduledDeliveryDate = todayIso;
    expect(getDemandeStep1Error(state)).toBeNull();
  });

  it("step 2 livraison stock requires products", () => {
    const state = createInitialDemandeFormState("livraison");
    expect(getDemandeStep2Error(state, inventory)).toMatch(/produit/);
    state.livCart = [{ id: "p1", name: "Riz", qty: 1 }];
    expect(getDemandeStep2Error(state, inventory)).toBeNull();
  });

  it("step 2 expedition stock requires ville and agence", () => {
    const state = createInitialDemandeFormState("expedition");
    state.expCart = [{ id: "p1", name: "Riz", qty: 1 }];
    expect(getDemandeStep2Error(state, inventory)).toMatch(/ville/);
    state.expVille = "Douala";
    expect(getDemandeStep2Error(state, inventory)).toMatch(/agence/);
    state.expAgence = "Centrale";
    expect(getDemandeStep2Error(state, inventory)).toBeNull();
  });

  it("step 3 livraison stock requires phone and quartier", () => {
    const state = createInitialDemandeFormState("livraison");
    state.livCart = [{ id: "p1", name: "Riz", qty: 1 }];
    expect(getDemandeStep3Error(state, inventory)).toMatch(/téléphone/);
    state.livPhone = "670000000";
    expect(getDemandeStep3Error(state, inventory)).toMatch(/quartier/);
    state.livQuartierQuery = "Bastos";
    expect(getDemandeStep3Error(state, inventory)).toBeNull();
  });

  it("step 2 livraison pickup requires colis description", () => {
    const state = createInitialDemandeFormState("livraison", { mode: "pickup" });
    expect(getDemandeStep2Error(state, inventory)).toMatch(/colis/);
    state.pickupName = "Documents";
    expect(getDemandeStep2Error(state, inventory)).toBeNull();
  });
});
