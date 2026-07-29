import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, ScrollView as RNScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenLayout from "./ScreenLayout";
import AppText from "./AppText";
import AppTextInput from "./AppTextInput";
import ExpressToggleCard from "./ExpressToggleCard";
import FormInput from "./FormInput";
import FormButton from "./FormButton";
import SolarIcon from "./SolarIcon";
import CenteredScreenHeader from "./CenteredScreenHeader";
import { card } from "../theme/styles";
import { colors, fonts, radii, typography } from "../theme/tokens";
import {
  buildExpeditionDepartureStreet,
  parseExpeditionClient,
  SERVICE_EXPEDITION,
  stringifyExpeditionClient,
} from "@/lib/expeditionClient";
import {
  getCompanySettings,
  stockDepartureStreetFromCompanySettings,
  STOCK_DEPARTURE_STREET,
} from "@/lib/api/companySettings";
import { hapticSuccess } from "@/lib/haptics";
import { listPackages, makeClientId, type Package } from "@/lib/api/packages";
import { formatSupplementFcfaLabel } from "@/lib/api/tariffUi";
import { filterInventoryByName } from "@/lib/formAutocomplete";
import { useDeliveryFeeSettings } from "@/lib/hooks/useDeliveryFeeSettings";
import DeliveryDateField from "./DeliveryDateField";
import { isScheduledDeliveryDateValid, todayIsoInSchedulingTimezone } from "@/lib/scheduling/deliveryDate";

export type MaDemandeProduitsFlow = "livraison" | "expedition";

type Mode = "stock" | "pickup";

const INPUT_BG = "#F3F4F5";
const INPUT_RADIUS = 24;
const PH = "rgba(60,74,60,0.4)";

function RamassageFieldLabel({ children }: { children: string }) {
  return (
    <AppText
      style={{
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fonts.bodySemi,
        color: colors.text,
        marginBottom: 8,
      }}
      numberOfLines={2}
    >
      {children}
    </AppText>
  );
}

type InventoryItem = {
  id: string;
  name: string;
  stockLabel: string;
  stockAvailable: number;
};

type StockCartItem = {
  id: string;
  name: string;
  qty: number;
};

function parseStockCartItems(raw: string | undefined): StockCartItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => ({
        id: String(it?.id ?? "").trim(),
        name: String(it?.name ?? "").trim(),
        qty: Number.isFinite(Number(it?.qty)) ? Math.max(1, Math.floor(Number(it.qty))) : 0,
      }))
      .filter((it) => it.id && it.name && it.qty > 0);
  } catch {
    return [];
  }
}

function stringifyStockCartItems(items: StockCartItem[]): string {
  return JSON.stringify(items.filter((it) => it.id && it.name && it.qty > 0));
}

function cartQtyForItem(cart: StockCartItem[], id: string): number {
  return cart.find((it) => it.id === id)?.qty ?? 0;
}

function addOrIncrementCartItem(cart: StockCartItem[], item: InventoryItem, maxQty: number): StockCartItem[] {
  const existing = cart.find((it) => it.id === item.id);
  if (existing) {
    const nextQty = Math.min(maxQty, existing.qty + 1);
    if (nextQty <= existing.qty) return cart;
    return cart.map((it) => (it.id === item.id ? { ...it, qty: nextQty } : it));
  }
  if (maxQty <= 0) return cart;
  return [...cart, { id: item.id, name: item.name, qty: 1 }];
}

function updateCartItemQty(cart: StockCartItem[], id: string, qty: number): StockCartItem[] {
  if (qty <= 0) return cart.filter((it) => it.id !== id);
  return cart.map((it) => (it.id === id ? { ...it, qty } : it));
}

function removeCartItem(cart: StockCartItem[], id: string): StockCartItem[] {
  return cart.filter((it) => it.id !== id);
}

