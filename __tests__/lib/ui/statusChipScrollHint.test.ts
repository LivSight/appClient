import {
  STATUS_CHIP_SCROLL_HINT_DELAY_MS,
  statusChipExtraCount,
  statusChipScrollHintDurationMs,
  statusChipScrollHintOffsetX,
  shouldPlayStatusChipScrollHint,
} from "@/lib/ui/statusChipScrollHint";

describe("statusChipScrollHint", () => {
  it("waits 1.2s before starting the reveal", () => {
    expect(STATUS_CHIP_SCROLL_HINT_DELAY_MS).toBe(1200);
  });

  it("counts extras beyond the four primary chips", () => {
    expect(statusChipExtraCount(4)).toBe(0);
    expect(statusChipExtraCount(5)).toBe(1);
    expect(statusChipExtraCount(8)).toBe(4);
  });

  it("scrolls farther for 1–4 extra chips", () => {
    expect(statusChipScrollHintOffsetX(1)).toBe(100);
    expect(statusChipScrollHintOffsetX(2)).toBe(200);
    expect(statusChipScrollHintOffsetX(3)).toBe(300);
    expect(statusChipScrollHintOffsetX(4)).toBe(400);
  });

  it("takes longer when there are more extras", () => {
    expect(statusChipScrollHintDurationMs(1)).toBeLessThan(statusChipScrollHintDurationMs(4));
    expect(statusChipScrollHintDurationMs(4)).toBeGreaterThanOrEqual(2000);
  });

  it("plays only when scrollable, keyed, and there are extras", () => {
    expect(shouldPlayStatusChipScrollHint({ scrollable: true, hintKey: "p", extraCount: 2 })).toBe(true);
    expect(shouldPlayStatusChipScrollHint({ scrollable: true, hintKey: "p", extraCount: 0 })).toBe(false);
    expect(shouldPlayStatusChipScrollHint({ scrollable: false, hintKey: "p", extraCount: 2 })).toBe(false);
  });
});
