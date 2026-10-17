/** Livraison express — masqué côté client tant que l’offre n’est pas activée. */
export const EXPRESS_DELIVERY_UI_ENABLED = false;

export function isExpressDeliveryUiEnabled(): boolean {
  return EXPRESS_DELIVERY_UI_ENABLED;
}
