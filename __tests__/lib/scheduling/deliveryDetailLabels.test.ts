import {
  dateRowLabel,
  isPostponedDelivery,
  postponedLabel,
  scheduledBannerLabel,
} from "@/lib/scheduling/deliveryDetailLabels";

const now = new Date("2026-11-24T10:00:00Z");

describe("isPostponedDelivery", () => {
  it("is true for the postponed status", () => {
    expect(isPostponedDelivery({ status: "postponed", scheduledDate: "2026-11-30" }, now)).toBe(true);
  });

  it("is true when an agent rescheduled it and the new date has not passed", () => {
    expect(
      isPostponedDelivery(
        { status: "scheduled", rescheduledAt: "2026-11-23T09:00:00", scheduledDate: "2026-11-25" },
        now,
      ),
    ).toBe(true);
  });

  it("is true for a failed delivery that was rescheduled to a future date", () => {
    expect(
      isPostponedDelivery(
        { status: "failed", rescheduledAt: "2026-11-23T09:00:00", scheduledDate: "2026-11-25" },
        now,
      ),
    ).toBe(true);
  });

  it("stays cancelled when failed with no reschedule", () => {
    expect(isPostponedDelivery({ status: "failed", scheduledDate: "2026-11-25" }, now)).toBe(false);
  });

  it("is false once the delivery is completed", () => {
    expect(
      isPostponedDelivery(
        { status: "completed", rescheduledAt: "2026-11-20T09:00:00", scheduledDate: "2026-11-21" },
        now,
      ),
    ).toBe(false);
  });

  it("is false for a reschedule whose new date is already in the past and not postponed", () => {
    expect(
      isPostponedDelivery(
        { status: "failed", rescheduledAt: "2026-11-10T09:00:00", scheduledDate: "2026-11-12" },
        now,
      ),
    ).toBe(false);
  });
});

describe("postponedLabel", () => {
  it("says demain for the next day", () => {
    expect(postponedLabel("2026-11-25", now)).toBe("Livraison reportée à demain");
  });

  it("gives the date for a later day", () => {
    expect(postponedLabel("2026-11-30", now)).toMatch(/^Livraison reportée au 30 novembre$/);
  });

  it("does not claim a plain « prévue aujourd'hui » for a postponed delivery", () => {
    expect(postponedLabel("2026-11-24", now)).toBe("Livraison reportée à aujourd'hui");
  });

  it("falls back to the bare label without a date", () => {
    expect(postponedLabel(null, now)).toBe("Livraison reportée");
  });

  it("uses the expedition wording", () => {
    expect(postponedLabel("2026-11-25", now, true)).toBe("Expédition reportée à demain");
  });
});

describe("scheduledBannerLabel", () => {
  it("keeps « prévue » for a plain scheduled delivery", () => {
    expect(scheduledBannerLabel({ status: "scheduled", scheduledDate: "2026-11-30" }, now)).toBe(
      "Livraison prévue le 30 novembre",
    );
    expect(scheduledBannerLabel({ status: "scheduled", scheduledDate: "2026-11-24" }, now)).toBe(
      "Livraison prévue aujourd'hui",
    );
  });

  it("uses the postponed wording when postponed", () => {
    expect(scheduledBannerLabel({ status: "postponed", scheduledDate: "2026-11-25" }, now)).toBe(
      "Livraison reportée à demain",
    );
  });

  it("returns null without a scheduled date", () => {
    expect(scheduledBannerLabel({ status: "pending", scheduledDate: null }, now)).toBeNull();
  });
});

describe("dateRowLabel", () => {
  it("shows « Créée le » for a delivery that is not completed", () => {
    expect(dateRowLabel({ status: "pending", createdAt: "2026-11-10T08:00:00" })).toMatch(/^Créée le .*10 novembre 2026$/);
  });

  it("shows « Effectuée le » only with a completion date on a completed delivery", () => {
    expect(
      dateRowLabel({ status: "completed", createdAt: "2026-11-10T08:00:00", deliveredAt: "2026-11-12T15:00:00" }),
    ).toMatch(/^Effectuée le .*12 novembre 2026$/);
  });

  it("does not call a completed delivery without a completion date « Effectuée »", () => {
    expect(dateRowLabel({ status: "completed", createdAt: "2026-11-10T08:00:00" })).toMatch(/^Créée le /);
  });

  it("does not show « Effectuée » for a postponed delivery that has an old delivered_at", () => {
    expect(
      dateRowLabel({ status: "postponed", createdAt: "2026-11-10T08:00:00", deliveredAt: "2026-11-12T15:00:00" }),
    ).toMatch(/^Créée le /);
  });

  it("returns a dash when there is no date at all", () => {
    expect(dateRowLabel({ status: "pending" })).toBe("Créée —");
  });
});
