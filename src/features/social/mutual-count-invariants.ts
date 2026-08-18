

export const MUTUAL_PREVIEW_CAP = 6 as const;

export const MUTUAL_LIST_PAGE_SIZE = 20 as const;

export const MUTUAL_TOTAL_HARD_CAP = 500 as const;

export function mutualCountOverflow(visible: number, total: number): number {
if (!Number.isFinite(visible) || !Number.isFinite(total)) return 0;
if (visible < 0 || total < 0) return 0;
if (total <= visible) return 0;
const raw = total - visible;
const cap = MUTUAL_TOTAL_HARD_CAP - visible;
if (cap <= 0) return 0;
return Math.min(raw, cap);
}

export const MUTUAL_COUNT_INVARIANTS = Object.freeze({
previewCap: MUTUAL_PREVIEW_CAP,
listPageSize: MUTUAL_LIST_PAGE_SIZE,
totalHardCap: MUTUAL_TOTAL_HARD_CAP,
});
