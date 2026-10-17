import {
  computeInboxItemUnread,
  computeTotalUnreadCount,
  loadClientTicketsByNavId,
  loadConversationList,
  totalUnreadFrom,
} from "@/lib/api/inbox";
import { resetLocalReadStoreForTests, setLocalReadAt } from "@/lib/api/localReadStore";
import {
  fetchTicketInbox,
  InboxEndpointUnavailableError,
  listClientTicketForTransaction,
  listTicketMessages,
  resolveNumericTransactionId,
  type TicketInboxItem,
} from "@/lib/api/tickets";
import { listTransactions } from "@/lib/api/transactions";
import { getCurrentUserId } from "@/lib/auth/currentUser";

jest.mock("@/lib/api/tickets", () => {
  const actual = jest.requireActual("@/lib/api/tickets");
  return {
    ...actual,
    fetchTicketInbox: jest.fn(),
    listClientTicketForTransaction: jest.fn(),
    listTicketMessages: jest.fn(),
    resolveNumericTransactionId: jest.fn(),
  };
});

jest.mock("@/lib/api/transactions", () => {
  const actual = jest.requireActual("@/lib/api/transactions");
  return {
    ...actual,
    listTransactions: jest.fn(),
  };
});

jest.mock("@/lib/auth/currentUser", () => ({
  getCurrentUserId: jest.fn(),
}));

const ME = 3;
const AGENT = 7;

function inboxItem(overrides: Partial<TicketInboxItem> = {}): TicketInboxItem {
  return {
    ticket: {
      id: 12,
      channel: "client",
      status: "open",
      createdAt: "2026-06-14T10:00:00",
      lastUpdatedAt: "2026-07-04T09:12:00",
      isMessageRead: false,
      assignedAgent: null,
      createdBy: ME,
      transaction: 345,
    },
    transaction: {
      id: 345,
      transactionReference: "LVS-2026-00345",
      clientName: "Marie Dupont",
      driverName: null,
      status: "processing",
      type: "delivery",
      neighborhoodLabel: "Bastos",
      departureLabel: "Centre",
      destinationLabel: "Bastos",
      routeLabel: "Centre → Bastos",
      packageName: "Colis fragile",
      amountDue: 15000,
      clientPhone: "677001122",
      driverPhone: null,
    },
    lastMessage: { id: 9001, content: "En route.", ticketId: 12, senderId: AGENT, createdAt: "2026-07-04T09:12:00" },
    messageCount: 14,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocalReadStoreForTests();
  (getCurrentUserId as jest.Mock).mockResolvedValue(ME);
});

describe("computeInboxItemUnread", () => {
  it("is read when there is no message", () => {
    expect(computeInboxItemUnread(inboxItem({ lastMessage: null }), ME, null)).toEqual({
      isUnread: false,
      unreadCount: 0,
    });
  });

  it("is read when the last message is mine", () => {
    const item = inboxItem();
    item.lastMessage!.senderId = ME;
    expect(computeInboxItemUnread(item, ME, null).isUnread).toBe(false);
  });

  it("falls back to the server flag without a local readAt", () => {
    expect(computeInboxItemUnread(inboxItem(), ME, null).isUnread).toBe(true);
    const read = inboxItem();
    read.ticket.isMessageRead = true;
    expect(computeInboxItemUnread(read, ME, null).isUnread).toBe(false);
  });

  it("local readAt wins over the server flag", () => {
    const item = inboxItem();
    item.ticket.isMessageRead = true;
    expect(computeInboxItemUnread(item, ME, "2026-07-04T08:00:00").isUnread).toBe(true);
    expect(computeInboxItemUnread(item, ME, "2026-07-04T10:00:00").isUnread).toBe(false);
  });
});

