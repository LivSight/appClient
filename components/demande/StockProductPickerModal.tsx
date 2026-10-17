import { useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppScrollView from "@/components/AppScrollView";
import AppText from "@/components/AppText";
import AppTextInput from "@/components/AppTextInput";
import FormButton from "@/components/FormButton";
import SolarIcon from "@/components/SolarIcon";
import StockCartList from "@/components/demande/StockCartList";
import { filterInventoryByName, isAutocompleteQueryReady } from "@/lib/formAutocomplete";
import { inventoryExcludingCart } from "@/lib/stockCartPicker";
import {
  addOrIncrementCartItem,
  cartQtyForItem,
  type StockInventoryItem,
} from "@/lib/transactions/stockCartHelpers";
import type { StockCartItem } from "@/lib/transactions/transactionFormValidation";
import { colors, fonts, typography } from "@/theme/tokens";

const INPUT_BG = "#F3F4F5";
const INPUT_RADIUS = 24;
const PH = "rgba(60,74,60,0.4)";

type Props = {
  visible: boolean;
  cart: StockCartItem[];
  inventory: StockInventoryItem[];
  inventoryLoading: boolean;
  inventoryError: string | null;
  onClose: () => void;
  onChangeCart: (next: StockCartItem[]) => void;
};

export default function StockProductPickerModal({
  visible,
  cart,
  inventory,
  inventoryLoading,
  inventoryError,
  onClose,
  onChangeCart,
}: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const filteredStock = useMemo(
    () => inventoryExcludingCart(filterInventoryByName(inventory, search), cart),
    [inventory, search, cart],
  );
  const pickerVisible = focused && isAutocompleteQueryReady(search);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top + 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 }}>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 44, minHeight: 44, justifyContent: "center" }}>
            <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 16, lineHeight: 24, fontFamily: fonts.bodySemi, color: colors.text, textAlign: "center" }} numberOfLines={1}>
              Choisir des produits
            </AppText>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <AppScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <StockCartList cart={cart} inventory={inventory} onChange={onChangeCart} />

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
              marginTop: cart.length ? 10 : 0,
            }}
          >
            <SolarIcon name="solar:magnifer-outline" size={24} color="rgba(60,74,60,0.45)" />
            <AppTextInput
              value={search}
              onChangeText={setSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder={cart.length ? "Ajouter un autre produit..." : "Rechercher un produit (2 lettres min.)"}
              placeholderTextColor={PH}
              style={{ ...typography.bodyRegular, fontSize: 14, lineHeight: 20, flex: 1, color: colors.text }}
            />
          </View>

          {focused && search.trim().length === 1 ? (
            <AppText
              variant="dense"
              style={{ marginTop: 8, fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
              numberOfLines={2}
            >
              Saisissez au moins 2 caractères pour voir les produits.
            </AppText>
          ) : null}

          {pickerVisible ? (
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
                ? filteredStock.slice(0, 8).map((it) => (
                    <Pressable
                      key={it.id}
                      onPress={() => {
                        onChangeCart(addOrIncrementCartItem(cart, it, it.stockAvailable));
                        setSearch("");
                        setFocused(false);
                        Keyboard.dismiss();
                      }}
                      disabled={it.stockAvailable <= 0 || cartQtyForItem(cart, it.id) >= it.stockAvailable}
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
                        <SolarIcon name="solar:box-outline" size={24} color="rgba(25,28,29,0.75)" />
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
              {!inventoryLoading && !inventoryError && filteredStock.length === 0 ? (
                <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                  <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={2}>
                    {inventory.length === 0 ? "Aucun produit dans votre stock." : "Aucun produit trouvé."}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <FormButton label="Valider la sélection" onPress={onClose} />
          </View>
        </AppScrollView>
      </View>
    </Modal>
  );
}
