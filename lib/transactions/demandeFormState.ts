import { STOCK_DEPARTURE_STREET } from "@/lib/api/companySettings";
import {
  buildExpeditionDepartureStreet,
  parseExpeditionClient,
  SERVICE_EXPEDITION,
  stringifyExpeditionClient,
} from "@/lib/expeditionClient";
import { isScheduledDeliveryDateValid, todayIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";
import { parseStockCartItems, stringifyStockCartItems } from "@/lib/transactions/stockCartHelpers";
import type { StockCartItem } from "@/lib/transactions/transactionFormValidation";

export type DemandeFlow = "livraison" | "expedition";
export type DemandeMode = "stock" | "pickup";
export type DemandeWizardStep = 1 | 2 | 3;

export type DemandeFormParams = {
  quartier?: string;
  mode?: DemandeMode;
  expeditionClient?: string;
  editSection?: string;
  phone?: string;
  expAgence?: string;
  expPickupAddress?: string;
  selectedItems?: string;
  livSelectedItems?: string;
  livPhone?: string;
  livNotes?: string;
  livExpress?: "yes" | "no";
  livCollectCash?: "yes" | "no";
  livAmountDueText?: string;
  deliveryQuartier?: string;
  deliveryLandmark?: string;
  stockItemId?: string;
  stockQty?: string;
  pickupPhone?: string;
  pickupExpress?: "yes" | "no";
  pickupCollectCash?: "yes" | "no";
  pickupAmount?: string;
  pickupName?: string;
  pickupQty?: string;
  pickupPickupQuartier?: string;
  pickupPickupLandmark?: string;
  pickupDropoffQuartier?: string;
  pickupDropoffLandmark?: string;
  scheduledDeliveryDate?: string;
};

export type DemandeFormState = {
  flow: DemandeFlow;
  mode: DemandeMode;
  quartier: string;
  scheduledDeliveryDate: string;
  expVille: string;
  expAgence: string;
  expPickupAddress: string;
  expNomDestinataire: string;
  expTelephoneDestinataire: string;
  agencyDepartureStreet: string;
  expCart: StockCartItem[];
  livCart: StockCartItem[];
  livPhone: string;
  livQuartierQuery: string;
  livDeliveryLandmark: string;
  livNotes: string;
  livExpress: "yes" | "no";
  livCollectCash: "yes" | "no";
  livAmountDueText: string;
  pickupName: string;
  pickupQty: string;
  pickupExpress: "yes" | "no";
  pickupCollectCash: "yes" | "no";
  pickupAmount: string;
  pickupPhone: string;
  pickupPickupQuartierQuery: string;
  pickupPickupLandmark: string;
  pickupDropoffQuartierQuery: string;
  pickupDropoffLandmark: string;
};

function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "");
  const n = cleaned.length ? Number(cleaned) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function createInitialDemandeFormState(flow: DemandeFlow, params: DemandeFormParams = {}): DemandeFormState {
  const isExpedition = flow === "expedition";
  const expeditionClient = parseExpeditionClient(
    typeof params.expeditionClient === "string" ? params.expeditionClient : undefined,
  );
  const scheduledRaw = typeof params.scheduledDeliveryDate === "string" ? params.scheduledDeliveryDate.trim() : "";
  const initialCart = parseStockCartItems(
    typeof params.selectedItems === "string" && params.selectedItems.length
      ? params.selectedItems
      : typeof params.livSelectedItems === "string"
        ? params.livSelectedItems
        : undefined,
  );

  return {
    flow,
    mode: params.mode === "pickup" ? "pickup" : "stock",
    quartier: typeof params.quartier === "string" ? params.quartier : "",
    scheduledDeliveryDate:
      scheduledRaw.length && isScheduledDeliveryDateValid(scheduledRaw) ? scheduledRaw : todayIsoInSchedulingTimezone(),
    expVille: typeof params.quartier === "string" ? params.quartier.trim() : "",
    expAgence: typeof params.expAgence === "string" ? params.expAgence : "",
    expPickupAddress: typeof params.expPickupAddress === "string" ? params.expPickupAddress : "",
    expNomDestinataire: expeditionClient?.clientName ?? "",
    expTelephoneDestinataire:
      (typeof params.phone === "string" && params.phone.trim().length ? params.phone.trim() : "") ||
      (expeditionClient?.phone ?? ""),
    agencyDepartureStreet: STOCK_DEPARTURE_STREET,
    expCart: isExpedition ? initialCart : [],
    livCart: !isExpedition ? initialCart : [],
    livPhone: typeof params.livPhone === "string" ? params.livPhone : "",
    livQuartierQuery: typeof params.deliveryQuartier === "string" ? params.deliveryQuartier : "",
    livDeliveryLandmark: typeof params.deliveryLandmark === "string" ? params.deliveryLandmark : "",
    livNotes: typeof params.livNotes === "string" ? params.livNotes : "",
    livExpress: params.livExpress === "yes" ? "yes" : "no",
    livCollectCash: params.livCollectCash === "yes" ? "yes" : "no",
    livAmountDueText: typeof params.livAmountDueText === "string" ? params.livAmountDueText : "",
    pickupName: typeof params.pickupName === "string" ? params.pickupName : "",
    pickupQty: typeof params.pickupQty === "string" && params.pickupQty.length ? params.pickupQty : "1",
    pickupExpress: params.pickupExpress === "yes" ? "yes" : "no",
    pickupCollectCash: params.pickupCollectCash === "yes" ? "yes" : "no",
    pickupAmount: typeof params.pickupAmount === "string" ? params.pickupAmount : "",
    pickupPhone: typeof params.pickupPhone === "string" ? params.pickupPhone : "",
    pickupPickupQuartierQuery: typeof params.pickupPickupQuartier === "string" ? params.pickupPickupQuartier : "",
    pickupPickupLandmark: typeof params.pickupPickupLandmark === "string" ? params.pickupPickupLandmark : "",
    pickupDropoffQuartierQuery: typeof params.pickupDropoffQuartier === "string" ? params.pickupDropoffQuartier : "",
    pickupDropoffLandmark: typeof params.pickupDropoffLandmark === "string" ? params.pickupDropoffLandmark : "",
  };
}

