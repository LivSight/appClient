import { API_BASE_URL } from "@/lib/config/api";
import { logger } from "@/lib/logger";
import { apiFetch } from "@/lib/api/client";
import { authSession } from "@/lib/auth/session";
import { STOCK_DEPARTURE_STREET } from "@/lib/api/companySettings";

export type UiMode = "stock" | "pickup";
export type TransactionSource = "pickup" | "stock";

/** One product line on POST /api/transactions (multipart: items[i].package_name, items[i].quantity). */
export type TransactionLineItem = {
  package_name: string;
  quantity: number;
  description?: string;
};

/** Request body for POST /api/transactions (matches backend TransactionRequest). */
export type TransactionRequest = {
  package_name: string;
  description: string;
  destination_street: string;
  receiver_name: string;
  receiver_phone: string;
  source: TransactionSource;
  /** ISO date YYYY-MM-DD — required by backend (scheduling.timezone Africa/Douala). */
  scheduled_delivery_date: string;
  type?: string;
  quantity?: number;
  items?: TransactionLineItem[];
  amount?: number;
  status?: string;
  cash_collect?: boolean;
  serviceLevel?: string;
  weight?: string;
  receiver_gender?: string;
  departure_city?: string;
  departure_region?: string;
  departure_street?: string;
  departure_landmark?: string;
  destination_city?: string;
  destination_region?: string;
  destination_landmark?: string;
  driver_id?: number;
  agent_id?: number;
  transactionReference?: string;
  imageUri?: string;
};

export type Transaction = {
  id?: string | number;
  package_name?: string;
  description?: string;
  weight?: string;
  type?: string;
  quantity?: number;
  items?: TransactionLineItem[];
  user_id?: number;
  status?: string;
  transactionReference?: string;
  amount?: number;
  source?: string | null;
  cash_collect?: boolean | null;
  serviceLevel?: string | null;
  driver_id?: number | null;
  agent_id?: number | null;
  updatedBy?: number | null;
  created_at?: string;
  updated_at?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_gender?: string;
  departure?: { city?: string; region?: string; street?: string; landmark?: string | null };
  destination?: { city?: string; region?: string; street?: string; landmark?: string | null };
  receiverData?: { name?: string; phone?: string; gender?: string };
  departure_city?: string;
  departure_region?: string;
  departure_street?: string;
  departure_landmark?: string;
  destination_city?: string;
  destination_region?: string;
  destination_street?: string;
  destination_landmark?: string;
  /** Planned delivery date (ISO date from backend). */
  scheduled_delivery_date?: string | null;
  delivery_attempt?: number | null;
  rescheduled_at?: string | null;
  /** Total delivery fee in XAF (base + pickup + express), set by the backend */
  delivery_fee?: number | null;
  delivery_fee_base?: number | null;
  /** Pickup surcharge applied in XAF */
  pickup_fee_applied?: number | null;
  /** Express surcharge applied in XAF */
  express_fee_applied?: number | null;
  /** True while the fee could not be resolved from the destination yet */
  delivery_fee_pending?: boolean | null;
  /** UI-friendly mode derived from source */
  mode?: UiMode;
  /** UI-friendly express flag derived from serviceLevel */
  express?: boolean;
  /** Alias for cash_collect */
  collect_cash?: boolean;
};

type ApiError = { success?: false; error?: string; message?: string };

function parseResponseText(rawText: string): any {
  if (!rawText.length) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function errorMessageFrom(resStatus: number, data: any, rawText: string): string {
  return (
    (data as ApiError | null)?.message ||
    (data && typeof data === "string" ? data : null) ||
    (rawText && typeof rawText === "string" ? rawText : null) ||
    `HTTP ${resStatus}`
  );
}

function normalizeListResponse(data: any): any[] {
  if (Array.isArray(data)) return data;
  const inner = data?.data;
  if (Array.isArray(inner)) return inner;
  return [];
}

export function mapUiModeToSource(mode: UiMode): TransactionSource {
  return mode;
}

export function mapExpressToServiceLevel(express: "yes" | "no"): string {
  return express === "yes" ? "express" : "standard";
}

/** Backend `Source` enum: `pickup` | `stock` (legacy `pick_up` / `instocke` are rejected). */
export function resolveApiSourceField(source?: TransactionSource): TransactionSource | undefined {
  return source;
}

export function isTransactionReference(id: string): boolean {
  return /^LVS-/i.test(id.trim());
}

export function getTransactionNavigationId(tx: Transaction): string {
  if (tx.id != null && String(tx.id).trim().length) return String(tx.id);
  if (tx.transactionReference?.trim()) return tx.transactionReference.trim();
  return "";
}

function appendFormField(form: FormData, key: string, value: string | number | boolean | undefined | null) {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    form.append(key, value ? "true" : "false");
    return;
  }
  const s = String(value).trim();
  if (!s.length) return;
  form.append(key, s);
}

