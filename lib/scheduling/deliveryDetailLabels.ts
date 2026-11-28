import {
  formatScheduledDeliveryLabel,
  isScheduledDeliveryTomorrow,
  parseIsoDateOnly,
  todayIsoInSchedulingTimezone,
} from "./deliveryDate";

export type DeliveryDateFacts = {
  status?: string | null;
  scheduledDate?: string | null;
  /** Set by the backend when an agent moves the delivery to a new date. */
  rescheduledAt?: string | null;
};

function normalized(status?: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

const FINISHED = new Set(["completed", "delivered", "collected_at_office"]);

/**
 * A delivery moved to another day. The backend can report this as {@code postponed}, or as a
 * regular status with a reschedule timestamp and a new date. A {@code failed} delivery is a real
 * cancellation, unless an agent rescheduled it to a date that has not passed yet.
 */
export function isPostponedDelivery(facts: DeliveryDateFacts, now: Date = new Date()): boolean {
  const status = normalized(facts.status);
  if (FINISHED.has(status)) return false;
  if (status === "postponed") return true;
  if (!facts.rescheduledAt || !facts.scheduledDate) return false;
  return facts.scheduledDate.trim() >= todayIsoInSchedulingTimezone(now);
}

export function postponedLabel(
  scheduledDate: string | null | undefined,
  now: Date = new Date(),
  forExpedition = false,
): string {
  const kind = forExpedition ? "Expédition" : "Livraison";
  const iso = scheduledDate?.trim();
  if (!iso || !parseIsoDateOnly(iso)) return `${kind} reportée`;
  if (isScheduledDeliveryTomorrow(iso, now)) return `${kind} reportée à demain`;
  const label = formatScheduledDeliveryLabel(iso, now);
  if (label === "aujourd'hui") return `${kind} reportée à aujourd'hui`;
  return `${kind} reportée au ${label}`;
}

/** Text of the banner above the status card, or null when there is no planned date. */
export function scheduledBannerLabel(
  facts: DeliveryDateFacts,
  now: Date = new Date(),
  forExpedition = false,
): string | null {
  const iso = facts.scheduledDate?.trim();
  if (!iso) return null;
  if (isPostponedDelivery(facts, now)) return postponedLabel(iso, now, forExpedition);
  const kind = forExpedition ? "Expédition" : "Livraison";
  const label = formatScheduledDeliveryLabel(iso, now);
  return label === "aujourd'hui" ? `${kind} prévue aujourd'hui` : `${kind} prévue le ${label}`;
}

function longDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The date row of the detail card. « Effectuée le » is the real completion date and only appears
 * on a finished delivery; otherwise the row shows when the order was created.
 */
export function dateRowLabel(input: {
  status?: string | null;
  createdAt?: string | null;
  deliveredAt?: string | null;
}): string {
  if (FINISHED.has(normalized(input.status)) && input.deliveredAt) {
    const done = longDate(input.deliveredAt);
    if (done) return `Effectuée le ${done}`;
  }
  const created = input.createdAt ? longDate(input.createdAt) : null;
  return created ? `Créée le ${created}` : "Créée —";
}
