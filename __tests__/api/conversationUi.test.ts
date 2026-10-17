import {
  computeUnreadState,
  mapConversationToTransactionCardItem,
  mapTransactionToConversationItem,
} from "@/lib/api/conversationUi";
import type { Transaction } from "@/lib/api/transactions";
import type { TicketMessage, TicketResponse } from "@/lib/api/tickets";

const ticket: TicketResponse = {
  id: 12,
  channel: "client",
  status: "open",
  createdAt: "2026-06-14T08:00:00.000Z",
  lastUpdatedAt: "2026-06-14T12:00:00.000Z",
  isMessageRead: true,
  assignedAgent: 5,
  createdBy: 3,
  transaction: 1001,
};

const supportMsg = (id: number, createdAt: string, content = "Support"): TicketMessage => ({
  id,
  content,
  ticketId: 12,
  senderId: 5,
  createdAt,
});

const userMsg = (id: number, createdAt: string, content = "User"): TicketMessage => ({
  id,
  content,
  ticketId: 12,
  senderId: 3,
  createdAt,
});

const baseTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  package_name: "Sac",
  type: "delivery",
  status: "pending",
  transactionReference: "LVS-AAAA111111",
  user_id: 3,
  amount: 0,
  destination: { street: "Makepe — Yaoundé" },
  description: "Sac x1",
  ...overrides,
});

describe("mapTransactionToConversationItem", () => {
  it("uses package_name as title for livraison (not quartier)", () => {
    const item = mapTransactionToConversationItem(
      baseTx({
        package_name: "2 robes + 1 sac",
        description: "2 robes + 1 sac",
        destination: { street: "Makepe" },
      }),
    );

    expect(item?.title).toBe("2 Robes + 1 Sac");
    expect(item?.locationLine).toBe("Makepe");
    expect(item?.type).toBe("livraison");
  });

  it("appends quantity to title when qty > 1", () => {
    const item = mapTransactionToConversationItem(
      baseTx({ package_name: "Robe", quantity: 3, destination: { street: "Bastos" } }),
    );

    expect(item?.title).toBe("Robe x3");
  });

  it("uses package_name as title for expedition with trajet as locationLine", () => {
    const item = mapTransactionToConversationItem(
      baseTx({
        type: "expedition",
        package_name: "Colis fragile",
        departure: { city: "Yaoundé", region: "Buca Voyage" },
        destination: { city: "Douala" },
      }),
    );

    expect(item?.title).toBe("Colis Fragile");
    expect(item?.locationLine).toBe("Yaoundé → Douala · Buca Voyage");
    expect(item?.type).toBe("expedition");
  });

  it("returns null when transaction has no navigation id", () => {
    expect(mapTransactionToConversationItem(baseTx({ transactionReference: undefined, id: undefined }))).toBeNull();
  });
});

describe("computeUnreadState", () => {
  it("detects new support messages after localReadAt even when isMessageRead stays true", () => {
    const messages = [
      supportMsg(1, "2026-06-14T10:00:00.000Z"),
      userMsg(2, "2026-06-14T10:05:00.000Z"),
      supportMsg(3, "2026-06-14T10:10:00.000Z"),
    ];
    const state = computeUnreadState(messages, 3, ticket, "2026-06-14T10:06:00.000Z");
    expect(state.isUnread).toBe(true);
    expect(state.unreadCount).toBe(1);
  });

  it("returns read when all incoming messages are before localReadAt", () => {
    const messages = [
      supportMsg(1, "2026-06-14T10:00:00.000Z"),
      userMsg(2, "2026-06-14T10:05:00.000Z"),
      supportMsg(3, "2026-06-14T10:07:00.000Z"),
    ];
    const state = computeUnreadState(messages, 3, ticket, "2026-06-14T10:08:00.000Z");
    expect(state.isUnread).toBe(false);
    expect(state.unreadCount).toBe(0);
  });

  it("falls back to isMessageRead when localReadAt is null", () => {
    const messages = [supportMsg(1, "2026-06-14T10:00:00.000Z")];
    expect(computeUnreadState(messages, 3, { ...ticket, isMessageRead: false }, null)).toEqual({
      isUnread: true,
      unreadCount: 1,
    });
    expect(computeUnreadState(messages, 3, ticket, null)).toEqual({
      isUnread: false,
      unreadCount: 0,
    });
  });

  it("counts multiple unread support messages since last open", () => {
    const messages = [
      userMsg(1, "2026-06-14T10:00:00.000Z"),
      supportMsg(2, "2026-06-14T10:10:00.000Z"),
      supportMsg(3, "2026-06-14T10:11:00.000Z"),
    ];
    const state = computeUnreadState(messages, 3, ticket, "2026-06-14T10:05:00.000Z");
    expect(state.isUnread).toBe(true);
    expect(state.unreadCount).toBe(2);
  });
});

describe("mapConversationToTransactionCardItem", () => {
  it("maps conversation list rows to TransactionCard fields", () => {
    const card = mapConversationToTransactionCardItem({
      id: "1001",
      refLabel: "REF: LVS-1",
      timeLabel: "il y a 2 h",
      type: "livraison",
      title: "Sac x2",
      locationLine: "Akwa",
      subtitle: "Support : Le coursier arrive",
      isUnread: true,
      unreadCount: 1,
    });

    expect(card.ref).toBeUndefined();
    expect(card.title).toBe("Akwa");
    expect(card.quartier).toBe("—");
    expect(card.dateLabel).toBe("il y a 2 h");
    expect(card.statusLabel).toBe("1 NON LU");
    expect(card.paymentLabel).toBe("Support : Le coursier arrive");
    expect(card.serviceLabel).toBe("Livraison");
  });

  it("shows plural count when multiple unread messages", () => {
    const card = mapConversationToTransactionCardItem({
      id: "1001",
      refLabel: "REF: LVS-1",
      timeLabel: "il y a 2 h",
      type: "livraison",
      title: "Sac x2",
      locationLine: "Akwa",
      subtitle: "Support : Le coursier arrive",
      isUnread: true,
      unreadCount: 3,
    });
    expect(card.statusLabel).toBe("3 NON LUS");
  });

  it("shows MESSAGES when read", () => {
    const card = mapConversationToTransactionCardItem({
      id: "1001",
      refLabel: "REF: LVS-1",
      timeLabel: "il y a 2 h",
      type: "livraison",
      title: "Sac x2",
      locationLine: "Akwa",
      subtitle: "Vous : Mon colis est prêt",
      isUnread: false,
    });
    expect(card.statusLabel).toBe("MESSAGES");
  });
});
