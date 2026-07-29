import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "@/components/AppText";
import AppTextInput from "@/components/AppTextInput";
import HeroGridBackground from "@/components/HeroGridBackground";
import SolarIcon from "@/components/SolarIcon";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { getTransactionById, type Transaction } from "@/lib/api/transactions";
import { setLocalReadAt } from "@/lib/api/localReadStore";
import {
  formatMessageMeta,
  formatMessageTime,
  lastMessageFromList,
  messageSideForSender,
} from "@/lib/api/ticketUi";
import {
  loadClientThread,
  resolveNumericTransactionIdFromRoute,
  sendClientMessage,
  type TicketMessage,
} from "@/lib/api/tickets";
import {
  formatTransactionAmountLabel,
  formatTransactionRef,
  inboxCategoryBannerLabel,
  isCollectingCash,
} from "@/lib/api/transactionUi";
import { colors, fonts, radii, spacing, typography } from "@/theme/tokens";

type TxInfo = {
  ref: string;
  status: string;
  statusColor: string;
  statusBg: string;
  type: string;
  location: string;
  amountLabel?: string;
};

function mapBackendStatusToBanner(status?: string | null) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "delivered" || s === "completed") return { status: "LIVRÉ", statusColor: colors.statusDeliveredFg, statusBg: colors.statusDeliveredBg };
  if (s === "failed" || s === "cancelled" || s === "canceled") return { status: "ANNULÉ", statusColor: colors.statusCancelledFg, statusBg: colors.statusCancelledBg };
  return { status: "EN COURS", statusColor: colors.primary, statusBg: colors.statusPendingBg };
}

function mapTransactionToTxInfo(tx: Transaction): TxInfo {
  const ref = formatTransactionRef(tx);
  const { status, statusColor, statusBg } = mapBackendStatusToBanner(typeof tx.status === "string" ? tx.status : null);
  const typeRaw = String(tx.type ?? "").toLowerCase();
  const typeLabel = inboxCategoryBannerLabel(tx);

  const location =
    typeRaw === "expedition"
      ? `${tx.departure?.city?.trim() || "—"} → ${tx.destination?.city?.trim() || "—"}`
      : tx.destination?.street?.trim() || "—";

  return {
    ref,
    status,
    statusColor,
    statusBg,
    type: typeLabel,
    location,
    amountLabel: isCollectingCash(tx) ? formatTransactionAmountLabel(tx.amount) : undefined,
  };
}