function appendTransactionImage(form: FormData, imageUri?: string) {
  if (!imageUri?.trim()) return;
  const uri = imageUri.trim();
  const name = uri.split("/").pop() || "photo.jpg";
  form.append("image", { uri, name, type: "image/jpeg" } as unknown as Blob);
}

function appendTransactionLineItems(form: FormData, items: TransactionLineItem[] | undefined) {
  if (!items?.length) return;
  items.forEach((item, index) => {
    appendFormField(form, `items[${index}].package_name`, item.package_name);
    appendFormField(form, `items[${index}].quantity`, item.quantity);
    appendFormField(form, `items[${index}].description`, item.description);
  });
}

export function formatTransactionItemsLine(items: TransactionLineItem[]): string {
  return items
    .filter((item) => item.package_name.trim() && item.quantity > 0)
    .map((item) => `${item.package_name.trim()} x${item.quantity}`)
    .join(", ");
}

export function sumTransactionItemQuantities(items: TransactionLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0);
}

export function buildTransactionFormData(payload: TransactionRequest): FormData {
  const form = new FormData();
  appendFormField(form, "package_name", payload.package_name);
  appendFormField(form, "description", payload.description);
  appendFormField(form, "destination_street", payload.destination_street);
  appendFormField(form, "receiver_name", payload.receiver_name);
  appendFormField(form, "receiver_phone", payload.receiver_phone);
  appendFormField(form, "source", resolveApiSourceField(payload.source));
  appendFormField(form, "scheduled_delivery_date", payload.scheduled_delivery_date);
  appendFormField(form, "type", payload.type);
  appendFormField(form, "quantity", payload.quantity);
  appendTransactionLineItems(form, payload.items);
  appendFormField(form, "amount", payload.amount);
  appendFormField(form, "status", payload.status);
  appendFormField(form, "cash_collect", payload.cash_collect);
  appendFormField(form, "serviceLevel", payload.serviceLevel);
  appendFormField(form, "weight", payload.weight);
  appendFormField(form, "receiver_gender", payload.receiver_gender);
  appendFormField(form, "departure_city", payload.departure_city);
  appendFormField(form, "departure_region", payload.departure_region);
  appendFormField(form, "departure_street", payload.departure_street);
  appendFormField(form, "departure_landmark", payload.departure_landmark);
  appendFormField(form, "destination_city", payload.destination_city);
  appendFormField(form, "destination_region", payload.destination_region);
  appendFormField(form, "destination_landmark", payload.destination_landmark);
  appendFormField(form, "driver_id", payload.driver_id);
  appendFormField(form, "agent_id", payload.agent_id);
  appendFormField(form, "transactionReference", payload.transactionReference);

  appendTransactionImage(form, payload.imageUri);

  return form;
}

function sourceToUiMode(source: unknown, type?: unknown, description?: unknown): UiMode | undefined {
  const s = String(source ?? "").trim().toLowerCase();
  if (s === "pick_up" || s === "pickup") return "pickup";
  if (s === "instocke" || s === "in_stock" || s === "stock") return "stock";
  const t = String(type ?? "").trim().toLowerCase();
  if (t === "pickup") return "pickup";
  if (t === "delivery") {
    const desc = String(description ?? "").trim().toLowerCase();
    if (desc.startsWith("ramassage:")) return "pickup";
    return "stock";
  }
  return undefined;
}

