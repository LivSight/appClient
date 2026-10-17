import { isScheduledDeliveryDateValid } from "@/lib/scheduling/deliveryDate";
import type { DemandeFormState } from "@/lib/transactions/demandeFormState";
import { toMaDemandeFormValidationInput } from "@/lib/transactions/demandeFormState";

export type TransactionKind = "livraison" | "expedition";

export type StockCartItem = { id: string; name: string; qty: number };

export type InventoryStockItem = { id: string; name: string; stockAvailable: number };

export type MaDemandeFormValidationInput = {
  isExpedition: boolean;
  mode: "stock" | "pickup";
  scheduledDeliveryDate: string;
  expCart: StockCartItem[];
  livCart: StockCartItem[];
  inventory: InventoryStockItem[];
  expVille: string;
  expAgence: string;
  expPickupAddress: string;
  expNomDestinataire: string;
  expTelephoneDestinataire: string;
  livPhone: string;
  livQuartierQuery: string;
  livCollectCash: "yes" | "no";
  livAmountDue: number;
  pickupName: string;
  pickupQty: string;
  pickupPhone: string;
  pickupPickupQuartierQuery: string;
  pickupPickupLandmark: string;
  pickupDropoffQuartierQuery: string;
  pickupDropoffLandmark: string;
  pickupCollectCash: "yes" | "no";
  pickupAmount: string;
};

export type StockResumeValidationInput = {
  forExpedition: boolean;
  items: { name: string; qty: number }[];
  phone: string;
  destinationQuartier: string;
  scheduledDeliveryDate: string;
  deliveryFeeLoading: boolean;
  deliveryFeeAvailable: boolean;
};

export type PickupResumeValidationInput = {
  forExpedition: boolean;
  itemName: string;
  phone: string;
  pickupStreet: string;
  dropoffStreet: string;
  scheduledDeliveryDate: string;
  deliveryFeeLoading: boolean;
  deliveryFeeAvailable: boolean;
};

function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "");
  const n = cleaned.length ? Number(cleaned) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function getStockCartValidationError(
  cart: StockCartItem[],
  inventory: InventoryStockItem[],
): string | null {
  if (!cart.length) return "Ajoutez au moins un produit de votre stock.";

  for (const item of cart) {
    const inv = inventory.find((entry) => entry.id === item.id);
    if (!inv) {
      return `Le produit « ${item.name} » n'est plus disponible dans votre stock.`;
    }
    if (item.qty <= 0) {
      return `Indiquez une quantité valide pour « ${item.name} ».`;
    }
    if (item.qty > inv.stockAvailable) {
      return `Stock insuffisant pour « ${item.name} » (disponible : ${inv.stockAvailable}).`;
    }
  }

  return null;
}

function scheduledDateError(): string {
  return "Choisissez une date de livraison à partir d'aujourd'hui.";
}

export function getDemandeStep1Error(state: DemandeFormState): string | null {
  if (!isScheduledDeliveryDateValid(state.scheduledDeliveryDate)) {
    return scheduledDateError();
  }
  return null;
}

export function getDemandeStep2Error(
  state: DemandeFormState,
  inventory: InventoryStockItem[],
): string | null {
  const isExpedition = state.flow === "expedition";

  if (isExpedition) {
    if (!state.expVille.trim()) return "Indiquez la ville de destination.";
    if (!state.expAgence.trim()) return "Sélectionnez l'agence de départ.";
    if (state.mode === "pickup" && !state.expPickupAddress.trim()) {
      return "Indiquez l'adresse de ramassage du colis.";
    }
    if (state.mode === "stock") {
      return getStockCartValidationError(state.expCart, inventory);
    }
    return null;
  }

  if (state.mode === "stock") {
    return getStockCartValidationError(state.livCart, inventory);
  }

  if (!state.pickupName.trim()) return "Décrivez le colis à ramasser.";
  if (parseAmount(state.pickupQty) <= 0) return "Indiquez le nombre de colis à ramasser.";
  return null;
}

export function getDemandeStep3Error(
  state: DemandeFormState,
  inventory: InventoryStockItem[],
): string | null {
  const full = getMaDemandeFormValidationError(toMaDemandeFormValidationInput(state, inventory));
  if (!full) return null;

  const step1 = getDemandeStep1Error(state);
  if (step1) return step1;
  const step2 = getDemandeStep2Error(state, inventory);
  if (step2) return step2;

  return full;
}