function TransactionBanner({ tx, onPress }: { tx: TxInfo; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginHorizontal: -spacing.screenPaddingX,
        paddingHorizontal: spacing.screenPaddingX,
        paddingVertical: 12,
        backgroundColor: "rgba(14,165,233,0.06)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(14,165,233,0.14)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <AppText
            variant="dense"
            style={{ fontSize: 11, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.8 }}
            numberOfLines={1}
          >
            REF {tx.ref}
          </AppText>
          <AppText
            variant="dense"
            style={{ fontSize: 11, lineHeight: 16, fontFamily: fonts.bodyBold, color: "rgba(60,74,60,0.5)" }}
            numberOfLines={1}
          >
            {tx.type}
          </AppText>
          <AppText
            variant="dense"
            style={{ fontSize: 11, lineHeight: 16, fontFamily: fonts.bodySemi, color: colors.text }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {tx.location}
          </AppText>
        </View>
        {tx.amountLabel ? (
          <AppText
            variant="dense"
            style={{ fontSize: 11, lineHeight: 16, fontFamily: fonts.bodyBold, color: colors.text, marginTop: 2 }}
            numberOfLines={1}
          >
            À collecter : {tx.amountLabel}
          </AppText>
        ) : null}
      </View>

      <View
        style={{
          minHeight: 24,
          borderRadius: radii.pill,
          backgroundColor: tx.statusBg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          flexShrink: 0,
        }}
      >
        <AppText
          variant="dense"
          style={{ fontSize: 10, lineHeight: 16, fontFamily: fonts.bodyBold, color: tx.statusColor, letterSpacing: 0.6 }}
          numberOfLines={1}
        >
          {tx.status}
        </AppText>
      </View>

      <SolarIcon name="solar:alt-arrow-right-outline" size={16} color={"rgba(14,165,233,0.50)"} />
    </Pressable>
  );
}

type BubbleMessage = {
  id: string;
  side: "left" | "right";
  text: string;
  meta: string;
  time?: string;
};

function Bubble({ msg }: { msg: BubbleMessage }) {
  const isLeft = msg.side === "left";
  const bubbleBg = isLeft ? "#F3F4F5" : colors.primary;
  const textColor = isLeft ? colors.text : colors.white;
  const metaColor = isLeft ? "rgba(60,74,60,0.60)" : "rgba(14,165,233,0.70)";

  return (
    <View style={{ width: "100%", alignItems: isLeft ? "flex-start" : "flex-end" }}>
      <View style={{ maxWidth: 332 }}>
        <View
          style={{
            backgroundColor: bubbleBg,
            borderRadius: 24,
            paddingLeft: 20,
            paddingRight: isLeft ? 23 : 55,
            paddingTop: 15,
            paddingBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isLeft ? 0.05 : 0.12,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <AppText style={{ fontSize: 15, lineHeight: 24.5, fontFamily: fonts.bodyRegular, color: textColor }} numberOfLines={10}>
            {msg.text}
          </AppText>
        </View>

        {isLeft ? (
          <View style={{ marginTop: 6, paddingLeft: 4 }}>
            <AppText variant="dense" style={{ fontSize: 10, lineHeight: 15, fontFamily: fonts.bodySemi, color: metaColor }} numberOfLines={1} ellipsizeMode="tail">
              {msg.meta}
            </AppText>
          </View>
        ) : (
          <View style={{ marginTop: 6, paddingRight: 4, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            <AppText variant="dense" style={{ fontSize: 10, lineHeight: 15, fontFamily: fonts.bodySemi, color: metaColor }} numberOfLines={1}>
              {msg.time ?? ""}
            </AppText>
            <SolarIcon name="solar:check-circle-bold" size={12} color={"rgba(14,165,233,0.70)"} />
          </View>
        )}
      </View>
    </View>
  );
}

function ConversationPill() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ minHeight: 24, borderRadius: radii.pill, backgroundColor: "#F3F4F5", paddingHorizontal: 16, paddingVertical: 4 }}>
        <AppText variant="dense" style={{ fontSize: 11, lineHeight: 16.5, fontFamily: fonts.bodyBold, color: "#3C4A3C", letterSpacing: 1.1, textTransform: "uppercase" }} numberOfLines={1}>
          Conversation
        </AppText>
      </View>
    </View>
  );
}

function mapApiMessages(messages: TicketMessage[], currentUserId: number | null): BubbleMessage[] {
  return messages.map((m, index) => {
    const side = messageSideForSender(m.senderId, currentUserId);
    return {
      id: String(m.id ?? `${m.ticketId}-${index}`),
      side,
      text: m.content,
      meta: side === "left" ? formatMessageMeta(m.createdAt) : "",
      time: side === "right" ? formatMessageTime(m.createdAt) : undefined,
    };
  });
}

function ChatInputFooter({
  draft,
  inputPlaceholder,
  canSend,
  sending,
  refLabel,
  bottomPadding,
  onChangeText,
  onSend,
}: {
  draft: string;
  inputPlaceholder: string;
  canSend: boolean;
  sending: boolean;
  refLabel: string;
  bottomPadding: number;
  onChangeText: (text: string) => void;
  onSend: () => void;
}) {
  return (
    <View
      testID="inbox-chat-input"
      style={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: bottomPadding,
        backgroundColor: "rgba(255,255,255,0.92)",
      }}
    >
      <View style={{ minHeight: 56, borderRadius: 24, backgroundColor: "#F3F4F5", paddingLeft: 16, paddingRight: 8, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => {}}
          hitSlop={10}
          style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}
          accessibilityLabel="Joindre un fichier"
        >
          <SolarIcon name="solar:add-square-outline" size={20} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <AppTextInput
            value={draft}
            onChangeText={onChangeText}
            placeholder={inputPlaceholder}
            placeholderTextColor={"rgba(60,74,60,0.50)"}
            style={{
              fontSize: 15,
              fontFamily: fonts.bodyMedium,
              color: colors.text,
              paddingVertical: 8,
            }}
            editable={!sending}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
        </View>

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          hitSlop={10}
          accessibilityLabel="Envoyer le message"
          accessibilityState={{ disabled: !canSend }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: canSend ? 1 : 0.5,
          }}
        >
          <SolarIcon name="solar:alt-arrow-right-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      <AppText variant="dense" style={{ ...typography.subtitle, fontSize: 10, lineHeight: 14, marginTop: 8, opacity: 0.6 }} numberOfLines={1}>
        Ref: {refLabel}
      </AppText>
    </View>
  );
}