export function resolveInitialWizardStep(editSection?: string): DemandeWizardStep {
  const key = editSection?.trim() ?? "";
  if (key === "items") return 2;
  if (
    key === "destination" ||
    key === "phone" ||
    key === "address" ||
    key === "recipient" ||
    key === "payment" ||
    key === "notes" ||
    key === "deliveryType" ||
    key === "deliveryAddress" ||
    key === "pickupAddress"
  ) {
    return 3;
  }
  return 1;
}

export function shouldOpenProductPickerOnMount(editSection?: string): boolean {
  return editSection?.trim() === "items";
}

export type ResumeNavigation = {
  pathname: "/resume-produit-en-stock" | "/resume-produit-ramasse";
  params: Record<string, string>;
};

export function buildResumeNavigationParams(state: DemandeFormState): ResumeNavigation {
  const isExpedition = state.flow === "expedition";
  const livNeedsCashAmount = state.livCollectCash === "yes";

  if (state.mode === "stock" && isExpedition) {
    const departureStreet = buildExpeditionDepartureStreet(state.expAgence, state.agencyDepartureStreet);
    const expeditionClient = stringifyExpeditionClient({
      clientName: state.expNomDestinataire.trim(),
      phone: state.expTelephoneDestinataire.trim(),
      address: [state.expVille.trim(), departureStreet].filter(Boolean).join(" — ") || state.quartier.trim(),
      notes: "",
    });
    return {
      pathname: "/resume-produit-en-stock",
      params: {
        quartier: state.expVille.trim(),
        expAgence: state.expAgence.trim(),
        expPickupAddress: state.agencyDepartureStreet.trim(),
        selectedItems: stringifyStockCartItems(state.expCart),
        phone: state.expTelephoneDestinataire.trim(),
        notes: "",
        express: "no",
        collectCash: "no",
        amountDueText: "",
        service: SERVICE_EXPEDITION,
        expeditionClient,
        scheduledDeliveryDate: state.scheduledDeliveryDate,
      },
    };
  }

  if (state.mode === "pickup" && isExpedition) {
    const departureStreet = buildExpeditionDepartureStreet(state.expAgence, state.expPickupAddress);
    return {
      pathname: "/resume-produit-ramasse",
      params: {
        quartier: state.expVille.trim(),
        expAgence: state.expAgence.trim(),
        expPickupAddress: state.expPickupAddress.trim(),
        pickupName: state.expNomDestinataire.trim(),
        pickupAddress: departureStreet,
        pickupQty: "1",
        pickupExpress: "no",
        pickupCollectCash: "no",
        pickupAmount: "",
        pickupPhone: state.expTelephoneDestinataire.trim(),
        scheduledDeliveryDate: state.scheduledDeliveryDate,
        service: SERVICE_EXPEDITION,
        expeditionClient: stringifyExpeditionClient({
          clientName: state.expNomDestinataire.trim(),
          phone: state.expTelephoneDestinataire.trim(),
          address: [state.expVille.trim(), departureStreet].filter(Boolean).join(" — "),
          notes: "",
        }),
      },
    };
  }

  if (state.mode === "stock" && !isExpedition) {
    const deliveryQuartier = state.livQuartierQuery.trim();
    const deliveryLandmark = state.livDeliveryLandmark.trim();
    const deliveryAddress = [deliveryQuartier, deliveryLandmark].filter(Boolean).join(" — ");
    return {
      pathname: "/resume-produit-en-stock",
      params: {
        quartier: state.quartier,
        deliveryAddress,
        deliveryQuartier,
        deliveryLandmark,
        selectedItems: stringifyStockCartItems(state.livCart),
        phone: state.livPhone.trim(),
        notes: state.livNotes.trim(),
        express: state.livExpress,
        collectCash: state.livCollectCash,
        amountDueText: livNeedsCashAmount ? state.livAmountDueText : "",
        scheduledDeliveryDate: state.scheduledDeliveryDate,
      },
    };
  }

  const pickupQuartier = state.pickupPickupQuartierQuery.trim();
  const pickupLandmark = state.pickupPickupLandmark.trim();
  const pickupAddress = [pickupQuartier, pickupLandmark].filter(Boolean).join(" — ");
  const dropoffQuartier = state.pickupDropoffQuartierQuery.trim();
  const dropoffLandmark = state.pickupDropoffLandmark.trim();
  const deliveryAddress = [dropoffQuartier, dropoffLandmark].filter(Boolean).join(" — ");

  return {
    pathname: "/resume-produit-ramasse",
    params: {
      quartier: state.quartier,
      deliveryAddress,
      pickupAddress,
      pickupName: state.pickupName,
      pickupQty: state.pickupQty,
      pickupExpress: state.pickupExpress,
      pickupCollectCash: state.pickupCollectCash,
      pickupAmount: state.pickupAmount,
      pickupPhone: state.pickupPhone,
      pickupPickupQuartier: pickupQuartier,
      pickupPickupLandmark: pickupLandmark,
      pickupDropoffQuartier: dropoffQuartier,
      pickupDropoffLandmark: dropoffLandmark,
      scheduledDeliveryDate: state.scheduledDeliveryDate,
    },
  };
}

