import type { TransactionCardItem } from "@/components/TransactionCard";
import { getTransactionNavigationId, type Transaction } from "@/lib/api/transactions";
import type { TicketInboxItem, TicketMessage, TicketResponse } from "@/lib/api/tickets";
import { formatTransactionRef, isExpeditionType } from "@/lib/api/transactionUi";
import { formatDbText } from "@/lib/formatDisplayText";

export type UnreadState = {
  isUnread: boolean;
  unreadCount: number;
};

export function messageTimeMs(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * Derives unread badge state from the full message list and local read timestamp.
 * Uses isMessageRead only when localReadAt is absent (fresh install / cache miss).
 */
export function computeUnreadState(
  messages: TicketMessage[],
  currentUserId: number | null,
  ticket: TicketResponse,
  localReadAt: string | null,
): UnreadState {
  if (currentUserId == null) {
    const fallbackUnread = !ticket.isMessageRead;
    return { isUnread: fallbackUnread, unreadCount: fallbackUnread ? 1 : 0 };
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.senderId === currentUserId);
  const cutoffMs = lastUserMsg ? messageTimeMs(lastUserMsg.createdAt) : null;
  const incomingAfterReply = messages.filter(
    (m) =>
      m.senderId !== currentUserId &&
      (cutoffMs == null || messageTimeMs(m.createdAt) > cutoffMs),
  );

  const readAtMs = localReadAt ? messageTimeMs(localReadAt) : null;
  const trulyUnread =
    readAtMs != null
      ? incomingAfterReply.filter((m) => messageTimeMs(m.createdAt) > readAtMs)
      : incomingAfterReply;

  const lastUnread = trulyUnread.at(-1);
  const isUnread = lastUnread != null && (readAtMs != null ? true : !ticket.isMessageRead);

  return {
    isUnread,
    unreadCount: isUnread ? trulyUnread.length : 0,
  };
}

export type ConversationBase = {
  id: string;
  refLabel: string;
  timeLabel: string;
  metaLine?: string;
  title: string;
  locationLine?: string;
  subtitle: string;
  unreadCount?: number;
  isUnread?: boolean;
  amountXaf?: number | null;
};

export type ConversationLivraisonItem = ConversationBase & {
  type: "livraison";
};

export type ConversationExpeditionItem = ConversationBase & {
  type: "expedition";
  agence?: string;
};

export type ConversationItem = ConversationLivraisonItem | ConversationExpeditionItem;

export function mapConversationToTransactionCardItem(item: ConversationItem): TransactionCardItem {
  const isUnread = Boolean(item.isUnread || item.unreadCount);
  const location = item.locationLine?.trim() || "";

  return {
    id: item.id,
    // WhatsApp-style card: quartier as headline, last message as preview,
    // no order reference and no product line.
    title: location || item.title,
    quartier: "—",
    dateLabel: item.timeLabel,
    status: "En cours",
    statusLabel: isUnread ? `${item.unreadCount ?? 1} NON LU${(item.unreadCount ?? 1) > 1 ? "S" : ""}` : "MESSAGES",
    paymentLabel: item.subtitle,
    serviceLabel: item.type === "expedition" ? "Expédition" : "Livraison",
    isExpedition: item.type === "expedition",
  };
}

function productTitleFromTransaction(tx: Transaction): string {
  const qty = Number.isFinite(Number(tx.quantity)) ? Math.max(1, Math.floor(Number(tx.quantity))) : 1;
  const titleBase = formatDbText(tx.package_name) || "Colis";
  return qty > 1 && !titleBase.toLowerCase().includes("x") ? `${titleBase} x${qty}` : titleBase;
}

function quartierFromTransaction(tx: Transaction): string {
  const street =
    typeof tx.destination?.street === "string"
      ? tx.destination.street
      : String(tx.destination_street ?? "").trim();
  const fromStreet = street.split("—")[0]?.trim() || street.trim();
  return fromStreet.length ? formatDbText(fromStreet) : "—";
}

function messagePreviewFromTransaction(tx: Transaction, title: string): string {
  const description = formatDbText(tx.description);
  if (description.length && description.toLowerCase() !== title.toLowerCase()) {
    return description;
  }
  return "Ouvrir la conversation";
}

function timeLabelFromIso(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export function mapTransactionToConversationItem(tx: Transaction): ConversationItem | null {
  const id = getTransactionNavigationId(tx);
  if (!id) return null;

  const ref = formatTransactionRef(tx);
  const title = productTitleFromTransaction(tx);
  const amountXaf = Number.isFinite(Number(tx.amount)) ? Math.max(0, Math.round(Number(tx.amount))) : null;
  const timeLabel = timeLabelFromIso(tx.created_at);
  const subtitle = messagePreviewFromTransaction(tx, title);

  if (isExpeditionType(tx.type)) {
    const from = formatDbText(tx.departure?.city) || "—";
    const to = formatDbText(tx.destination?.city) || "—";
    const agence = formatDbText(tx.departure?.region);
    const trajet = `${from} → ${to}`;
    return {
      id,
      refLabel: `REF: ${ref}`,
      timeLabel,
      type: "expedition",
      title,
      locationLine: agence.length ? `${trajet} · ${agence}` : trajet,
      amountXaf,
      subtitle,
    };
  }

  return {
    id,
    refLabel: `REF: ${ref}`,
    timeLabel,
    type: "livraison",
    title,
    locationLine: quartierFromTransaction(tx),
    amountXaf,
    subtitle,
  };
}

/**
 * Card item built from one inbox row alone (no listTransactions call).
 * timeLabel/subtitle are placeholders — enrichConversationWithTicket
 * overrides both from the ticket and last message.
 */
export function mapInboxItemToConversationItem(item: TicketInboxItem): ConversationItem | null {
  const tx = item.transaction;
  if (!Number.isFinite(tx.id) || tx.id <= 0) return null;

  const id = String(tx.id);
  const ref = tx.transactionReference ?? `TR-${tx.id}`;
  const base = {
    id,
    refLabel: `REF: ${ref}`,
    timeLabel: "—",
    title: formatDbText(tx.packageName) || "Colis",
    amountXaf: tx.amountDue,
    subtitle: "",
  };

  if (isExpeditionType(tx.type ?? undefined)) {
    const trajet =
      formatDbText(tx.routeLabel) ||
      [tx.departureLabel, tx.destinationLabel]
        .map((part) => formatDbText(part))
        .filter(Boolean)
        .join(" → ");
    return {
      ...base,
      type: "expedition",
      locationLine: trajet.length ? trajet : undefined,
    };
  }

  return {
    ...base,
    type: "livraison",
    locationLine: formatDbText(tx.neighborhoodLabel) || undefined,
  };
}

export function conversationSearchText(item: ConversationItem): string {
  return [
    item.refLabel,
    item.metaLine,
    item.title,
    item.locationLine,
    item.subtitle,
    item.type === "expedition" ? item.agence : undefined,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