export function parseTransaction(raw: any): Transaction {
  const receiverData = raw?.receiverData ?? raw?.receiver;
  const departure = raw?.departure;
  const destination = raw?.destination;

  const receiver_name =
    String(receiverData?.name ?? raw?.receiver_name ?? "").trim() || undefined;
  const receiver_phone =
    String(receiverData?.phone ?? raw?.receiver_phone ?? "").trim() || undefined;
  const receiver_gender =
    String(receiverData?.gender ?? raw?.receiver_gender ?? "").trim() || undefined;

  const departure_city = departure?.city ?? raw?.departure_city;
  const departure_region = departure?.region ?? raw?.departure_region;
  const departure_street = departure?.street ?? raw?.departure_street;
  const departure_landmark = departure?.landmark ?? raw?.departure_landmark;

  const destination_city = destination?.city ?? raw?.destination_city;
  const destination_region = destination?.region ?? raw?.destination_region;
  const destination_street = destination?.street ?? raw?.destination_street;
  const destination_landmark = destination?.landmark ?? raw?.destination_landmark;

  const source = raw?.source ?? null;
  const serviceLevel = raw?.serviceLevel ?? null;
  const cash_collect =
    typeof raw?.cash_collect === "boolean"
      ? raw.cash_collect
      : typeof raw?.collect_cash === "boolean"
        ? raw.collect_cash
        : null;

  const mode = sourceToUiMode(source, raw?.type, raw?.description) ?? (raw?.mode === "pickup" || raw?.mode === "stock" ? raw.mode : undefined);
  const express =
    typeof serviceLevel === "string"
      ? serviceLevel.trim().toLowerCase() === "express"
      : Boolean(raw?.express);

  const id = raw?.id ?? (raw?.transactionReference ? undefined : undefined);

  const scheduled_delivery_date =
    typeof raw?.scheduled_delivery_date === "string" && raw.scheduled_delivery_date.trim()
      ? raw.scheduled_delivery_date.trim()
      : null;
  const delivery_attempt =
    typeof raw?.delivery_attempt === "number" && Number.isFinite(raw.delivery_attempt)
      ? raw.delivery_attempt
      : null;
  const rescheduled_at =
    typeof raw?.rescheduled_at === "string" && raw.rescheduled_at.trim()
      ? raw.rescheduled_at.trim()
      : null;

  return {
    ...raw,
    id,
    scheduled_delivery_date,
    delivery_attempt,
    rescheduled_at,
    receiver_name,
    receiver_phone,
    receiver_gender,
    receiverData,
    departure,
    destination,
    departure_city,
    departure_region,
    departure_street,
    departure_landmark,
    destination_city,
    destination_region,
    destination_street,
    destination_landmark,
    source,
    serviceLevel,
    cash_collect,
    collect_cash: cash_collect ?? undefined,
    mode,
    express,
  } as Transaction;
}

export function txnModeLabelFromTransaction(tx: Transaction): string {
  if (tx.mode === "pickup") return "Ramassage";
  if (tx.mode === "stock") return "Stock";
  const source = String(tx.source ?? "").trim().toLowerCase();
  if (source === "pick_up" || source === "pickup") return "Ramassage";
  if (source === "instocke" || source === "stock") return "Stock";
  const t = String(tx.type ?? "").trim().toLowerCase();
  if (t === "pickup") return "Ramassage";
  return "";
}

export type UiStatusBucket = "Planifiée" | "En cours" | "Livré" | "Annulé";

export function mapTxnStatusToUi(status?: string): UiStatusBucket {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "scheduled") return "Planifiée";
  if (["delivered", "completed", "complete", "done", "success"].includes(s)) return "Livré";
  if (["cancelled", "canceled", "failed", "rejected", "expired", "aborted"].includes(s)) return "Annulé";
  if (["pending", "processing", "pickup", "in_progress", "inprogress", "assigned", "accepted", "created", "new", "started", ""].includes(s)) {
    return "En cours";
  }
  return "En cours";
}

/** Client may cancel only while the order is still `pending` (not yet in delivery). */
export function canClientCancelTransaction(status?: string | null): boolean {
  return String(status ?? "").trim().toLowerCase() === "pending";
}

export const CLIENT_CANCEL_BLOCKED_MESSAGE =
  "Cette livraison est déjà en cours. Seules les commandes en attente peuvent être annulées depuis l'application.";

export type StockResumePayloadInput = {
  forExpedition: boolean;
  /** @deprecated use lineItems */
  itemsLine?: string;
  lineItems?: TransactionLineItem[];
  description: string;
  phone: string;
  receiverName?: string;
  express: "yes" | "no";
  collectCash: "yes" | "no";
  amount: number;
  /** @deprecated derived from lineItems */
  quantity?: number;
  destinationQuartier: string;
  destinationLandmark: string;
  departureCity?: string;
  departureRegion?: string;
  departureStreet: string;
  destinationCity?: string;
  destinationRegion?: string;
  scheduledDeliveryDate: string;
};

