import {
  computeUnreadState,
  mapInboxItemToConversationItem,
  mapTransactionToConversationItem,
  messageTimeMs,
  type UnreadState,
} from "@/lib/api/conversationUi";
import { getLocalReadAt, hydrateLocalReadStore } from "@/lib/api/localReadStore";
import {
  fetchTicketInbox,
  InboxEndpointUnavailableError,
  listClientTicketForTransaction,
  listTicketMessages,
  resolveNumericTransactionId,
  type TicketInboxItem,
  type TicketMessage,
  type TicketResponse,
} from "@/lib/api/tickets";
import {
  enrichConversationWithTicket,
  filterConversationsWithTickets,
  lastMessageFromList,
  pickClientTicket,
  sortConversationsByActivity,
  type EnrichedConversationItem,
} from "@/lib/api/ticketUi";
import { getTransactionNavigationId, listTransactions } from "@/lib/api/transactions";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export type TicketMeta = {
  ticket: TicketResponse;
  lastMessage: TicketMessage | null;
  isUnread: boolean;
  unreadCount: number;
};

/**
 * Unread from an inbox row: only the last message is known, so unreadCount is
 * 0 or 1 (one conversation). Local readAt wins over the coarse server flag.
 */
export function computeInboxItemUnread(
  item: TicketInboxItem,
  currentUserId: number | null,
  localReadAt: string | null,
): UnreadState {
  const last = item.lastMessage;
  if (!last) return { isUnread: false, unreadCount: 0 };
  if (currentUserId != null && last.senderId === currentUserId) return { isUnread: false, unreadCount: 0 };

  const isUnread =
    localReadAt != null
      ? messageTimeMs(last.createdAt) > messageTimeMs(localReadAt)
      : !item.ticket.isMessageRead;

  return { isUnread, unreadCount: isUnread ? 1 : 0 };
}

type InboxEntry = { keys: string[]; item: TicketInboxItem; meta: TicketMeta };

async function loadInboxEntries(currentUserId: number | null): Promise<InboxEntry[]> {
  const items = await fetchTicketInbox();
  await hydrateLocalReadStore(items.map((item) => String(item.transaction.id)));

  return items.map((item) => {
    const primaryKey = String(item.transaction.id);
    const ref = item.transaction.transactionReference;
    const localReadAt = getLocalReadAt(primaryKey) ?? (ref ? getLocalReadAt(ref) : null);
    const { isUnread, unreadCount } = computeInboxItemUnread(item, currentUserId, localReadAt);
    // Conversations are keyed by navigation id (numeric id, or reference as
    // fallback) — register both so lookups match either form.
    const keys = ref && ref !== primaryKey ? [primaryKey, ref] : [primaryKey];
    return { keys, item, meta: { ticket: item.ticket, lastMessage: item.lastMessage, isUnread, unreadCount } };
  });
}

/** Cap on parallel ticket/message requests in the legacy N+1 fallback. */
const FETCH_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
  return results;
}

/** Legacy per-transaction fan-out — used until the gateway serves /api/tickets/inbox. */
export async function loadClientTicketsByNavIdLegacy(
  txns: Awaited<ReturnType<typeof listTransactions>>,
  currentUserId: number | null,
): Promise<Map<string, TicketMeta>> {
  const entries = await mapWithConcurrency(txns, FETCH_CONCURRENCY, async (tx) => {
    const navId = getTransactionNavigationId(tx);
    const numericId = resolveNumericTransactionId(tx);
    if (!navId || !numericId) return null;
    try {
      const tickets = await listClientTicketForTransaction(numericId);
      const ticket = pickClientTicket(tickets);
      if (!ticket) return null;
      const messages = await listTicketMessages(ticket.id);
      const localReadAt = getLocalReadAt(navId);
      const { isUnread, unreadCount } = computeUnreadState(messages, currentUserId, ticket, localReadAt);
      return [navId, { ticket, lastMessage: lastMessageFromList(messages), isUnread, unreadCount }] as const;
    } catch {
      return null;
    }
  });
  return new Map(entries.filter((e): e is [string, TicketMeta] => e != null));
}

