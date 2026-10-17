import { View, Pressable } from "react-native";
import AppText from "@/components/AppText";
import {
  removeCartItem,
  updateCartItemQty,
  type StockInventoryItem,
} from "@/lib/transactions/stockCartHelpers";
import type { StockCartItem } from "@/lib/transactions/transactionFormValidation";
import { colors, fonts, radii } from "@/theme/tokens";

const INPUT_BG = "#F3F4F5";

type Props = {
  cart: StockCartItem[];
  inventory: StockInventoryItem[];
  onChange: (next: StockCartItem[]) => void;
  compact?: boolean;
};

export default function StockCartList({ cart, inventory, onChange, compact = false }: Props) {
  if (!cart.length) return null;

  const visibleCart = compact ? cart.slice(0, 2) : cart;

  return (
    <View style={{ marginTop: compact ? 0 : 8, gap: 6 }}>
      {visibleCart.map((cartItem) => {
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
                {inv && !compact ? (
                  <AppText
                    variant="dense"
                    style={{ marginTop: 2, fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyRegular, color: "rgba(60,74,60,0.65)" }}
                    numberOfLines={1}
                  >
                    {inv.stockLabel}
                  </AppText>
                ) : null}
              </View>
              {!compact ? (
                <Pressable onPress={() => onChange(removeCartItem(cart, cartItem.id))} hitSlop={8}>
                  <AppText variant="dense" style={{ fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyBold, color: "#B91C1C" }} numberOfLines={1}>
                    Retirer
                  </AppText>
                </Pressable>
              ) : (
                <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary }} numberOfLines={1}>
                  x{cartItem.qty}
                </AppText>
              )}
            </View>
            {!compact ? (
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
            ) : null}
          </View>
        );
      })}
      {compact && cart.length > 2 ? (
        <AppText variant="dense" style={{ fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: "rgba(60,74,60,0.65)" }} numberOfLines={1}>
          +{cart.length - 2} autre{cart.length - 2 > 1 ? "s" : ""} produit{cart.length - 2 > 1 ? "s" : ""}
        </AppText>
      ) : null}
    </View>
  );
}