export default function InboxChatScreen() {
  const insets = useSafeAreaInsets();
  const { id, intent } = useLocalSearchParams<{ id?: string; intent?: string }>();
  const isReportCompose = intent === "report";
  const [draft, setDraft] = useState("");
  const [tx, setTx] = useState<TxInfo | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transactionNumericId, setTransactionNumericId] = useState<number | null>(null);

  const topPadding = Math.max(spacing.screenPaddingX, insets.top + spacing.screenPaddingX);
  const bottomPadding = Math.max(24, insets.bottom + 8);

  const refreshThread = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLocalReadAt(String(id));
    setLoading(true);
    try {
      const [numericId, userId] = await Promise.all([
        resolveNumericTransactionIdFromRoute(String(id)),
        getCurrentUserId(),
      ]);
      setTransactionNumericId(numericId);
      setCurrentUserId(userId);

      const [txData, thread] = await Promise.all([
        getTransactionById(String(id)),
        loadClientThread(numericId, isReportCompose ? { composeOnly: true } : undefined),
      ]);
      setTx(mapTransactionToTxInfo(txData));
      setTicketId(isReportCompose ? null : (thread.ticket?.id ?? null));
      setMessages(thread.messages);
      // Re-stamp with the newest loaded message so a device clock lagging the
      // server can't leave a just-viewed message permanently "unread".
      setLocalReadAt(String(id), lastMessageFromList(thread.messages)?.createdAt ?? null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible de charger la conversation.";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  }, [id, isReportCompose]);

  useFocusEffect(
    useCallback(() => {
      void refreshThread();
    }, [refreshThread]),
  );

  const bubbleMessages = useMemo(
    () => mapApiMessages(messages, currentUserId),
    [messages, currentUserId],
  );

  const reversedMessages = useMemo(() => [...bubbleMessages].reverse(), [bubbleMessages]);

  const canSend = draft.trim().length > 0 && !sending && transactionNumericId != null;
  const inputPlaceholder = isReportCompose ? "Décrivez votre problème..." : "Écrire un message...";
  const emptyStateText = isReportCompose
    ? "Décrivez votre problème dans le champ ci-dessous. Votre message sera envoyé lorsque vous appuierez sur envoyer."
    : "Aucun message pour l'instant. Écrivez à notre équipe pour cette commande.";

  const handleSend = () => {
    if (!canSend || transactionNumericId == null) return;
    const content = draft.trim();
    void (async () => {
      setSending(true);
      try {
        const updatedTicket = await sendClientMessage(
          transactionNumericId,
          isReportCompose ? null : ticketId,
          content,
        );
        setTicketId(updatedTicket.id);
        setDraft("");
        const thread = await loadClientThread(transactionNumericId);
        setMessages(thread.messages);
        setTicketId(thread.ticket?.id ?? updatedTicket.id);
        if (id) setLocalReadAt(String(id), lastMessageFromList(thread.messages)?.createdAt ?? null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Impossible d'envoyer le message.";
        Alert.alert("Erreur", message);
      } finally {
        setSending(false);
      }
    })();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <HeroGridBackground />
      <KeyboardAvoidingView testID="inbox-chat-kav" style={{ flex: 1 }} behavior="padding">
        <View
          style={{
            paddingTop: topPadding,
            paddingHorizontal: spacing.screenPaddingX,
            backgroundColor: "transparent",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 44, justifyContent: "center" }}>
              <SolarIcon name="solar:alt-arrow-left-outline" size={24} color={colors.primary} />
            </Pressable>

            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 42, height: 42, flexShrink: 0 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 9999,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText
                    variant="dense"
                    style={{ fontSize: 14, lineHeight: 18, fontFamily: fonts.bodyBold, color: colors.white, letterSpacing: 0.5 }}
                  >
                    LS
                  </AppText>
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 16, lineHeight: 22, fontFamily: fonts.bodyBold, color: colors.text }} numberOfLines={1} ellipsizeMode="tail">
                  Agent LivSight
                </AppText>
                <AppText variant="dense" style={{ fontSize: 11, lineHeight: 15, fontFamily: fonts.bodySemi, color: "rgba(60,74,60,0.55)" }} numberOfLines={1}>
                  Assistance commande
                </AppText>
              </View>
            </View>
          </View>

          {tx ? (
            <TransactionBanner
              tx={tx}
              onPress={() => {
                if (tx.type === "EXPÉDITION") {
                  router.push(`/ma-demande-expedition`);
                } else {
                  router.push(`/livraison-detail/${id}`);
                }
              }}
            />
          ) : null}
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.screenPaddingX }}>
            <AppText style={{ ...typography.subtitle, fontFamily: fonts.bodySemi }} numberOfLines={2}>
              Chargement…
            </AppText>
          </View>
        ) : bubbleMessages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.screenPaddingX }}>
            <AppText style={{ ...typography.subtitle, textAlign: "center" }} numberOfLines={4}>
              {emptyStateText}
            </AppText>
          </View>
        ) : (
          <FlatList
            testID="inbox-message-list"
            data={reversedMessages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Bubble msg={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
            ListFooterComponent={ConversationPill}
            contentContainerStyle={{
              paddingHorizontal: spacing.screenPaddingX,
              paddingVertical: 8,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />
        )}

        <ChatInputFooter
          draft={draft}
          inputPlaceholder={inputPlaceholder}
          canSend={canSend}
          sending={sending}
          refLabel={id ?? "—"}
          bottomPadding={bottomPadding}
          onChangeText={setDraft}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