export async function loadClientTicketsByNavId(
  txns: Awaited<ReturnType<typeof listTransactions>>,
  currentUserId: number | null,
): Promise<Map<string, TicketMeta>> {
  try {
    const entries = await loadInboxEntries(currentUserId);
    const map = new Map<string, TicketMeta>();
    for (const { keys, meta } of entries) {
      for (const key of keys) map.set(key, meta);
    }
    return map;
  } catch (e: unknown) {
    if (e instanceof InboxEndpointUnavailableError) {
      return loadClientTicketsByNavIdLegacy(txns, currentUserId);
    }
    throw e;
  }
}

/** Sums per-conversation unread; metas registered under several keys count once. */
export function totalUnreadFrom(ticketMap: Map<string, TicketMeta>): number {
  let sum = 0;
  const seen = new Set<TicketMeta>();
  for (const meta of ticketMap.values()) {
    if (seen.has(meta)) continue;
    seen.add(meta);
    sum += meta.unreadCount;
  }
  return sum;
}

export type ConversationListResult = {
  items: EnrichedConversationItem[];
  totalUnread: number;
};

/**
 * Conversations list in one request via /api/tickets/inbox; falls back to the
 * legacy listTransactions + per-order fan-out until the endpoint is deployed.
 * Server pre-sorts inbox rows by last activity — no client re-sort on that path.
 */
export async function loadConversationList(): Promise<ConversationListResult> {
  const userId = await getCurrentUserId();

  try {
    const entries = await loadInboxEntries(userId);
    const items: EnrichedConversationItem[] = [];
    let totalUnread = 0;
    for (const { item, meta } of entries) {
      const card = mapInboxItemToConversationItem(item);
      if (!card) continue;
      totalUnread += meta.unreadCount;
      items.push(
        enrichConversationWithTicket(card, meta.ticket, meta.lastMessage, {
          currentUserId: userId,
          isUnread: meta.isUnread,
          unreadCount: meta.unreadCount,
        }),
      );
    }
    return { items, totalUnread };
  } catch (e: unknown) {
    if (!(e instanceof InboxEndpointUnavailableError)) throw e;
  }

  const txns = await listTransactions({ limit: 200 });
  const navIds = txns
    .map((tx) => getTransactionNavigationId(tx))
    .filter((navId): navId is string => Boolean(navId));
  await hydrateLocalReadStore(navIds);
  const ticketMap = await loadClientTicketsByNavIdLegacy(txns, userId);

  const items = txns
    .map((tx) => mapTransactionToConversationItem(tx))
    .filter((card): card is NonNullable<typeof card> => card != null)
    .map((card) => {
      const meta = ticketMap.get(card.id);
      if (!meta) return null;
      return enrichConversationWithTicket(card, meta.ticket, meta.lastMessage, {
        currentUserId: userId,
        isUnread: meta.isUnread,
        unreadCount: meta.unreadCount,
      });
    })
    .filter((item): item is EnrichedConversationItem => item != null);

  return {
    items: sortConversationsByActivity(filterConversationsWithTickets(items)),
    totalUnread: totalUnreadFrom(ticketMap),
  };
}

/** Full unread recount — used by the tab badge at app start and on message push. */
export async function computeTotalUnreadCount(): Promise<number> {
  const userId = await getCurrentUserId();

  try {
    const entries = await loadInboxEntries(userId);
    return entries.reduce((sum, entry) => sum + entry.meta.unreadCount, 0);
  } catch (e: unknown) {
    if (!(e instanceof InboxEndpointUnavailableError)) throw e;
  }

  const txns = await listTransactions({ limit: 200 });
  const navIds = txns
    .map((tx) => getTransactionNavigationId(tx))
    .filter((navId): navId is string => Boolean(navId));
  await hydrateLocalReadStore(navIds);
  const ticketMap = await loadClientTicketsByNavIdLegacy(txns, userId);
  return totalUnreadFrom(ticketMap);
}