export function buildPayloadFromStockResume(input: StockResumePayloadInput): TransactionRequest {
  const lineItems = (input.lineItems ?? []).filter((item) => item.package_name.trim() && item.quantity > 0);
  const itemsLine =
    input.itemsLine?.trim() ||
    (lineItems.length ? formatTransactionItemsLine(lineItems) : "");
  const first = lineItems[0];
  const totalQty =
    lineItems.length > 0 ? sumTransactionItemQuantities(lineItems) : Math.max(1, input.quantity ?? 1);

  if (input.forExpedition) {
    // Expédition (Phase 2) : jamais de COD (amount_due = 0, cash_collect = false forcés backend),
    // pas de quartier ni de tarif auto — destination = copie du départ "Agence | adresse".
    const ville = input.departureCity?.trim() || "Yaoundé";
    const region = input.departureRegion?.trim() || "Centre";
    const departure_street = input.departureStreet.trim() || STOCK_DEPARTURE_STREET;
    return {
      package_name: first?.package_name.trim() || itemsLine.split(",")[0]?.trim() || "Colis",
      description: input.description.trim() || "Aucune description donnée",
      destination_street: departure_street,
      receiver_name: input.receiverName?.trim() || "Client",
      receiver_phone: input.phone.trim(),
      source: "stock",
      type: "expedition",
      quantity: totalQty,
      items: lineItems.length ? lineItems : undefined,
      amount: 0,
      scheduled_delivery_date: input.scheduledDeliveryDate,
      cash_collect: false,
      serviceLevel: "standard",
      departure_city: ville,
      departure_region: region,
      departure_street,
      destination_city: ville,
      destination_region: region,
    };
  }

  const destination_street = input.destinationQuartier.trim() || "—";
  return {
    package_name: first?.package_name.trim() || itemsLine.split(",")[0]?.trim() || "Colis",
    description: input.description.trim() || "Aucune description donnée",
    destination_street,
    destination_landmark: input.destinationLandmark.trim() || undefined,
    receiver_name: input.receiverName?.trim() || "Client",
    receiver_phone: input.phone.trim(),
    source: "stock",
    type: input.forExpedition ? "expedition" : "delivery",
    quantity: totalQty,
    items: lineItems.length ? lineItems : undefined,
    amount: input.amount,
    scheduled_delivery_date: input.scheduledDeliveryDate,
    cash_collect: input.collectCash === "yes",
    serviceLevel: mapExpressToServiceLevel(input.express),
    departure_city: input.departureCity ?? "Yaoundé",
    departure_region: input.departureRegion ?? "Centre",
    departure_street: input.departureStreet.trim() || STOCK_DEPARTURE_STREET,
    destination_city: input.destinationCity ?? "Yaoundé",
    destination_region: input.destinationRegion ?? "Centre",
  };
}

export type PickupResumePayloadInput = {
  forExpedition: boolean;
  packageName: string;
  description: string;
  phone: string;
  receiverName?: string;
  express: "yes" | "no";
  collectCash: "yes" | "no";
  amount: number;
  quantity: number;
  pickupStreet: string;
  pickupLandmark?: string;
  dropoffStreet: string;
  dropoffLandmark?: string;
  city?: string;
  region?: string;
  scheduledDeliveryDate: string;
};

export function buildPayloadFromPickupResume(input: PickupResumePayloadInput): TransactionRequest {
  if (input.forExpedition) {
    // Expédition (Phase 2) : jamais de COD, pas de quartier ni de tarif auto —
    // départ = "Agence | adresse client", destination = copie du départ.
    const ville = input.city?.trim() || "Yaoundé";
    const region = input.region?.trim() || "Centre";
    const departure_street = input.pickupStreet.trim() || "—";
    return {
      package_name: input.packageName.trim() || "Colis",
      description: input.description.trim() || "Aucune description donnée",
      destination_street: departure_street,
      receiver_name: input.receiverName?.trim() || "Client",
      receiver_phone: input.phone.trim(),
      source: "pickup",
      type: "expedition",
      quantity: input.quantity,
      amount: 0,
      scheduled_delivery_date: input.scheduledDeliveryDate,
      cash_collect: false,
      serviceLevel: "standard",
      departure_city: ville,
      departure_region: region,
      departure_street,
      destination_city: ville,
      destination_region: region,
    };
  }

  return {
    package_name: input.packageName.trim() || "Colis",
    description: input.description.trim() || "Aucune description donnée",
    destination_street: input.dropoffStreet.trim() || "—",
    destination_landmark: input.dropoffLandmark?.trim() || undefined,
    receiver_name: input.receiverName?.trim() || "Client",
    receiver_phone: input.phone.trim(),
    source: "pickup",
    type: input.forExpedition ? "expedition" : "delivery",
    quantity: input.quantity,
    amount: input.amount,
    scheduled_delivery_date: input.scheduledDeliveryDate,
    cash_collect: input.collectCash === "yes",
    serviceLevel: mapExpressToServiceLevel(input.express),
    departure_city: input.city ?? "Yaoundé",
    departure_region: input.region ?? "Centre",
    departure_street: input.pickupStreet.trim() || "—",
    departure_landmark: input.pickupLandmark?.trim() || undefined,
    destination_city: input.city ?? "Yaoundé",
    destination_region: input.region ?? "Centre",
  };
}

