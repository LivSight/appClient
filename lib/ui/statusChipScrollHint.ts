/** Delay before the auto-scroll hint starts (let users read the first chips). */
export const STATUS_CHIP_SCROLL_HINT_DELAY_MS = 1200;

/** Matches StatusChipRow scroll chip width. */
export const STATUS_CHIP_SCROLL_HINT_CHIP_WIDTH = 88;

/** Matches theme spacing.gridColGap. */
export const STATUS_CHIP_SCROLL_HINT_GAP = 12;

/** How many primary chips stay fixed at the start of the row. */
export const STATUS_CHIP_PRIMARY_COUNT = 4;

/** ~ms per extra chip — keeps the reveal slow and readable. */
export const STATUS_CHIP_SCROLL_HINT_MS_PER_EXTRA = 550;

export function statusChipExtraCount(totalChips: number): number {
  return Math.max(0, Math.floor(totalChips) - STATUS_CHIP_PRIMARY_COUNT);
}

/** Scroll far enough to bring every extra chip into view, then stay. */
export function statusChipScrollHintOffsetX(extraCount: number): number {
  const n = Math.max(0, Math.floor(extraCount));
  return n * (STATUS_CHIP_SCROLL_HINT_CHIP_WIDTH + STATUS_CHIP_SCROLL_HINT_GAP);
}

/** Longer duration when there are more extras (capped). */
export function statusChipScrollHintDurationMs(extraCount: number): number {
  const n = Math.max(0, Math.floor(extraCount));
  if (n <= 0) return 0;
  return Math.min(2400, Math.max(650, n * STATUS_CHIP_SCROLL_HINT_MS_PER_EXTRA));
}

export function shouldPlayStatusChipScrollHint(input: {
  scrollable: boolean;
  hintKey?: string;
  extraCount?: number;
}): boolean {
  const extras = input.extraCount ?? 0;
  return Boolean(input.scrollable && String(input.hintKey ?? "").trim() && extras > 0);
}