export function applyLegacyStockItem(
  state: DemandeFormState,
  inventory: { id: string; name: string; stockAvailable: number }[],
  stockItemId?: string,
  stockQty?: string,
): DemandeFormState {
  if (state.flow !== "livraison" || state.livCart.length) return state;
  const legacyId = stockItemId?.trim() ?? "";
  const legacyItem = legacyId ? inventory.find((it) => it.id === legacyId) : undefined;
  if (!legacyItem) return state;
  const legacyQty = Math.max(1, Math.floor(parseAmount(typeof stockQty === "string" ? stockQty : "1") || 1));
  return {
    ...state,
    livCart: [
      {
        id: legacyItem.id,
        name: legacyItem.name,
        qty: Math.min(legacyQty, Math.max(1, legacyItem.stockAvailable)),
      },
    ],
  };
}

export function toMaDemandeFormValidationInput(
  state: DemandeFormState,
  inventory: { id: string; name: string; stockAvailable: number }[],
) {
  const cleaned = state.livAmountDueText.replace(/[^\d.,]/g, "").replace(",", ".");
  const livAmountDue = cleaned.length ? Number(cleaned) : NaN;
  return {
    isExpedition: state.flow === "expedition",
    mode: state.mode,
    scheduledDeliveryDate: state.scheduledDeliveryDate,
    expCart: state.expCart,
    livCart: state.livCart,
    inventory,
    expVille: state.expVille,
    expAgence: state.expAgence,
    expPickupAddress: state.expPickupAddress,
    expNomDestinataire: state.expNomDestinataire,
    expTelephoneDestinataire: state.expTelephoneDestinataire,
    livPhone: state.livPhone,
    livQuartierQuery: state.livQuartierQuery,
    livCollectCash: state.livCollectCash,
    livAmountDue,
    pickupName: state.pickupName,
    pickupQty: state.pickupQty,
    pickupPhone: state.pickupPhone,
    pickupPickupQuartierQuery: state.pickupPickupQuartierQuery,
    pickupPickupLandmark: state.pickupPickupLandmark,
    pickupDropoffQuartierQuery: state.pickupDropoffQuartierQuery,
    pickupDropoffLandmark: state.pickupDropoffLandmark,
    pickupCollectCash: state.pickupCollectCash,
    pickupAmount: state.pickupAmount,
  };
}