export async function createTransaction(input: TransactionRequest) {
  const sessionUser = await authSession.getSessionUser();
  if (!sessionUser?.keycloakId) {
    throw new Error("Session expirée. Reconnectez-vous pour créer une transaction.");
  }

  const url = `${API_BASE_URL}/api/transactions`;
  const form = buildTransactionFormData(input);

  logger.info("createTransaction", "POST /api/transactions (multipart)", {
    url,
    source: input.source,
    type: input.type,
    keycloakId: sessionUser.keycloakId,
  });

  const res = await apiFetch(url, {
    method: "POST",
    body: form,
    headers: {
      "X-User-Id": sessionUser.keycloakId,
    },
  });

  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);

  if (!res.ok) {
    logger.info("createTransaction", "POST /api/transactions failed", { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (typeof record.transactionReference === "string" && record.transactionReference.trim()) {
      return parseTransaction(record);
    }
    if (record.data && typeof record.data === "object") {
      return parseTransaction(record.data);
    }
  }

  const refreshed = await listTransactions();
  return refreshed[refreshed.length - 1] ?? data;
}

export async function listTransactions() {
  const sessionUser = await authSession.getSessionUser();
  if (!sessionUser?.keycloakId) {
    throw new Error("Session expirée. Reconnectez-vous pour voir vos livraisons.");
  }

  const safeKeycloakId = encodeURIComponent(sessionUser.keycloakId.trim());
  const url = `${API_BASE_URL}/api/users/transactions?keycloakId=${safeKeycloakId}`;
  logger.info("listTransactions", "GET /api/users/transactions", { url, keycloakId: sessionUser.keycloakId });

  const res = await apiFetch(url, { method: "GET" });
  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);

  if (!res.ok) {
    logger.info("listTransactions", "GET /api/users/transactions failed", { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  const all = normalizeListResponse(data);
  return all.map((t) => parseTransaction(t));
}

export async function getTransactionById(id: string | number) {
  const idStr = String(id).trim();
  const url = isTransactionReference(idStr)
    ? `${API_BASE_URL}/api/transactions/reference?transactionReference=${encodeURIComponent(idStr)}`
    : `${API_BASE_URL}/api/transactions/${encodeURIComponent(idStr)}`;

  logger.info("getTransaction", isTransactionReference(idStr) ? "GET /api/transactions/reference" : "GET /api/transactions/:id", {
    url,
    id: idStr,
  });

  const res = await apiFetch(url, { method: "GET" });
  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);

  if (!res.ok) {
    logger.info("getTransaction", "GET transaction failed", { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  return parseTransaction(data?.data ?? data);
}

export type CancelTransactionInput = {
  reason: string;
  details?: string;
};

async function resolveTransactionUpdateId(id: string | number): Promise<string> {
  const idStr = String(id).trim();
  if (!idStr.length) {
    throw new Error("Identifiant de livraison manquant.");
  }
  if (isTransactionReference(idStr)) {
    const tx = await getTransactionById(idStr);
    if (tx.id == null || !String(tx.id).trim().length) {
      throw new Error("Transaction introuvable.");
    }
    return String(tx.id);
  }
  return idStr;
}

/** Marks a transaction as cancelled (gateway status `failed`, shown as Annulé in UI). */
export async function cancelTransaction(id: string | number, input: CancelTransactionInput): Promise<Transaction> {
  const sessionUser = await authSession.getSessionUser();
  if (!sessionUser?.keycloakId) {
    throw new Error("Session expirée. Reconnectez-vous pour annuler cette livraison.");
  }

  const updateId = await resolveTransactionUpdateId(id);
  const url = `${API_BASE_URL}/api/transactions/${encodeURIComponent(updateId)}`;

  logger.info("cancelTransaction", "PUT /api/transactions/:id", {
    url,
    id: updateId,
    reason: input.reason,
    details: input.details,
    keycloakId: sessionUser.keycloakId,
  });

  const res = await apiFetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": sessionUser.keycloakId,
    },
    body: JSON.stringify({ status: "failed" }),
  });

  const rawText = await res.text().catch(() => "");
  const data = parseResponseText(rawText);

  if (!res.ok) {
    logger.info("cancelTransaction", "PUT /api/transactions/:id failed", { status: res.status, body: data ?? rawText });
    throw new Error(errorMessageFrom(res.status, data, rawText));
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      return parseTransaction(record.data);
    }
    if ("id" in record || "transactionReference" in record || "status" in record) {
      return parseTransaction(record);
    }
  }

  return getTransactionById(updateId);
}