describe("loadClientTicketsByNavId", () => {
  it("uses the inbox endpoint and keys by transaction id and reference", async () => {
    (fetchTicketInbox as jest.Mock).mockResolvedValue([inboxItem()]);

    const map = await loadClientTicketsByNavId([], ME);

    expect(fetchTicketInbox).toHaveBeenCalledTimes(1);
    expect(listClientTicketForTransaction).not.toHaveBeenCalled();
    expect(map.get("345")).toBeDefined();
    expect(map.get("LVS-2026-00345")).toBe(map.get("345"));
    expect(map.get("345")!.isUnread).toBe(true);
  });

  it("respects a local readAt stamped under the navigation id", async () => {
    setLocalReadAt("345", "2026-07-05T00:00:00.000Z");
    (fetchTicketInbox as jest.Mock).mockResolvedValue([inboxItem()]);

    const map = await loadClientTicketsByNavId([], ME);

    expect(map.get("345")!.isUnread).toBe(false);
  });

  it("falls back to the per-transaction fan-out when the endpoint is unavailable", async () => {
    (fetchTicketInbox as jest.Mock).mockRejectedValue(new InboxEndpointUnavailableError());
    (resolveNumericTransactionId as jest.Mock).mockReturnValue(345);
    (listClientTicketForTransaction as jest.Mock).mockResolvedValue([inboxItem().ticket]);
    (listTicketMessages as jest.Mock).mockResolvedValue([inboxItem().lastMessage]);

    const txns = [{ id: 345, transactionReference: "LVS-2026-00345" }] as any;
    const map = await loadClientTicketsByNavId(txns, ME);

    expect(listClientTicketForTransaction).toHaveBeenCalledWith(345);
    expect(map.get("345")!.isUnread).toBe(true);
  });

  it("propagates non-fallback errors", async () => {
    (fetchTicketInbox as jest.Mock).mockRejectedValue(new Error("HTTP 500"));

    await expect(loadClientTicketsByNavId([], ME)).rejects.toThrow("HTTP 500");
    expect(listClientTicketForTransaction).not.toHaveBeenCalled();
  });
});

describe("totalUnreadFrom", () => {
  it("counts a meta registered under several keys once", async () => {
    (fetchTicketInbox as jest.Mock).mockResolvedValue([inboxItem()]);
    const map = await loadClientTicketsByNavId([], ME);

    expect(totalUnreadFrom(map)).toBe(1);
  });
});

describe("loadConversationList", () => {
  it("builds the full list from the inbox endpoint alone", async () => {
    (fetchTicketInbox as jest.Mock).mockResolvedValue([inboxItem()]);

    const { items, totalUnread } = await loadConversationList();

    expect(listTransactions).not.toHaveBeenCalled();
    expect(totalUnread).toBe(1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "345",
      refLabel: "REF: LVS-2026-00345",
      type: "livraison",
      title: "Colis Fragile",
      locationLine: "Bastos",
      amountXaf: 15000,
      ticketId: 12,
      isUnread: true,
      subtitle: "Nouveau message",
    });
  });

  it("maps expedition rows with the route label", async () => {
    const item = inboxItem();
    item.transaction = { ...item.transaction, type: "expedition" };
    (fetchTicketInbox as jest.Mock).mockResolvedValue([item]);

    const { items } = await loadConversationList();

    expect(items[0]).toMatchObject({ type: "expedition", locationLine: "Centre → Bastos" });
  });

  it("falls back to the legacy pipeline when the endpoint is unavailable", async () => {
    (fetchTicketInbox as jest.Mock).mockRejectedValue(new InboxEndpointUnavailableError());
    (listTransactions as jest.Mock).mockResolvedValue([
      { id: 345, transactionReference: "LVS-2026-00345", package_name: "Colis fragile", type: "delivery" },
    ]);
    (resolveNumericTransactionId as jest.Mock).mockReturnValue(345);
    (listClientTicketForTransaction as jest.Mock).mockResolvedValue([inboxItem().ticket]);
    (listTicketMessages as jest.Mock).mockResolvedValue([inboxItem().lastMessage]);

    const { items, totalUnread } = await loadConversationList();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "345", ticketId: 12, isUnread: true });
    expect(totalUnread).toBe(1);
  });
});

describe("computeTotalUnreadCount", () => {
  it("sums unread conversations from the inbox endpoint", async () => {
    const second = inboxItem();
    second.transaction = {
      ...second.transaction,
      id: 400,
      transactionReference: null,
    };
    second.ticket = { ...second.ticket, id: 13 };
    second.lastMessage = { ...second.lastMessage!, ticketId: 13, senderId: ME };
    (fetchTicketInbox as jest.Mock).mockResolvedValue([inboxItem(), second]);

    expect(await computeTotalUnreadCount()).toBe(1);
    expect(listTransactions).not.toHaveBeenCalled();
  });

  it("falls back to the fan-out when the endpoint is unavailable", async () => {
    (fetchTicketInbox as jest.Mock).mockRejectedValue(new InboxEndpointUnavailableError());
    (listTransactions as jest.Mock).mockResolvedValue([{ id: 345 }]);
    (resolveNumericTransactionId as jest.Mock).mockReturnValue(345);
    (listClientTicketForTransaction as jest.Mock).mockResolvedValue([inboxItem().ticket]);
    (listTicketMessages as jest.Mock).mockResolvedValue([inboxItem().lastMessage]);

    expect(await computeTotalUnreadCount()).toBe(1);
    expect(listTransactions).toHaveBeenCalledTimes(1);
  });
});
