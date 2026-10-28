import { createInitialDemandeFormState, resolveInitialWizardStep } from "@/lib/transactions/demandeFormState";

describe("DemandeWizard editSection routing", () => {
  it("opens step 2 when editing items from resume", () => {
    expect(resolveInitialWizardStep("items")).toBe(2);
    const state = createInitialDemandeFormState("livraison", { editSection: "items" });
    expect(state.mode).toBe("stock");
  });

  it("opens step 3 when editing phone from resume", () => {
    expect(resolveInitialWizardStep("phone")).toBe(3);
  });
});
