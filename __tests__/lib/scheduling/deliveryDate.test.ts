import {
  formatScheduledDeliveryConfirmeeSubtitle,
  formatScheduledDeliveryDisplayLabel,
  formatScheduledDeliveryLabel,
  isoDateFromDateInSchedulingTimezone,
  isScheduledDeliveryToday,
  isScheduledDeliveryTomorrow,
  tomorrowIsoInSchedulingTimezone,
  isScheduledDeliveryDateValid,
  parseIsoDateOnly,
  SCHEDULING_TIMEZONE,
  todayIsoInSchedulingTimezone,
} from "@/lib/scheduling/deliveryDate";

describe("deliveryDate", () => {
  it("uses Africa/Douala timezone constant", () => {
    expect(SCHEDULING_TIMEZONE).toBe("Africa/Douala");
  });

  it("formats today as aujourd'hui", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(formatScheduledDeliveryLabel("2026-07-09", now)).toBe("aujourd'hui");
  });

  it("formats future date in French", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(formatScheduledDeliveryLabel("2026-07-12", now)).toMatch(/12/);
    expect(formatScheduledDeliveryLabel("2026-07-12", now)).toMatch(/juillet/i);
  });

  it("detects whether a date is today in scheduling timezone", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(isScheduledDeliveryToday("2026-07-09", now)).toBe(true);
    expect(isScheduledDeliveryToday("2026-07-10", now)).toBe(false);
  });

  it("parses ISO date-only strings", () => {
    const parsed = parseIsoDateOnly("2026-07-12");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(12);
  });

  it("rejects invalid ISO date strings", () => {
    expect(parseIsoDateOnly("")).toBeNull();
    expect(parseIsoDateOnly("not-a-date")).toBeNull();
    expect(parseIsoDateOnly("2026-13-40")).toBeNull();
  });

  it("validates dates not in the past", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(isScheduledDeliveryDateValid("2026-07-08", now)).toBe(false);
    expect(isScheduledDeliveryDateValid("2026-07-09", now)).toBe(true);
    expect(isScheduledDeliveryDateValid("2026-07-15", now)).toBe(true);
  });

  it("converts Date to ISO in scheduling timezone", () => {
    const date = new Date("2026-07-12T15:30:00Z");
    expect(isoDateFromDateInSchedulingTimezone(date)).toBe("2026-07-12");
  });

  it("returns today ISO in scheduling timezone", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(todayIsoInSchedulingTimezone(now)).toBe("2026-07-09");
  });

  it("computes tomorrow in scheduling timezone", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(tomorrowIsoInSchedulingTimezone(now)).toBe("2026-07-10");
    expect(isScheduledDeliveryTomorrow("2026-07-10", now)).toBe(true);
  });

  it("capitalizes display label except for today", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(formatScheduledDeliveryDisplayLabel("2026-07-09", now)).toBe("Aujourd'hui");
    expect(formatScheduledDeliveryDisplayLabel("2026-07-12", now)).toMatch(/^12/);
  });

  it("formats confirmee subtitle for today and future dates", () => {
    const now = new Date("2026-07-09T12:00:00Z");
    expect(formatScheduledDeliveryConfirmeeSubtitle("2026-07-09", false, now)).toBe("Livraison prévue aujourd'hui");
    expect(formatScheduledDeliveryConfirmeeSubtitle("2026-07-12", true, now)).toMatch(/Expédition prévue le 12/);
  });
});