export function getMaDemandeFormValidationError(input: MaDemandeFormValidationInput): string | null {
  if (!isScheduledDeliveryDateValid(input.scheduledDeliveryDate)) {
    return scheduledDateError();
  }

  if (input.isExpedition) {
    if (input.mode === "stock") {
      const cartError = getStockCartValidationError(input.expCart, input.inventory);
      if (cartError) return cartError;
    }
    if (!input.expVille.trim()) return "Indiquez la ville de destination.";
    if (!input.expAgence.trim()) return "Sélectionnez l'agence de départ.";
    if (input.mode === "pickup" && !input.expPickupAddress.trim()) {
      return "Indiquez l'adresse de ramassage du colis.";
    }
    if (!input.expNomDestinataire.trim()) return "Indiquez le nom du destinataire.";
    if (!input.expTelephoneDestinataire.trim()) {
      return "Indiquez le numéro de téléphone du destinataire.";
    }
    return null;
  }

  if (input.mode === "stock") {
    const cartError = getStockCartValidationError(input.livCart, input.inventory);
    if (cartError) return cartError;
    if (!input.livPhone.trim()) return "Indiquez le numéro de téléphone du destinataire.";
    if (!input.livQuartierQuery.trim()) return "Indiquez le quartier ou la zone de livraison.";
    if (input.livCollectCash === "yes" && (!Number.isFinite(input.livAmountDue) || input.livAmountDue <= 0)) {
      return "Indiquez le montant à encaisser à la livraison.";
    }
    return null;
  }

  if (!input.pickupName.trim()) return "Décrivez le colis à ramasser.";
  if (parseAmount(input.pickupQty) <= 0) return "Indiquez le nombre de colis à ramasser.";
  if (!input.pickupPhone.trim()) return "Indiquez le numéro de téléphone du destinataire.";
  if (!input.pickupPickupQuartierQuery.trim()) {
    return "Indiquez le quartier ou la zone de ramassage.";
  }
  if (!input.pickupPickupLandmark.trim()) return "Indiquez un point de repère pour le ramassage.";
  if (!input.pickupDropoffQuartierQuery.trim()) {
    return "Indiquez le quartier ou la zone de livraison.";
  }
  if (!input.pickupDropoffLandmark.trim()) return "Indiquez un point de repère pour la livraison.";
  if (input.pickupCollectCash === "yes" && parseAmount(input.pickupAmount) <= 0) {
    return "Indiquez le montant à encaisser à la livraison.";
  }
  return null;
}

export function getStockResumeValidationError(input: StockResumeValidationInput): string | null {
  if (!isScheduledDeliveryDateValid(input.scheduledDeliveryDate)) {
    return "La date de livraison sélectionnée n'est plus valide. Choisissez une date à partir d'aujourd'hui.";
  }
  if (!input.items.length) {
    return input.forExpedition
      ? "Ajoutez au moins un produit avant de confirmer l'expédition."
      : "Ajoutez au moins un produit avant de confirmer la livraison.";
  }
  if (!input.phone.trim()) return "Indiquez le numéro de téléphone du destinataire.";
  if (!input.destinationQuartier.trim() || input.destinationQuartier === "—") {
    return "Indiquez le quartier ou la zone de livraison.";
  }
  if (!input.forExpedition && !input.deliveryFeeLoading && !input.deliveryFeeAvailable) {
    return "Impossible d'estimer les frais de livraison pour cette zone. Vérifiez l'adresse ou contactez le support.";
  }
  return null;
}

export function getPickupResumeValidationError(input: PickupResumeValidationInput): string | null {
  if (!isScheduledDeliveryDateValid(input.scheduledDeliveryDate)) {
    return "La date de livraison sélectionnée n'est plus valide. Choisissez une date à partir d'aujourd'hui.";
  }
  if (!input.phone.trim()) return "Indiquez le numéro de téléphone du destinataire.";
  if (!input.pickupStreet.trim() || input.pickupStreet === "—") {
    return "Indiquez l'adresse de ramassage du colis.";
  }
  if (!input.dropoffStreet.trim() || input.dropoffStreet === "—") {
    return "Indiquez l'adresse de livraison du destinataire.";
  }
  if (!input.forExpedition && !input.deliveryFeeLoading && !input.deliveryFeeAvailable) {
    return "Impossible d'estimer les frais de livraison pour cette zone. Vérifiez l'adresse ou contactez le support.";
  }
  return null;
}

const NETWORK_ERROR_PATTERNS = [/network request failed/i, /failed to fetch/i, /network error/i];

export function formatCreateTransactionError(error: unknown, kind: TransactionKind): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw.trim();

  if (!message) {
    return "Connexion impossible. Vérifiez votre réseau et réessayez.";
  }
  if (/session expirée/i.test(message)) {
    return "Votre session a expiré. Reconnectez-vous pour continuer.";
  }
  if (/user not found/i.test(message)) {
    return "Compte introuvable. Déconnectez-vous puis reconnectez-vous.";
  }
  if (/stock|quantit|insufficient/i.test(message)) {
    return "Stock insuffisant pour un ou plusieurs produits. Vérifiez les quantités.";
  }
  if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return "Connexion impossible. Vérifiez votre réseau et réessayez.";
  }
  if (/^HTTP 5\d{2}$/.test(message)) {
    return "Le serveur est indisponible. Réessayez dans quelques instants.";
  }
  if (/^HTTP 4\d{2}$/.test(message)) {
    return kind === "expedition"
      ? "Impossible de créer l'expédition. Vérifiez vos informations."
      : "Impossible de créer la livraison. Vérifiez vos informations.";
  }
  if (message.length > 200 || /exception|stack trace/i.test(message)) {
    return kind === "expedition"
      ? "Impossible de créer l'expédition. Réessayez ou contactez le support."
      : "Impossible de créer la livraison. Réessayez ou contactez le support.";
  }

  return message;
}
