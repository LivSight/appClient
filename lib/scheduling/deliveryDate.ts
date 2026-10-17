export const SCHEDULING_TIMEZONE = "Africa/Douala";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDateFromPartsInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayIsoInSchedulingTimezone(now: Date = new Date()): string {
  return isoDateFromPartsInTimezone(now, SCHEDULING_TIMEZONE);
}

export function addDaysToIsoDate(iso: string, days: number): string {
  const trimmed = iso.trim();
  if (!ISO_DATE_RE.test(trimmed)) return iso;
  const [year, month, day] = trimmed.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const next = new Date(year, month - 1, day + days);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function tomorrowIsoInSchedulingTimezone(now: Date = new Date()): string {
  return addDaysToIsoDate(todayIsoInSchedulingTimezone(now), 1);
}

export function isScheduledDeliveryTomorrow(iso: string, now: Date = new Date()): boolean {
  return iso.trim() === tomorrowIsoInSchedulingTimezone(now);
}

export function isoDateFromDateInSchedulingTimezone(date: Date): string {
  return isoDateFromPartsInTimezone(date, SCHEDULING_TIMEZONE);
}

export function parseIsoDateOnly(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!ISO_DATE_RE.test(trimmed)) return null;
  const [year, month, day] = trimmed.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function isScheduledDeliveryToday(iso: string, now: Date = new Date()): boolean {
  return iso.trim() === todayIsoInSchedulingTimezone(now);
}

export function isScheduledDeliveryDateValid(iso: string, now: Date = new Date()): boolean {
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) return false;
  const today = parseIsoDateOnly(todayIsoInSchedulingTimezone(now));
  if (!today) return false;
  return parsed.getTime() >= today.getTime();
}

export function formatScheduledDeliveryLabel(iso: string, now: Date = new Date()): string {
  if (isScheduledDeliveryToday(iso, now)) return "aujourd'hui";
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) return iso;
  return parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function formatScheduledDeliveryDisplayLabel(iso: string, now: Date = new Date()): string {
  const label = formatScheduledDeliveryLabel(iso, now);
  if (label === "aujourd'hui") return "Aujourd'hui";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatScheduledDeliveryConfirmeeSubtitle(
  iso: string,
  forExpedition = false,
  now: Date = new Date(),
): string {
  const kind = forExpedition ? "Expédition" : "Livraison";
  const label = formatScheduledDeliveryLabel(iso, now);
  if (label === "aujourd'hui") return `${kind} prévue aujourd'hui`;
  return `${kind} prévue le ${label}`;
}

export function minimumSelectableDeliveryDate(now: Date = new Date()): Date {
  const todayIso = todayIsoInSchedulingTimezone(now);
  return parseIsoDateOnly(todayIso) ?? now;
}