function StockCartList({
  cart,
  inventory,
  onChange,
}: {
  cart: StockCartItem[];
  inventory: InventoryItem[];
  onChange: (next: StockCartItem[]) => void;
}) {
  if (!cart.length) return null;

  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      {cart.map((cartItem) => {
        const inv = inventory.find((it) => it.id === cartItem.id);
        const maxQty = Math.max(0, inv?.stockAvailable ?? cartItem.qty);
        const atMax = maxQty > 0 && cartItem.qty >= maxQty;
        return (
          <View
            key={cartItem.id}
            style={{
              borderRadius: 14,
              backgroundColor: colors.white,
              borderWidth: 1,
              borderColor: "rgba(187,203,184,0.22)",
              paddingHorizontal: 10,
              paddingVertical: 8,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText
                  variant="dense"
                  style={{ fontSize: 13, lineHeight: 18, fontFamily: fonts.bodySemi, color: colors.text }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {cartItem.name}
                </AppText>
                {inv ? (
                  <AppText
                    variant="dense"
                    style={{ marginTop: 2, fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
                    numberOfLines={1}
                  >
                    {inv.stockLabel}
                  </AppText>
                ) : null}
              </View>
              <Pressable onPress={() => onChange(removeCartItem(cart, cartItem.id))} hitSlop={8}>
                <AppText variant="dense" style={{ fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyBold, color: "#B91C1C" }} numberOfLines={1}>
                  Retirer
                </AppText>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => onChange(updateCartItemQty(cart, cartItem.id, cartItem.qty - 1))}
                disabled={cartItem.qty <= 1}
                hitSlop={4}
                style={{
                  width: 32,
                  minHeight: 32,
                  borderRadius: radii.pill,
                  backgroundColor: cartItem.qty <= 1 ? "#E5E7EB" : colors.white,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(187,203,184,0.20)",
                }}
              >
                <AppText style={{ fontSize: 16, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
                  —
                </AppText>
              </Pressable>
              <View style={{ flex: 1, minHeight: 32, borderRadius: radii.pill, backgroundColor: INPUT_BG, alignItems: "center", justifyContent: "center" }}>
                <AppText style={{ fontSize: 14, lineHeight: 18, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
                  {cartItem.qty}
                </AppText>
              </View>
              <Pressable
                onPress={() => onChange(updateCartItemQty(cart, cartItem.id, cartItem.qty + 1))}
                disabled={atMax || maxQty <= 0}
                hitSlop={4}
                style={{
                  width: 32,
                  minHeight: 32,
                  borderRadius: radii.pill,
                  backgroundColor: atMax || maxQty <= 0 ? "#E5E7EB" : colors.white,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(187,203,184,0.20)",
                }}
              >
                <AppText style={{ fontSize: 16, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1}>
                  +
                </AppText>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function toInventory(items: Package[]): InventoryItem[] {
  // The backend can return several rows with the same package name — merge them
  // (summed stock) so ids stay unique and the selector shows one line per product.
  const merged = new Map<string, { id: string; name: string; description: string; qty: number }>();
  for (const p of items) {
    const name = String(p?.package_name ?? "").trim();
    if (!name) continue;
    const description = String(p?.description ?? "").trim();
    const qty = Number.isFinite(Number(p?.quantity)) ? Math.max(0, Math.floor(Number(p.quantity))) : 0;
    const id = makeClientId(p);
    const existing = merged.get(id);
    if (existing) {
      existing.qty += qty;
      if (!existing.description && description) existing.description = description;
    } else {
      merged.set(id, { id, name, description, qty });
    }
  }
  return Array.from(merged.values()).map(({ id, name, description, qty }) => ({
    id,
    name,
    stockLabel: [description, `STOCK: ${qty}`].filter(Boolean).join(" • "),
    stockAvailable: qty,
  }));
}

function parseXaf(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "");
  const n = cleaned.length ? Number(cleaned) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function ModeChoiceCard({
  hint,
  value,
  onChange,
}: {
  hint: string;
  value: Mode;
  onChange: (next: Mode) => void;
}) {
  const segments: { key: Mode; label: string; iconName: string }[] = [
    { key: "pickup", label: "Ramassage", iconName: "solar:hand-shake-bold" },
    { key: "stock", label: "Colis en stock", iconName: "solar:box-bold" },
  ];

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: "rgba(187,203,184,0.22)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
      }}
    >
      <AppText
        variant="dense"
        style={{
          fontSize: 10,
          lineHeight: 15,
          fontFamily: fonts.bodyBold,
          color: "rgba(60,74,60,0.7)",
          letterSpacing: 1,
          textTransform: "uppercase",
          textAlign: "center",
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {hint}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: INPUT_BG,
          borderRadius: 12,
          padding: 3,
          gap: 3,
        }}
      >
        {segments.map((seg) => {
          const active = value === seg.key;
          return (
            <Pressable
              key={seg.key}
              onPress={() => onChange(seg.key)}
              hitSlop={4}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 9,
                backgroundColor: active ? colors.primary : "transparent",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                paddingHorizontal: 6,
                paddingVertical: 6,
              }}
            >
              <SolarIcon name={seg.iconName} size={15} color={active ? colors.white : colors.primary} />
              <AppText
                variant="dense"
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontFamily: active ? fonts.bodyBold : fonts.bodySemi,
                  color: active ? colors.white : colors.text,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {seg.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type FormProps = {
  flow: MaDemandeProduitsFlow;
};

export default function MaDemandeProduitsForm({ flow }: FormProps) {
  const isExpedition = flow === "expedition";
  const screenTitle = isExpedition ? "Ma demande d'expédition" : "Ma demande de livraison";
  const modeChoiceHint = isExpedition ? "SOURCE DU COLIS (STOCK OU RAMASSAGE)" : "CHOISIR OÙ RÉCUPÉRER LE COLIS À LIVRER";
  const { expressFee, pickupFee } = useDeliveryFeeSettings();

  const {
    quartier: quartierParam,
    mode: modeParam,
    expeditionClient: expeditionClientRaw,
    editSection,
    phone: expPhoneParam,
    expAgence: expAgenceParam,
    expPickupAddress: expPickupAddressParam,
    selectedItems: selectedItemsParam,
    livSelectedItems: livSelectedItemsParam,
    livPhone: livPhoneParam,
    livNotes: livNotesParam,
    livExpress: livExpressParam,
    livCollectCash: livCollectCashParam,
    livAmountDueText: livAmountDueTextParam,
    deliveryQuartier: deliveryQuartierParam,
    deliveryLandmark: deliveryLandmarkParam,
    stockItemId: stockItemIdParam,
    stockQty: stockQtyParam,
    pickupPhone: pickupPhoneParam,
    pickupExpress: pickupExpressParam,
    pickupCollectCash: pickupCollectCashParam,
    pickupAmount: pickupAmountParam,
    pickupName: pickupNameParam,
    pickupQty: pickupQtyParam,
    pickupPickupQuartier: pickupPickupQuartierParam,
    pickupPickupLandmark: pickupPickupLandmarkParam,
    pickupDropoffQuartier: pickupDropoffQuartierParam,
    pickupDropoffLandmark: pickupDropoffLandmarkParam,
    pickupPhotoUri: pickupPhotoUriParam,
    scheduledDeliveryDate: scheduledDeliveryDateParam,
  } = useLocalSearchParams<{
    quartier?: string;
    mode?: Mode;
    expeditionClient?: string;
    editSection?: string;
    phone?: string;
    expAgence?: string;
    expPickupAddress?: string;
    notes?: string;
    express?: "yes" | "no";
    collectCash?: "yes" | "no";
    amountDueText?: string;
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
  }>();

  const quartier = typeof quartierParam === "string" ? quartierParam : "";
  const initialMode: Mode = modeParam === "pickup" ? "pickup" : "stock";
  const editSectionKey = typeof editSection === "string" ? editSection : "";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [scheduledDeliveryDateOverride, setScheduledDeliveryDateOverride] = useState<string | null>(null);
  const scheduledDeliveryDate = useMemo(() => {
    if (scheduledDeliveryDateOverride) return scheduledDeliveryDateOverride;
    const fromParam = typeof scheduledDeliveryDateParam === "string" ? scheduledDeliveryDateParam.trim() : "";
    if (fromParam.length && isScheduledDeliveryDateValid(fromParam)) return fromParam;
    return todayIsoInSchedulingTimezone();
  }, [scheduledDeliveryDateOverride, scheduledDeliveryDateParam]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [pickupName, setPickupName] = useState(() => (typeof pickupNameParam === "string" ? pickupNameParam : ""));
  const [pickupQty, setPickupQty] = useState(() => (typeof pickupQtyParam === "string" && pickupQtyParam.length ? pickupQtyParam : "1"));
  const [pickupExpress, setPickupExpress] = useState<"yes" | "no">(() => (pickupExpressParam === "yes" ? "yes" : "no"));
  const [pickupCollectCash, setPickupCollectCash] = useState<"yes" | "no">(() => (pickupCollectCashParam === "yes" ? "yes" : "no"));
  const [pickupAmount, setPickupAmount] = useState(() => (typeof pickupAmountParam === "string" ? pickupAmountParam : ""));
  const [pickupPhone, setPickupPhone] = useState(() => (typeof pickupPhoneParam === "string" ? pickupPhoneParam : ""));
  const [pickupPickupQuartierQuery, setPickupPickupQuartierQuery] = useState(() => (typeof pickupPickupQuartierParam === "string" ? pickupPickupQuartierParam : ""));
  const [pickupPickupLandmark, setPickupPickupLandmark] = useState(() => (typeof pickupPickupLandmarkParam === "string" ? pickupPickupLandmarkParam : ""));
  const [pickupDropoffQuartierQuery, setPickupDropoffQuartierQuery] = useState(() => (typeof pickupDropoffQuartierParam === "string" ? pickupDropoffQuartierParam : ""));
  const [pickupDropoffLandmark, setPickupDropoffLandmark] = useState(() => (typeof pickupDropoffLandmarkParam === "string" ? pickupDropoffLandmarkParam : ""));

  const [expVille, setExpVille] = useState(() => (typeof quartierParam === "string" ? quartierParam.trim() : ""));
  const [expAgence, setExpAgence] = useState(() => (typeof expAgenceParam === "string" ? expAgenceParam : ""));
  const [expPickupAddress, setExpPickupAddress] = useState(() =>
    typeof expPickupAddressParam === "string" ? expPickupAddressParam : ""
  );
  // Point de départ colis en stock : adresse agence (Paramètres), en lecture seule.
  const [agencyDepartureStreet, setAgencyDepartureStreet] = useState(STOCK_DEPARTURE_STREET);

  useEffect(() => {
    if (!isExpedition) return;
    let mounted = true;
    (async () => {
      const settings = await getCompanySettings();
      if (!mounted) return;
      setAgencyDepartureStreet(stockDepartureStreetFromCompanySettings(settings));
    })();
    return () => {
      mounted = false;
    };
  }, [isExpedition]);
  const [expNomDestinataire, setExpNomDestinataire] = useState(() =>
    parseExpeditionClient(typeof expeditionClientRaw === "string" ? expeditionClientRaw : undefined)?.clientName ?? ""
  );
  const [expTelephoneDestinataire, setExpTelephoneDestinataire] = useState(() =>
    (typeof expPhoneParam === "string" && expPhoneParam.trim().length ? expPhoneParam.trim() : "") ||
    (parseExpeditionClient(typeof expeditionClientRaw === "string" ? expeditionClientRaw : undefined)?.phone ?? "")
  );

  const [expStockOpen, setExpStockOpen] = useState(false);
  const [expStockSearch, setExpStockSearch] = useState("");

  const initialStockCart = useMemo(
    () =>
      parseStockCartItems(
        typeof selectedItemsParam === "string" && selectedItemsParam.length
          ? selectedItemsParam
          : typeof livSelectedItemsParam === "string"
            ? livSelectedItemsParam
            : undefined,
      ),
    [selectedItemsParam, livSelectedItemsParam],
  );

  const [expCart, setExpCart] = useState<StockCartItem[]>(() => (isExpedition ? initialStockCart : []));
  const [livCart, setLivCart] = useState<StockCartItem[]>(() => (!isExpedition ? initialStockCart : []));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setInventoryLoading(true);
        setInventoryError(null);
        const items = await listPackages();
        if (!mounted) return;
        const inv = toInventory(items);
        setInventory(inv);
        // Legacy deep-link params (stockItemId/stockQty) seed the cart once inventory is known.
        if (!isExpedition) {
          const legacyId = typeof stockItemIdParam === "string" ? stockItemIdParam.trim() : "";
          const legacyItem = legacyId ? inv.find((it) => it.id === legacyId) : undefined;
          if (legacyItem) {
            const legacyQty = Math.max(1, Math.floor(parseXaf(typeof stockQtyParam === "string" ? stockQtyParam : "1") || 1));
            setLivCart((prev) =>
              prev.length
                ? prev
                : [{ id: legacyItem.id, name: legacyItem.name, qty: Math.min(legacyQty, Math.max(1, legacyItem.stockAvailable)) }],
            );
          }
        }
      } catch (e: any) {
        if (!mounted) return;
        setInventoryError(String(e?.message ?? e ?? "Erreur de chargement"));
        setInventory([]);
      } finally {
        if (!mounted) return;
        setInventoryLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [livStockSearch, setLivStockSearch] = useState("");
  const [livStockOpen, setLivStockOpen] = useState(false);
  const [livPhone, setLivPhone] = useState(() => (typeof livPhoneParam === "string" ? livPhoneParam : ""));
  const [livQuartierQuery, setLivQuartierQuery] = useState(() => (typeof deliveryQuartierParam === "string" ? deliveryQuartierParam : ""));
  const [livDeliveryLandmark, setLivDeliveryLandmark] = useState(() => (typeof deliveryLandmarkParam === "string" ? deliveryLandmarkParam : ""));
  const [livNotes, setLivNotes] = useState(() => (typeof livNotesParam === "string" ? livNotesParam : ""));
  const [livExpress, setLivExpress] = useState<"yes" | "no">(() => (livExpressParam === "yes" ? "yes" : "no"));
  const [livCollectCash, setLivCollectCash] = useState<"yes" | "no">(() => (livCollectCashParam === "yes" ? "yes" : "no"));
  const [livAmountDueText, setLivAmountDueText] = useState(() => (typeof livAmountDueTextParam === "string" ? livAmountDueTextParam : ""));

  const scrollRef = useRef<RNScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const recordSectionLayout = (key: string, e: any) => {
    sectionY.current[key] = e?.nativeEvent?.layout?.y ?? 0;
  };

  useEffect(() => {
    if (!editSectionKey) return;
    if (mode !== "stock" && mode !== "pickup") return;
    const y = sectionY.current[editSectionKey];
    if (typeof y !== "number") return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      if (mode === "stock") {
        if (!isExpedition) {
          if (editSectionKey === "items") setLivStockOpen(true);
        } else {
          if (editSectionKey === "items") setExpStockOpen(true);
        }
      }
    });
  }, [editSectionKey, isExpedition, mode]);

  // minLength 0: an empty query lists the client's whole catalog (selection UX, not search-only)
  const expFilteredStock = useMemo(() => filterInventoryByName(inventory, expStockSearch, 0), [expStockSearch, inventory]);

  const livFilteredStock = useMemo(() => filterInventoryByName(inventory, livStockSearch, 0), [livStockSearch, inventory]);

  const expCartValid = useMemo(
    () =>
      expCart.length > 0 &&
      expCart.every((cartItem) => {
        const inv = inventory.find((it) => it.id === cartItem.id);
        return Boolean(inv && cartItem.qty > 0 && cartItem.qty <= inv.stockAvailable);
      }),
    [expCart, inventory],
  );

  const livCartValid = useMemo(
    () =>
      livCart.length > 0 &&
      livCart.every((cartItem) => {
        const inv = inventory.find((it) => it.id === cartItem.id);
        return Boolean(inv && cartItem.qty > 0 && cartItem.qty <= inv.stockAvailable);
      }),
    [livCart, inventory],
  );

  const livNeedsCashAmount = livCollectCash === "yes";

  const livAmountDue = useMemo(() => {
    const cleaned = livAmountDueText.replace(/[^\d.,]/g, "").replace(",", ".");
    const n = cleaned.length ? Number(cleaned) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }, [livAmountDueText]);
  const canContinuePickup = useMemo(() => {
    if (isExpedition) {
      return (
        (mode !== "stock" || expCartValid) &&
        expVille.trim().length > 0 &&
        expAgence.trim().length > 0 &&
        (mode !== "pickup" || expPickupAddress.trim().length > 0) &&
        expNomDestinataire.trim().length > 0 &&
        expTelephoneDestinataire.trim().length > 0
      );
    }
    if (mode === "stock") {
      const phoneOk = livPhone.trim().length > 0;
      const addressOk = livQuartierQuery.trim().length > 0;
      if (!livCartValid || !phoneOk || !addressOk) return false;
      if (!livNeedsCashAmount) return true;
      return Number.isFinite(livAmountDue) && livAmountDue > 0;
    }
    const baseOk =
      pickupName.trim().length > 0 &&
      parseXaf(pickupQty) > 0 &&
      pickupPhone.trim().length > 0 &&
      pickupPickupQuartierQuery.trim().length > 0 &&
      pickupPickupLandmark.trim().length > 0 &&
      pickupDropoffQuartierQuery.trim().length > 0 &&
      pickupDropoffLandmark.trim().length > 0;
    if (!baseOk) return false;
    if (pickupCollectCash === "no") return true;
    return parseXaf(pickupAmount) > 0;
  }, [
    isExpedition,
    mode,
    expVille,
    expAgence,
    expPickupAddress,
    expNomDestinataire,
    expTelephoneDestinataire,
    expCartValid,
    livCartValid,
    livPhone,
    livQuartierQuery,
    livNeedsCashAmount,
    livAmountDue,
    pickupName,
    pickupQty,
    pickupPhone,
    pickupPickupQuartierQuery,
    pickupPickupLandmark,
    pickupDropoffQuartierQuery,
    pickupDropoffLandmark,
    pickupCollectCash,
    pickupAmount,
  ]);

  const handleContinue = useCallback(async () => {
    await hapticSuccess();
    if (mode === "stock" && isExpedition) {
      const departureStreet = buildExpeditionDepartureStreet(expAgence, agencyDepartureStreet);
      const expeditionClient = stringifyExpeditionClient({
        clientName: expNomDestinataire.trim(),
        phone: expTelephoneDestinataire.trim(),
        address: [expVille.trim(), departureStreet].filter(Boolean).join(" — ") || quartier.trim(),
        notes: "",
      });
      router.push({
        pathname: "/resume-produit-en-stock",
        params: {
          quartier: expVille.trim(),
          expAgence: expAgence.trim(),
          expPickupAddress: agencyDepartureStreet.trim(),
          selectedItems: stringifyStockCartItems(expCart),
          phone: expTelephoneDestinataire.trim(),
          notes: "",
          express: "no",
          collectCash: "no",
          amountDueText: "",
          service: SERVICE_EXPEDITION,
          expeditionClient,
          scheduledDeliveryDate,
        },
      });
      return;
    }

    if (mode === "pickup" && isExpedition) {
      const departureStreet = buildExpeditionDepartureStreet(expAgence, expPickupAddress);
      const expeditionPickupParams = {
        service: SERVICE_EXPEDITION,
        expeditionClient: stringifyExpeditionClient({
          clientName: expNomDestinataire.trim(),
          phone: expTelephoneDestinataire.trim(),
          address: [expVille.trim(), departureStreet].filter(Boolean).join(" — "),
          notes: "",
        }),
      };
      router.push({
        pathname: "/resume-produit-ramasse",
        params: {
          quartier: expVille.trim(),
          expAgence: expAgence.trim(),
          expPickupAddress: expPickupAddress.trim(),
          pickupName: expNomDestinataire.trim(),
          pickupAddress: departureStreet,
          pickupQty: "1",
          pickupExpress: "no",
          pickupCollectCash: "no",
          pickupAmount: "",
          pickupPhone: expTelephoneDestinataire.trim(),
          scheduledDeliveryDate,
          ...expeditionPickupParams,
        },
      });
      return;
    }

    if (mode === "stock" && !isExpedition) {
      const deliveryQuartier = livQuartierQuery.trim();
      const deliveryLandmark = livDeliveryLandmark.trim();
      const deliveryAddress = [deliveryQuartier, deliveryLandmark].filter(Boolean).join(" — ");
      router.push({
        pathname: "/resume-produit-en-stock",
        params: {
          quartier,
          deliveryAddress,
          deliveryQuartier,
          deliveryLandmark,
          selectedItems: stringifyStockCartItems(livCart),
          phone: livPhone.trim(),
          notes: livNotes.trim(),
          express: livExpress,
          collectCash: livCollectCash,
          amountDueText: livNeedsCashAmount ? livAmountDueText : "",
          scheduledDeliveryDate,
        },
      });
      return;
    }

    if (mode === "pickup") {
      const pickupQuartier = pickupPickupQuartierQuery.trim();
      const pickupLandmark = pickupPickupLandmark.trim();
      const pickupAddress = [pickupQuartier, pickupLandmark].filter(Boolean).join(" — ");

      const dropoffQuartier = pickupDropoffQuartierQuery.trim();
      const dropoffLandmark = pickupDropoffLandmark.trim();
      const deliveryAddress = [dropoffQuartier, dropoffLandmark].filter(Boolean).join(" — ");

      router.push({
        pathname: "/resume-produit-ramasse",
        params: {
          quartier,
          deliveryAddress,
          pickupAddress,
          pickupName,
          pickupQty,
          pickupExpress,
          pickupCollectCash,
          pickupAmount,
          pickupPhone,
          pickupPickupQuartier: pickupQuartier,
          pickupPickupLandmark: pickupLandmark,
          pickupDropoffQuartier: dropoffQuartier,
          pickupDropoffLandmark: dropoffLandmark,
          scheduledDeliveryDate,
        },
      });
    }
  }, [
    isExpedition,
    mode,
    expNomDestinataire,
    expTelephoneDestinataire,
    expVille,
    expAgence,
    expPickupAddress,
    agencyDepartureStreet,
    quartier,
    expCart,
    livQuartierQuery,
    livDeliveryLandmark,
    livCart,
    livPhone,
    livNotes,
    livExpress,
    livCollectCash,
    livNeedsCashAmount,
    livAmountDueText,
    pickupPickupQuartierQuery,
    pickupPickupLandmark,
    pickupDropoffQuartierQuery,
    pickupDropoffLandmark,
    pickupName,
    pickupQty,
    pickupExpress,
    pickupCollectCash,
    pickupAmount,
    pickupPhone,
    scheduledDeliveryDate,
  ]);

  return (
    <ScreenLayout
      scrollViewRef={scrollRef}
      scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
      headerCompact
      header={<CenteredScreenHeader title={screenTitle} showBack compact />}
    >

      <View style={{ marginBottom: 16 }}>
        <DeliveryDateField value={scheduledDeliveryDate} onChange={setScheduledDeliveryDateOverride} testID="delivery-date-field" />
      </View>

      <View onLayout={(e) => recordSectionLayout("mode", e)} style={{ marginBottom: 16 }}>
        <ModeChoiceCard hint={modeChoiceHint} value={mode} onChange={setMode} />
      </View>

      {mode === "stock" ? (
        isExpedition ? (
          <View style={{ gap: 20 }}>
            <View>
              <RamassageFieldLabel>Colis en stock</RamassageFieldLabel>
              <View onLayout={(e) => recordSectionLayout("items", e)} />
              <StockCartList cart={expCart} inventory={inventory} onChange={setExpCart} />
              <View
                style={{
                  minHeight: 56,
                  borderRadius: INPUT_RADIUS,
                  backgroundColor: INPUT_BG,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginTop: expCart.length ? 10 : 0,
                }}
              >
              <SolarIcon name="solar:magnifer-outline" size={24} color={"rgba(60,74,60,0.45)"} />
                <AppTextInput
                  value={expStockSearch}
                  onChangeText={(t) => {
                    setExpStockSearch(t);
                    setExpStockOpen(true);
                  }}
                  onFocus={() => setExpStockOpen(true)}
                  onBlur={() => setTimeout(() => setExpStockOpen(false), 150)}
                  placeholder="Sélectionner ou rechercher un produit..."
                  placeholderTextColor={PH}
                  style={{ ...typography.bodyRegular, fontSize: 14, lineHeight: 20, flex: 1, color: colors.text }}
                />
              </View>

              {expStockOpen ? (
                <View
                  style={{
                    marginTop: 10,
                    borderRadius: 16,
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: "rgba(187,203,184,0.20)",
                    overflow: "hidden",
                  }}
                >
                  {inventoryLoading ? (
                    <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                      <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={2}>
                        Chargement du stock…
                      </AppText>
                    </View>
                  ) : inventoryError ? (
                    <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                      <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "#B91C1C" }} numberOfLines={3}>
                        {inventoryError}
                      </AppText>
                    </View>
                  ) : null}
                  {!inventoryLoading && !inventoryError
                    ? expFilteredStock.slice(0, 6).map((it) => (
                        <Pressable
                          key={it.id}
                          onPress={() => {
                            setExpCart((prev) => addOrIncrementCartItem(prev, it, it.stockAvailable));
                            setExpStockSearch("");
                            setExpStockOpen(true);
                          }}
                          disabled={it.stockAvailable <= 0 || cartQtyForItem(expCart, it.id) >= it.stockAvailable}
                          style={{
                            minHeight: 52,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: "rgba(237,238,239,0.9)",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <View style={{ width: 36, height: 36, borderRadius: 14, backgroundColor: "#EDEEEF", alignItems: "center", justifyContent: "center" }}>
                            <SolarIcon name="solar:box-outline" size={24} color={"rgba(25,28,29,0.75)"} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                              {it.name}
                            </AppText>
                            <AppText variant="dense" style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }} numberOfLines={1}>
                              {it.stockLabel}
                            </AppText>
                          </View>
                        </Pressable>
                      ))
                    : null}
                  {!inventoryLoading && !inventoryError && expFilteredStock.length === 0 ? (
                    <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                      <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={2}>
                        {inventory.length === 0
                          ? "Aucun produit dans votre stock."
                          : "Aucun produit trouvé."}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View onLayout={(e) => recordSectionLayout("pickupAddress", e)} />
            <FormInput label="Ville de l'expédition" value={expVille} onChangeText={setExpVille} placeholder="Ex. Douala" />
            <FormInput label="Agence de voyage" value={expAgence} onChangeText={setExpAgence} placeholder="Ex. Général Express" />
            <View>
              <FormInput label="Point de départ (adresse agence)" value={agencyDepartureStreet} editable={false} />
              <AppText
                variant="dense"
                style={{ marginTop: 6, fontSize: 11, lineHeight: 15, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.6)" }}
                numberOfLines={2}
              >
                Colis en stock : le départ se fait depuis l&apos;agence.
              </AppText>
            </View>
            <View onLayout={(e) => recordSectionLayout("recipient", e)} />
            <FormInput label="Nom du destinataire" value={expNomDestinataire} onChangeText={setExpNomDestinataire} placeholder="Nom complet" autoCapitalize="words" />
            <FormInput label="Numéro de téléphone du destinataire" keyboardType="phone-pad" value={expTelephoneDestinataire} onChangeText={setExpTelephoneDestinataire} placeholder="6XXXXXX" />
          </View>
        ) : (
          <>
            <View style={{ gap: 20 }}>
              <View>
                <RamassageFieldLabel>Sélectionner des produits</RamassageFieldLabel>
                <View onLayout={(e) => recordSectionLayout("items", e)} />
                <StockCartList cart={livCart} inventory={inventory} onChange={setLivCart} />
                <View
                  style={{
                    minHeight: 56,
                    borderRadius: INPUT_RADIUS,
                    backgroundColor: INPUT_BG,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginTop: livCart.length ? 10 : 0,
                  }}
                >
                <SolarIcon name="solar:magnifer-outline" size={24} color={"rgba(60,74,60,0.45)"} />
                  <AppTextInput
                    value={livStockSearch}
                    onChangeText={(t) => {
                      setLivStockSearch(t);
                      setLivStockOpen(true);
                    }}
                    onFocus={() => setLivStockOpen(true)}
                    onBlur={() => setTimeout(() => setLivStockOpen(false), 150)}
                    placeholder="Sélectionner ou rechercher un produit..."
                    placeholderTextColor={PH}
                    style={{ ...typography.bodyRegular, fontSize: 14, lineHeight: 20, flex: 1, color: colors.text }}
                  />
                </View>

                {livStockOpen ? (
                  <View
                    style={{
                      marginTop: 10,
                      borderRadius: 16,
                      backgroundColor: colors.white,
                      borderWidth: 1,
                      borderColor: "rgba(187,203,184,0.20)",
                      overflow: "hidden",
                    }}
                  >
                    {inventoryLoading ? (
                      <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={2}>
                          Chargement du stock…
                        </AppText>
                      </View>
                    ) : inventoryError ? (
                      <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "#B91C1C" }} numberOfLines={3}>
                          {inventoryError}
                        </AppText>
                      </View>
                    ) : null}
                    {!inventoryLoading && !inventoryError
                      ? livFilteredStock.slice(0, 6).map((it) => (
                          <Pressable
                            key={it.id}
                            onPress={() => {
                              setLivCart((prev) => addOrIncrementCartItem(prev, it, it.stockAvailable));
                              setLivStockSearch("");
                              setLivStockOpen(true);
                            }}
                            disabled={it.stockAvailable <= 0 || cartQtyForItem(livCart, it.id) >= it.stockAvailable}
                            style={{
                              minHeight: 52,
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: "rgba(237,238,239,0.9)",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 14, backgroundColor: "#EDEEEF", alignItems: "center", justifyContent: "center" }}>
                              <SolarIcon name="solar:box-outline" size={24} color={"rgba(25,28,29,0.75)"} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                                {it.name}
                              </AppText>
                              <AppText variant="dense" style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }} numberOfLines={1}>
                                {it.stockLabel}
                              </AppText>
                            </View>
                          </Pressable>
                        ))
                      : null}
                    {!inventoryLoading && !inventoryError && livFilteredStock.length === 0 ? (
                      <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={2}>
                          {inventory.length === 0
                            ? "Aucun produit dans votre stock."
                            : "Aucun produit trouvé."}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View onLayout={(e) => recordSectionLayout("recipient", e)} />
              <FormInput label="Numéro destinataire" keyboardType="phone-pad" value={livPhone} onChangeText={setLivPhone} placeholder="6XXXXXXX" />
              <View>
                <View onLayout={(e) => recordSectionLayout("address", e)} />
                <FormInput
                  label="Quartier de livraison"
                  value={livQuartierQuery}
                  onChangeText={setLivQuartierQuery}
                  placeholder="Ex: Bastos"
                />
              </View>

              <FormInput
                label="Détail (optionnel)"
                value={livDeliveryLandmark}
                onChangeText={setLivDeliveryLandmark}
                placeholder="Ex: Face à la pharmacie, portail rouge"
              />

              <View>
                <View onLayout={(e) => recordSectionLayout("deliveryType", e)} />
                <RamassageFieldLabel>Type de livraison</RamassageFieldLabel>
                <ExpressToggleCard
                  value={livExpress === "yes"}
                  onChange={(next) => setLivExpress(next ? "yes" : "no")}
                  supplementXaf={expressFee ?? undefined}
                />
              </View>

              <View onLayout={(e) => recordSectionLayout("notes", e)} />
              <FormInput label="Instructions (optionnel)" multiline value={livNotes} onChangeText={setLivNotes} placeholder="Ex: appeler avant d'arriver, laisser au gardien..." />

              <View>
                <View onLayout={(e) => recordSectionLayout("payment", e)} />
                <RamassageFieldLabel>Y a-t-il de l&apos;argent à récupérer ?</RamassageFieldLabel>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={() => setLivCollectCash("yes")}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: radii.pill,
                      backgroundColor: livCollectCash === "yes" ? colors.primary : INPUT_BG,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 10,
                    }}
                  >
                    <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: livCollectCash === "yes" ? colors.white : colors.text }} numberOfLines={1}>
                      Oui
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setLivCollectCash("no");
                      setLivAmountDueText("");
                    }}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: radii.pill,
                      backgroundColor: livCollectCash === "no" ? colors.primary : INPUT_BG,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 10,
                    }}
                  >
                    <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: livCollectCash === "no" ? colors.white : colors.text }} numberOfLines={1}>
                      Non
                    </AppText>
                  </Pressable>
                </View>

                {livNeedsCashAmount ? (
                  <View style={{ marginTop: 12 }}>
                    <FormInput
                      label="Montant à encaisser"
                      keyboardType="number-pad"
                      value={livAmountDueText}
                      onChangeText={setLivAmountDueText}
                      placeholder="Ex: 5 000"
                      trailing={
                        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                          FCFA
                        </AppText>
                      }
                    />
                  </View>
                ) : null}
              </View>
            </View>
        </>
        )
      ) : isExpedition ? (
            <View style={{ gap: 20 }}>
          <View onLayout={(e) => recordSectionLayout("pickupAddress", e)} />
          <FormInput label="Ville de l'expédition" value={expVille} onChangeText={setExpVille} placeholder="Ex. Douala" />
          <FormInput label="Agence de voyage" value={expAgence} onChangeText={setExpAgence} placeholder="Ex. Général Express" />
          <FormInput label="Point de départ (adresse du client)" value={expPickupAddress} onChangeText={setExpPickupAddress} placeholder="Ex. Rue, repère, quartier…" />
          <View onLayout={(e) => recordSectionLayout("recipient", e)} />
          <FormInput label="Nom du destinataire" value={expNomDestinataire} onChangeText={setExpNomDestinataire} placeholder="Nom complet" autoCapitalize="words" />
          <FormInput label="Numéro de téléphone du destinataire" keyboardType="phone-pad" value={expTelephoneDestinataire} onChangeText={setExpTelephoneDestinataire} placeholder="6XXXXXX" />
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          <View onLayout={(e) => recordSectionLayout("pickupAddress", e)} />
          <FormInput
            label="Quartier de ramassage"
            value={pickupPickupQuartierQuery}
            onChangeText={setPickupPickupQuartierQuery}
            placeholder="Quartier de ramassage..."
          />
          <FormInput
            label="Détail"
            value={pickupPickupLandmark}
            onChangeText={setPickupPickupLandmark}
            placeholder="Ex: Bastos, face à la pharmacie"
          />

          <View onLayout={(e) => recordSectionLayout("deliveryAddress", e)} />
          <FormInput
            label="Quartier de livraison"
            value={pickupDropoffQuartierQuery}
            onChangeText={setPickupDropoffQuartierQuery}
            placeholder="Quartier de livraison..."
          />
          <FormInput
            label="Détail"
            value={pickupDropoffLandmark}
            onChangeText={setPickupDropoffLandmark}
            placeholder="Ex: Emombo, derrière la station"
          />

          <View style={[card.base, { padding: 20 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="solar:hand-shake-bold" size={28} color={"#B45309"} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={2} ellipsizeMode="tail">
                  Ramassage hors stock
                </AppText>
                <AppText variant="dense" style={{ marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.7)" }} numberOfLines={2}>
                  Le colis sera récupéré à votre adresse
                </AppText>
              </View>
              <View style={{ flexShrink: 0 }}>
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: "#B45309" }} numberOfLines={1}>
                  {formatSupplementFcfaLabel(pickupFee)}
                </AppText>
              </View>
            </View>
          </View>

          <View>
            <View onLayout={(e) => recordSectionLayout("deliveryType", e)} />
            <RamassageFieldLabel>Type de livraison</RamassageFieldLabel>
            <ExpressToggleCard
              value={pickupExpress === "yes"}
              onChange={(next) => setPickupExpress(next ? "yes" : "no")}
              supplementXaf={expressFee ?? undefined}
            />
          </View>

          <View onLayout={(e) => recordSectionLayout("items", e)} />
          <FormInput
            label="Description du colis"
            leadingIconName="solar:box-outline"
            leadingIconSize={24}
            value={pickupName}
            onChangeText={setPickupName}
            placeholder="Ex: iPhone 15 Pro, chaussures Nike..."
          />

          <FormInput label="Quantité" leadingIconName="solar:hashtag-outline" leadingIconSize={24} keyboardType="number-pad" value={pickupQty} onChangeText={(t) => setPickupQty(t.replace(/[^\d]/g, ""))} placeholder="1" />

          <View>
            <View onLayout={(e) => recordSectionLayout("payment", e)} />
            <RamassageFieldLabel>Y a-t-il de l&apos;argent à récupérer ?</RamassageFieldLabel>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setPickupCollectCash("yes")}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: radii.pill,
                  backgroundColor: pickupCollectCash === "yes" ? colors.primary : INPUT_BG,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                }}
              >
                <AppText
                  variant="dense"
                  style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: pickupCollectCash === "yes" ? colors.white : colors.muted }}
                  numberOfLines={1}
                >
                  Oui
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPickupCollectCash("no");
                  setPickupAmount("");
                }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: radii.pill,
                  backgroundColor: pickupCollectCash === "no" ? colors.primary : INPUT_BG,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                }}
              >
                <AppText
                  variant="dense"
                  style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: pickupCollectCash === "no" ? colors.white : colors.muted }}
                  numberOfLines={1}
                >
                  Non
                </AppText>
              </Pressable>
            </View>

            {pickupCollectCash === "yes" ? (
              <View style={{ marginTop: 12 }}>
                <FormInput
                  label="Montant à encaisser"
                  leadingIconName="solar:wallet-outline"
                  leadingIconSize={24}
                  keyboardType="number-pad"
                  value={pickupAmount}
                  onChangeText={(t) => setPickupAmount(t.replace(/[^\d]/g, ""))}
                  placeholder="Ex: 5 000"
                  trailing={
                    <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                      FCFA
                    </AppText>
                  }
                />
              </View>
            ) : null}
          </View>

          <FormInput label="Téléphone" keyboardType="phone-pad" value={pickupPhone} onChangeText={setPickupPhone} placeholder="6XXXXXXX" />
        </View>
      )}

      <View style={{ marginTop: 24 }}>
        <FormButton label="Continuer" disabled={!canContinuePickup} onPress={handleContinue} />
        {!canContinuePickup ? (
          <AppText
            variant="dense"
            style={{ marginTop: 8, textAlign: "center", fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.5)" }}
            numberOfLines={2}
          >
            Complétez tous les champs obligatoires pour continuer
          </AppText>
        ) : null}
      </View>

    </ScreenLayout>
  );
}
