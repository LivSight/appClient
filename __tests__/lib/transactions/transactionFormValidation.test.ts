import {
  formatCreateTransactionError,
  getMaDemandeFormValidationError,
  getPickupResumeValidationError,
  getStockResumeValidationError,
} from "@/lib/transactions/transactionFormValidation";
import { todayIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";

const todayIso = todayIsoInSchedulingTimezone();

const inventory = [
  { id: "p1", name: "Riz", stockAvailable: 5 },
  { id: "p2", name: "Huile", stockAvailable: 2 },
];

describe("getMaDemandeFormValidationError", () => {
  const base = {
    isExpedition: false,
    mode: "stock" as const,
    scheduledDeliveryDate: todayIso,
    expCart: [],
    livCart: [],
    inventory,
    expVille: "",
    expAgence: "",
    expPickupAddress: "",
    expNomDestinataire: "",
    expTelephoneDestinataire: "",
    livPhone: "",
    livQuartierQuery: "",
    livCollectCash: "no" as const,
    livAmountDue: NaN,
    pickupName: "",
    pickupQty: "",
    pickupPhone: "",
    pickupPickupQuartierQuery: "",
    pickupPickupLandmark: "",
    pickupDropoffQuartierQuery: "",
    pickupDropoffLandmark: "",
    pickupCollectCash: "no" as const,
    pickupAmount: "",
  };

  it("requires products for livraison stock", () => {
    expect(
      getMaDemandeFormValidationError({
        ...base,
        livPhone: "670000000",
        livQuartierQuery: "Bastos",
      }),
    ).toBe("Ajoutez au moins un produit de votre stock.");
  });

  it("requires phone and quartier for livraison stock", () => {
    expect(
      getMaDemandeFormValidationError({
        ...base,
        livCart: [{ id: "p1", name: "Riz", qty: 1 }],
        livQuartierQuery: "Bastos",
      }),
    ).toBe("Indiquez le numéro de téléphone du destinataire.");

    expect(
      getMaDemandeFormValidationError({
        ...base,
        livCart: [{ id: "p1", name: "Riz", qty: 1 }],
        livPhone: "670000000",
      }),
    ).toBe("Indiquez le quartier ou la zone de livraison.");
  });

  it("requires cash amount when collect cash is enabled", () => {
    expect(
      getMaDemandeFormValidationError({
        ...base,
        livCart: [{ id: "p1", name: "Riz", qty: 1 }],
        livPhone: "670000000",
        livQuartierQuery: "Bastos",
        livCollectCash: "yes",
        livAmountDue: 0,
      }),
    ).toBe("Indiquez le montant à encaisser à la livraison.");
  });

  it("validates expedition stock fields", () => {
    expect(
      getMaDemandeFormValidationError({
        ...base,
        isExpedition: true,
        expVille: "Douala",
        expAgence: "Agence centrale",
        expNomDestinataire: "Jean",
        expTelephoneDestinataire: "690000000",
      }),
    ).toBe("Ajoutez au moins un produit de votre stock.");
  });

  it("validates expedition pickup address", () => {
    expect(
      getMaDemandeFormValidationError({
        ...base,
        isExpedition: true,
        mode: "pickup",
        expCart: [{ id: "p1", name: "Riz", qty: 1 }],
        expVille: "Douala",
        expAgence: "Agence centrale",
        expNomDestinataire: "Jean",
        expTelephoneDestinataire: "690000000",
      }),
    ).toBe("Indiquez l'adresse de ramassage du colis.");
  });

  it("returns null when livraison stock form is complete", () => {
    expect(
      getMaDemandeFormValidationError({
        ...base,
        livCart: [{ id: "p1", name: "Riz", qty: 1 }],
        livPhone: "670000000",
        livQuartierQuery: "Bastos",
      }),
    ).toBeNull();
  });
});

describe("getStockResumeValidationError", () => {
  it("blocks confirm when delivery fee is unavailable", () => {
    expect(
      getStockResumeValidationError({
        forExpedition: false,
        items: [{ name: "Riz", qty: 1 }],
        phone: "670000000",
        destinationQuartier: "Bastos",
        scheduledDeliveryDate: todayIso,
        deliveryFeeLoading: false,
        deliveryFeeAvailable: false,
      }),
    ).toBe(
      "Impossible d'estimer les frais de livraison pour cette zone. Vérifiez l'adresse ou contactez le support.",
    );
  });

  it("skips fee check for expedition", () => {
    expect(
      getStockResumeValidationError({
        forExpedition: true,
        items: [{ name: "Riz", qty: 1 }],
        phone: "670000000",
        destinationQuartier: "Douala",
        scheduledDeliveryDate: todayIso,
        deliveryFeeLoading: false,
        deliveryFeeAvailable: false,
      }),
    ).toBeNull();
  });
});

describe("getPickupResumeValidationError", () => {
  it("requires pickup and dropoff addresses", () => {
    expect(
      getPickupResumeValidationError({
        forExpedition: false,
        itemName: "Colis",
        phone: "670000000",
        pickupStreet: "",
        dropoffStreet: "Bastos",
        scheduledDeliveryDate: todayIso,
        deliveryFeeLoading: false,
        deliveryFeeAvailable: true,
      }),
    ).toBe("Indiquez l'adresse de ramassage du colis.");
  });
});

describe("formatCreateTransactionError", () => {
  it("maps session and network errors", () => {
    expect(formatCreateTransactionError(new Error("Session expirée"), "livraison")).toBe(
      "Votre session a expiré. Reconnectez-vous pour continuer.",
    );
    expect(formatCreateTransactionError(new Error("Network request failed"), "livraison")).toBe(
      "Connexion impossible. Vérifiez votre réseau et réessayez.",
    );
  });

  it("maps stock errors", () => {
    expect(formatCreateTransactionError(new Error("Insufficient stock for Riz"), "livraison")).toBe(
      "Stock insuffisant pour un ou plusieurs produits. Vérifiez les quantités.",
    );
  });

  it("keeps readable API messages", () => {
    expect(formatCreateTransactionError(new Error("Le quartier est inconnu"), "livraison")).toBe(
      "Le quartier est inconnu",
    );
  });
});
